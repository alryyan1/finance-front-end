import api from '@/lib/axios'

export interface FiscalYear {
  id: number
  name: string
  start_date: string
  end_date: string
  status: 'open' | 'closed'
}

export const fiscalYearsApi = {
  list: (): Promise<FiscalYear[]> =>
    api.get('/api/fiscal-years').then(r => r.data),

  checkDate: (date: string): Promise<{ covered: boolean; fiscal_year: FiscalYear | null }> =>
    api.get('/api/fiscal-years/check-date', { params: { date } }).then(r => r.data),

  carryForward: (id: number): Promise<{ message: string }> =>
    api.post(`/api/fiscal-years/${id}/carry-forward`).then(r => r.data),
}
