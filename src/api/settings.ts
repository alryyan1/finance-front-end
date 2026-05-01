import type { AxiosResponse } from 'axios'
import api from '@/lib/axios'

export interface CompanySettings {
  company_name: string
  company_address: string
  company_phone: string
  company_email: string
  company_tax_number: string
}

const d = <T>(r: AxiosResponse<T>) => r.data

export const settingsApi = {
  get: (): Promise<CompanySettings> =>
    api.get<CompanySettings>('/api/settings').then(d),

  update: (data: CompanySettings): Promise<CompanySettings> =>
    api.put<CompanySettings>('/api/settings', data).then(d),
}
