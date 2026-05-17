import type { AxiosResponse } from 'axios'
import api from '@/lib/axios'
import { BACKEND_URL } from '@/lib/constants'

export type LogoPosition = 'left' | 'right' | 'full'

export interface CompanySettings {
  company_name: string
  company_address: string
  company_phone: string
  company_email: string
  company_tax_number: string
  logo_position: LogoPosition
  company_logo: string | null   // full public URL, null when no logo
}

/** Convert a raw storage-relative path ("logos/file.jpg") to a full URL. */
function logoUrl(rawPath: string | null | undefined): string | null {
  if (!rawPath) return null
  // BACKEND_URL = "http://host/finance-api/public"
  // Storage symlink lives at "<public>/storage/", so full URL is BACKEND_URL + "/storage/" + path
  return `${BACKEND_URL}/storage/${rawPath}`
}

const d = <T>(r: AxiosResponse<T>) => r.data

export const settingsApi = {
  get: (): Promise<CompanySettings> =>
    api.get<CompanySettings>('/api/settings').then(r => ({
      ...r.data,
      company_logo: logoUrl(r.data.company_logo),
    })),

  update: (data: Omit<CompanySettings, 'company_logo'>): Promise<CompanySettings> =>
    api.put<CompanySettings>('/api/settings', data).then(r => ({
      ...r.data,
      company_logo: logoUrl(r.data.company_logo),
    })),

  uploadLogo: (file: File): Promise<{ company_logo: string | null }> => {
    const form = new FormData()
    form.append('logo', file)
    return api.post<{ company_logo: string }>('/api/settings/logo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => ({ company_logo: logoUrl(r.data.company_logo) }))
  },

  deleteLogo: (): Promise<{ company_logo: null }> =>
    api.delete('/api/settings/logo').then(() => ({ company_logo: null })),
}
