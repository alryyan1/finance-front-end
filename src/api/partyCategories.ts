import api from '@/lib/axios'
import type { PartyCategory } from '@/types/partyCategory'

type PartyCategoryPayload = { name: string }

export const partyCategoriesApi = {
  list: (): Promise<PartyCategory[]> =>
    api.get('/api/party-categories').then(r => r.data),

  create: (data: PartyCategoryPayload): Promise<PartyCategory> =>
    api.post('/api/party-categories', data).then(r => r.data),

  update: (id: number, data: PartyCategoryPayload): Promise<PartyCategory> =>
    api.put(`/api/party-categories/${id}`, data).then(r => r.data),

  remove: (id: number): Promise<void> =>
    api.delete(`/api/party-categories/${id}`).then(r => r.data),
}
