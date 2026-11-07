import api from '@/lib/axios'
import type { CostCenter } from '@/types/costCenter'

type CostCenterPayload = { name: string }

export const costCentersApi = {
  list: (): Promise<CostCenter[]> =>
    api.get('/api/cost-centers').then(r => r.data),

  create: (data: CostCenterPayload): Promise<CostCenter> =>
    api.post('/api/cost-centers', data).then(r => r.data),

  update: (id: number, data: CostCenterPayload): Promise<CostCenter> =>
    api.put(`/api/cost-centers/${id}`, data).then(r => r.data),

  remove: (id: number): Promise<void> =>
    api.delete(`/api/cost-centers/${id}`).then(r => r.data),
}
