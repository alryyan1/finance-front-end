export interface JournalEntryLine {
  id: number
  journal_entry_id: number
  account_id: number
  party_id: number | null
  description: string | null
  debit: string
  credit: string
  account?: { id: number; code: string; name: string }
  party?: { id: number; name: string } | null
}

export interface JournalEntry {
  id: number
  date: string
  reference: string | null
  description: string
  is_posted: boolean
  reversal_of: number | null
  reversed_by: number | null
  lines_sum_debit?: string | null
  lines_count?: number
  lines?: JournalEntryLine[]
  created_at: string
  updated_at: string
}

export interface JournalEntryPayload {
  date: string
  reference: string | null
  description: string
  lines: JournalEntryLinePayload[]
}

export interface JournalEntryLinePayload {
  account_id: number | null
  party_id: number | null
  description: string
  debit: number
  credit: number
}
