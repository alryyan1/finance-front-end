import api from '@/lib/axios'
import type { Account } from '@/types/account'

type AccountPayload = Omit<Account, 'id' | 'created_at' | 'updated_at'>

export const accountsApi = {
  list: (): Promise<Account[]> =>
    api.get('/api/accounts').then(r => r.data),

  create: (data: AccountPayload): Promise<Account> =>
    api.post('/api/accounts', data).then(r => r.data),

  update: (id: number, data: AccountPayload): Promise<Account> =>
    api.put(`/api/accounts/${id}`, data).then(r => r.data),

  remove: (id: number): Promise<void> =>
    api.delete(`/api/accounts/${id}`).then(r => r.data),
}
