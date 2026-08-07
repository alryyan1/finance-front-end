import api from '@/lib/axios'
import type { Party } from '@/types/party'

type PartyPayload = Omit<Party, 'id' | 'account' | 'created_at' | 'updated_at'>

export const partiesApi = {
  list: (): Promise<Party[]> =>
    api.get('/api/parties').then(r => r.data),

  /** Find (or auto-create) the Party mapped to a record owned by an external system. */
  resolveExternal: (data: {
    source_system: string
    source_type: string
    source_id: string
    name: string
    phone?: string | null
    email?: string | null
    address?: string | null
    type?: Party['type']
  }): Promise<Party> =>
    api.post('/api/parties/resolve-external', data).then(r => r.data),

  create: (data: PartyPayload): Promise<Party> =>
    api.post('/api/parties', data).then(r => r.data),

  update: (id: number, data: PartyPayload): Promise<Party> =>
    api.put(`/api/parties/${id}`, data).then(r => r.data),

  remove: (id: number): Promise<void> =>
    api.delete(`/api/parties/${id}`).then(r => r.data),
}
