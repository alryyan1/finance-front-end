import api from '@/lib/axios'
import type { Party } from '@/types/party'

type PartyPayload = Omit<Party, 'id' | 'account' | 'created_at' | 'updated_at'>

export const partiesApi = {
  list: (): Promise<Party[]> =>
    api.get('/api/parties').then(r => r.data),

  create: (data: PartyPayload): Promise<Party> =>
    api.post('/api/parties', data).then(r => r.data),

  update: (id: number, data: PartyPayload): Promise<Party> =>
    api.put(`/api/parties/${id}`, data).then(r => r.data),

  remove: (id: number): Promise<void> =>
    api.delete(`/api/parties/${id}`).then(r => r.data),
}
