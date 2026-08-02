import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { getFirestoreDb as getDb } from '@/lib/firestore'

// ── storage name ──────────────────────────────────────────────────────────────

const STORAGE_NAME = (import.meta.env.VITE_JAWDA_STORAGE_NAME as string | undefined) || 'alroomy'

// ── types ─────────────────────────────────────────────────────────────────────

export interface FirebaseJournalLine {
  account_id:   string
  party_id?:    string | null
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
 * Resolve a Firebase party ID to a finance-api numeric party ID.
 *
 * - Numeric string ("5")  → 5
 * - "doctor_X" format     → look up doctor_mappings[X], then convert that mapped
 *                           partyId to a number (it must be a numeric-string party
 *                           imported from finance-api)
 * - Anything else         → null
 */
function resolvePartyId(
  partyId: string | null | undefined,
  doctorMappings: Record<string, string>,
): number | null {
  if (!partyId) return null

  // Plain numeric (imported finance-api party)
  const direct = toNumericId(partyId)
  if (direct != null) return direct

  // doctor_X format — look up the doctor's configured mapping
  const m = partyId.match(/^doctor_(\d+)$/)
  if (m) {
    const mappedPartyId = doctorMappings[m[1]]   // e.g. "5"
    return toNumericId(mappedPartyId)
  }

  return null
}

// ── public API ────────────────────────────────────────────────────────────────

/**
 * Fetch doctor → party mappings from Firestore.
 * Returns { doctorId: firebasePartyId } e.g. { "1": "5", "3": "doctor_3" }
 */
export async function fetchDoctorMappings(): Promise<Record<string, string>> {
  const db   = getDb()
  const snap = await getDocs(collection(db, 'finance', STORAGE_NAME, 'doctor_mappings'))
  const result: Record<string, string> = {}
  for (const d of snap.docs) result[d.id] = d.data().partyId as string
  return result
}

/** Fetch all journal entries from Firebase that have not been imported yet. */
export async function fetchPendingEntries(): Promise<FirebaseJournalEntry[]> {
  const db = getDb()
  // Firestore "!=" query doesn't return docs where the field is absent;
  // fetch ALL and filter client-side to catch docs without the field.
  const allSnap = await getDocs(collection(db, 'finance', STORAGE_NAME, 'journal_entries'))

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
export async function deleteEntry(firebaseId: string): Promise<void> {
  const db  = getDb()
  const ref = doc(db, 'finance', STORAGE_NAME, 'journal_entries', firebaseId)
  await deleteDoc(ref)
}

/** Mark a Firebase entry as imported so it won't be fetched again. */
export async function markAsImported(firebaseId: string): Promise<void> {
  const db  = getDb()
  const ref = doc(db, 'finance', STORAGE_NAME, 'journal_entries', firebaseId)
  await updateDoc(ref, { imported: true, importedAt: new Date().toISOString() })
}

/**
 * Convert a FirebaseJournalEntry to the payload shape expected by journalApi.create().
 * doctorMappings: map of Jawda doctor ID → Firebase party ID (from fetchDoctorMappings()).
 */
export function toJournalPayload(
  entry: FirebaseJournalEntry,
  doctorMappings: Record<string, string> = {},
) {
  return {
    date:        entry.date,
    reference:   entry.reference ?? null,
    description: entry.description,
    lines: entry.lines.map(l => ({
      account_id:  toNumericId(l.account_id),
      party_id:    resolvePartyId(l.party_id, doctorMappings),
      description: l.description ?? '',
      debit:       l.debit,
      credit:      l.credit,
    })),
  }
}
