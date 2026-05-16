import api from '@/lib/axios'
import type { PettyCashFund, PettyCashReplenishment, PettyCashRequest } from '@/types/pettyCash'

export const pettyCashApi = {
  // Fund
  getFund: () =>
    api.get<PettyCashFund | null>('/api/petty-cash/fund').then(r => r.data),

  setupFund: (data: Partial<PettyCashFund>) =>
    api.post<PettyCashFund>('/api/petty-cash/fund', data).then(r => r.data),

  // Requests
  listRequests: (params?: { status?: string; from?: string; to?: string }) =>
    api.get<PettyCashRequest[]>('/api/petty-cash/requests', { params }).then(r => r.data),

  createRequest: (data: FormData) =>
    api.post<PettyCashRequest>('/api/petty-cash/requests', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),

  documentUrl: (id: number) =>
    `${api.defaults.baseURL}/api/petty-cash/requests/${id}/document`,

  fetchDocument: (id: number) =>
    api.get(`/api/petty-cash/requests/${id}/document`, { responseType: 'blob' })
      .then(r => r.data as Blob),

  approveRequest: (id: number, approved_by: string) =>
    api.post<PettyCashRequest>(`/api/petty-cash/requests/${id}/approve`, { approved_by }).then(r => r.data),

  rejectRequest: (id: number, rejection_reason: string) =>
    api.post<PettyCashRequest>(`/api/petty-cash/requests/${id}/reject`, { rejection_reason }).then(r => r.data),

  payRequest: (id: number, paid_by: string) =>
    api.post<PettyCashRequest>(`/api/petty-cash/requests/${id}/pay`, { paid_by }).then(r => r.data),

  // Replenishments
  listReplenishments: () =>
    api.get<PettyCashReplenishment[]>('/api/petty-cash/replenishments').then(r => r.data),

  createReplenishment: (data: { amount: number; description?: string; requested_by: string }) =>
    api.post<PettyCashReplenishment>('/api/petty-cash/replenishments', data).then(r => r.data),

  approveReplenishment: (id: number, approved_by: string) =>
    api.post<PettyCashReplenishment>(`/api/petty-cash/replenishments/${id}/approve`, { approved_by }).then(r => r.data),

  rejectReplenishment: (id: number, rejection_reason: string) =>
    api.post<PettyCashReplenishment>(`/api/petty-cash/replenishments/${id}/reject`, { rejection_reason }).then(r => r.data),
}
