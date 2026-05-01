import type { AxiosResponse } from 'axios'
import api from '@/lib/axios'
import type { JournalEntry, JournalEntryPayload } from '@/types/journal'

const d = <T>(r: AxiosResponse<T>) => r.data

export const journalApi = {
  list: (params?: { from?: string; to?: string; search?: string; status?: string }): Promise<JournalEntry[]> =>
    api.get<JournalEntry[]>('/api/journal-entries', { params }).then(d),

  get: (id: number): Promise<JournalEntry> =>
    api.get<JournalEntry>(`/api/journal-entries/${id}`).then(d),

  create: (data: JournalEntryPayload): Promise<JournalEntry> =>
    api.post<JournalEntry>('/api/journal-entries', data).then(d),

  update: (id: number, data: JournalEntryPayload): Promise<JournalEntry> =>
    api.put<JournalEntry>(`/api/journal-entries/${id}`, data).then(d),

  remove: (id: number): Promise<void> =>
    api.delete<void>(`/api/journal-entries/${id}`).then(d),

  togglePost: (id: number): Promise<JournalEntry> =>
    api.patch<JournalEntry>(`/api/journal-entries/${id}/post`).then(d),
}
