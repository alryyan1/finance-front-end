import api from '@/lib/axios'

export type TransactionType = 'expense' | 'replenishment'
export type TransactionStatus = 'pending' | 'approved'

export interface PettyCashTransaction {
  id: number
  type: TransactionType
  status: TransactionStatus
  date: string
  amount: string
  beneficiary_name: string | null
  contra_account_id: number
  contra_account: { id: number; code: string; name: string }
  source_account_id: number | null
  source_account: { id: number; code: string; name: string } | null
  created_by: { id: number; name: string } | null
  description: string | null
  document_path: string | null
  document_original_name: string | null
  journal_entry_id: number | null
  manager_approved_at: string | null
}

export interface ExpensePayload {
  date: string
  amount: string
  beneficiary_name?: string
  contra_account_id: number
  source_account_id: number
  description?: string
  document?: File | null
}

export type NotificationStatus = 'sent' | 'failed' | 'skipped'

export interface NotificationResult {
  role: 'manager'
  phone: string
  template: string
  status: NotificationStatus
  error: string | null
}

export interface NotificationsResponse {
  notifications: NotificationResult[]
}

export interface PaginatedTransactions {
  data: PettyCashTransaction[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export const pettyCashApi = {
  listTransactions: (params: { from: string; to: string; type?: TransactionType }): Promise<PettyCashTransaction[]> =>
    api.get<PettyCashTransaction[]>('/api/petty-cash/transactions', { params }).then(r => r.data),

  listTransactionsPaginated: (params: {
    from: string; to: string; type?: TransactionType; search?: string; page: number; per_page: number
  }): Promise<PaginatedTransactions> =>
    api.get<PaginatedTransactions>('/api/petty-cash/transactions', { params }).then(r => r.data),

  createExpense: (data: ExpensePayload): Promise<PettyCashTransaction & Partial<NotificationsResponse>> => {
    const fd = new FormData()
    fd.append('date', data.date)
    fd.append('amount', data.amount)
    if (data.beneficiary_name) fd.append('beneficiary_name', data.beneficiary_name)
    fd.append('contra_account_id', String(data.contra_account_id))
    fd.append('source_account_id', String(data.source_account_id))
    if (data.description) fd.append('description', data.description)
    if (data.document) fd.append('document', data.document)
    return api.post<PettyCashTransaction & Partial<NotificationsResponse>>('/api/petty-cash/expenses', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  deleteTransaction: (id: number): Promise<void> =>
    api.delete(`/api/petty-cash/transactions/${id}`).then(() => undefined),

  downloadDocument: (id: number) =>
    api.get(`/api/petty-cash/transactions/${id}/document`, { responseType: 'blob' }),

  uploadDocument: (id: number, file: File): Promise<PettyCashTransaction> => {
    const fd = new FormData()
    fd.append('document', file)
    return api.post<PettyCashTransaction>(`/api/petty-cash/transactions/${id}/document`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  deleteDocument: (id: number): Promise<PettyCashTransaction> =>
    api.delete<PettyCashTransaction>(`/api/petty-cash/transactions/${id}/document`).then(r => r.data),

  approveByManager: (id: number): Promise<PettyCashTransaction> =>
    api.post<PettyCashTransaction>(`/api/petty-cash/transactions/${id}/approve/manager`).then(r => r.data),

  reconcileTransaction: (id: number): Promise<PettyCashTransaction> =>
    api.post<PettyCashTransaction>(`/api/petty-cash/transactions/${id}/reconcile`).then(r => r.data),

  sendNotification: (id: number): Promise<NotificationsResponse> =>
    api.post<NotificationsResponse>(`/api/petty-cash/transactions/${id}/notify`).then(r => r.data),

  syncExpenseAccounts: (): Promise<{ message: string }> =>
    api.post<{ message: string }>('/api/petty-cash/sync-expense-accounts').then(r => r.data),

  importWhatsAppRequests: (): Promise<{ imported: number; message: string }> =>
    api.post<{ imported: number; message: string }>('/api/petty-cash/import-whatsapp-requests').then(r => r.data),

  reconcilePending: (): Promise<{ checked: number; reconciled: number; message: string }> =>
    api.post<{ checked: number; reconciled: number; message: string }>('/api/petty-cash/reconcile-pending').then(r => r.data),
}
