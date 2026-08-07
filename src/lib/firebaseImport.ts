import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { getFirestoreDb as getDb } from '@/lib/firestore'
import { partiesApi } from '@/api/parties'

// ── types ─────────────────────────────────────────────────────────────────────

export interface FirebaseJournalLine {
  /** Raw finance-api account id. Ignored when account_code or account_role is present. */
  account_id:   string
  /** Stable account code (e.g. "11031") — preferred over account_id since ids are
   *  auto-increment and not guaranteed stable across environments. Resolved via
   *  the account list already loaded by the dialog. */
  account_code?: string | null
  /**
   * Semantic role instead of any finance-api-specific identifier — one of
   * "sales_receivable" (credit/deferred sale), "sales_cash" (paid in cash),
   * "sales_bank" (paid by bank/card), "sales_revenue", "sales_cogs",
   * "sales_inventory". Resolved via the finance-api admin's own Settings
   * mapping (Settings → ربط المبيعات), so an external system like sales-api
   * never needs to know finance-api's account codes or ids at all — only its
   * own fixed set of roles. Takes priority over account_code and account_id.
   */
  account_role?: string | null
  party_id?:    string | null
  /** Only read when party_id is an unresolved external reference (e.g. "sales_client_25"). */
  party_name?:  string | null
  party_phone?: string | null
  party_email?: string | null
  description?: string | null
  debit:        number
  credit:       number
}

export interface FirebaseJournalEntry {
  /** Firestore document ID */
  firebaseId:  string
  date:        string
  reference?:  string | null
  description: string
  createdAt:   string
  imported?:   boolean
  lines:       FirebaseJournalLine[]
}

// ── helpers ───────────────────────────────────────────────────────────────────

/** Convert a plain numeric string ID to a finance-api integer.
 *  Returns null for non-numeric formats (e.g. "doctor_5"). */
function toNumericId(id: string | null | undefined): number | null {
  if (!id) return null
  const n = Number(id)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Resolve a line's account reference to a finance-api numeric account id, in
 * order of preference:
 *  1. account_role  — looked up in roleAccountMap (from finance-api Settings).
 *     The most decoupled option: the writer needs zero finance-api knowledge.
 *  2. account_code  — looked up in accountCodeMap (from the chart of accounts).
 *     Stable across environments, but the writer must know the actual codes.
 *  3. account_id    — used as-is. Fragile (auto-increment, not portable), kept
 *     only for backward compatibility with older documents.
 */
function resolveAccountId(
  line: Pick<FirebaseJournalLine, 'account_id' | 'account_code' | 'account_role'>,
  accountCodeMap: Map<string, number>,
  roleAccountMap: Map<string, number>,
): number | null {
  if (line.account_role) {
    return roleAccountMap.get(line.account_role) ?? null
  }
  if (line.account_code) {
    return accountCodeMap.get(line.account_code) ?? null
  }
  return toNumericId(line.account_id)
}

/**
 * Matches an external system's own party reference that finance-api doesn't know
 * yet, e.g. "sales_client_25" or "sales_supplier_7" — {source_system}_{source_type}_{source_id}.
 */
const EXTERNAL_PARTY_PATTERN = /^([a-z0-9-]+)_(client|supplier)_(.+)$/

/**
 * Resolve a Firebase party ID to a finance-api numeric party ID.
 *
 * - Numeric string ("5")     → 5
 * - "doctor_X" format        → look up doctor_mappings[X] (pre-synced in Firestore
 *                              by the external system, resolved to a numeric party id)
 * - "{system}_client_X" /
 *   "{system}_supplier_X"    → resolve via POST /parties/resolve-external, which
 *                              finds the mapped Party or creates it (and the mapping)
 *                              on first sight. Cached per import run so repeated
 *                              references to the same external record only call the
 *                              backend once.
 * - Anything else            → null
 */
async function resolvePartyId(
  partyId: string | null | undefined,
  doctorMappings: Record<string, string>,
  externalPartyCache: Map<string, number>,
  partyName?: string | null,
  partyPhone?: string | null,
  partyEmail?: string | null,
): Promise<number | null> {
  if (!partyId) return null

  // Plain numeric (imported finance-api party)
  const direct = toNumericId(partyId)
  if (direct != null) return direct

  // doctor_X format — look up the doctor's configured mapping
  const doctorMatch = partyId.match(/^doctor_(\d+)$/)
  if (doctorMatch) {
    const mappedPartyId = doctorMappings[doctorMatch[1]]   // e.g. "5"
    return toNumericId(mappedPartyId)
  }

  // {system}_client_X / {system}_supplier_X — resolve (and auto-create) via finance-api
  const externalMatch = partyId.match(EXTERNAL_PARTY_PATTERN)
  if (externalMatch) {
    const [, sourceSystem, sourceType, sourceId] = externalMatch

    const cached = externalPartyCache.get(partyId)
    if (cached != null) return cached

    const party = await partiesApi.resolveExternal({
      source_system: sourceSystem,
      source_type: sourceType,
      source_id: sourceId,
      name: partyName || `${sourceType} #${sourceId}`,
      phone: partyPhone,
      email: partyEmail,
    })
    externalPartyCache.set(partyId, party.id)
    return party.id
  }

  return null
}

// ── public API ────────────────────────────────────────────────────────────────

/**
 * Fetch doctor → party mappings from Firestore.
 * Returns { doctorId: firebasePartyId } e.g. { "1": "5", "3": "doctor_3" }
 */
export async function fetchDoctorMappings(storageName: string): Promise<Record<string, string>> {
  const db   = getDb()
  const snap = await getDocs(collection(db, 'finance', storageName, 'doctor_mappings'))
  const result: Record<string, string> = {}
  for (const d of snap.docs) result[d.id] = d.data().partyId as string
  return result
}

/** Fetch all journal entries from Firebase that have not been imported yet. */
export async function fetchPendingEntries(storageName: string): Promise<FirebaseJournalEntry[]> {
  const db = getDb()
  // Firestore "!=" query doesn't return docs where the field is absent;
  // fetch ALL and filter client-side to catch docs without the field.
  const allSnap = await getDocs(collection(db, 'finance', storageName, 'journal_entries'))

  return allSnap.docs
    .filter(d => !d.data().imported)
    .map(d => ({
      firebaseId:  d.id,
      date:        d.data().date        as string,
      reference:   d.data().reference   as string | null,
      description: d.data().description as string,
      createdAt:   d.data().createdAt   as string,
      lines:       (d.data().lines ?? []) as FirebaseJournalLine[],
    }))
}

/** Permanently delete a journal entry from Firebase. */
export async function deleteEntry(firebaseId: string, storageName: string): Promise<void> {
  const db  = getDb()
  const ref = doc(db, 'finance', storageName, 'journal_entries', firebaseId)
  await deleteDoc(ref)
}

/** Mark a Firebase entry as imported so it won't be fetched again. */
export async function markAsImported(firebaseId: string, storageName: string): Promise<void> {
  const db  = getDb()
  const ref = doc(db, 'finance', storageName, 'journal_entries', firebaseId)
  await updateDoc(ref, { imported: true, importedAt: new Date().toISOString() })
}

/**
 * Convert a FirebaseJournalEntry to the payload shape expected by journalApi.create().
 * doctorMappings: map of Jawda doctor ID → Firebase party ID (from fetchDoctorMappings()).
 * externalPartyCache: shared across a whole import run — pass the same Map for every
 * entry so a customer/supplier referenced on multiple entries is only resolved once.
 * accountCodeMap: code → id, built from the full chart of accounts (accountsApi.list()).
 * roleAccountMap: role → id, built from finance-api's Settings (salesBridgeSettingsApi.get()).
 */
export async function toJournalPayload(
  entry: FirebaseJournalEntry,
  doctorMappings: Record<string, string> = {},
  externalPartyCache: Map<string, number> = new Map(),
  accountCodeMap: Map<string, number> = new Map(),
  roleAccountMap: Map<string, number> = new Map(),
) {
  const lines = await Promise.all(entry.lines.map(async l => ({
    account_id:  resolveAccountId(l, accountCodeMap, roleAccountMap),
    party_id:    await resolvePartyId(l.party_id, doctorMappings, externalPartyCache, l.party_name, l.party_phone, l.party_email),
    description: l.description ?? '',
    debit:       l.debit,
    credit:      l.credit,
  })))

  return {
    date:        entry.date,
    reference:   entry.reference ?? null,
    description: entry.description,
    lines,
  }
}
