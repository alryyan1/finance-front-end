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

// ── Journal account settings ──────────────────────────────────────────────────

export interface GlobalJournalSettings {
  journal_clinic_revenue_account_id:      number | null
  journal_doctor_receivables_account_id:  number | null
  journal_doctor_fees_expense_account_id: number | null
}

export interface UserJournalAccounts {
  cash_box_account_id: number | null
  bank_account_id:     number | null
}

function toIntOrNull(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

export const journalSettingsApi = {
  getGlobal: (): Promise<GlobalJournalSettings> =>
    api.get<Record<string, unknown>>('/api/settings').then(r => ({
      journal_clinic_revenue_account_id:      toIntOrNull(r.data.journal_clinic_revenue_account_id),
      journal_doctor_receivables_account_id:  toIntOrNull(r.data.journal_doctor_receivables_account_id),
      journal_doctor_fees_expense_account_id: toIntOrNull(r.data.journal_doctor_fees_expense_account_id),
    })),

  updateGlobal: (data: GlobalJournalSettings): Promise<GlobalJournalSettings> =>
    api.put<Record<string, unknown>>('/api/settings', data).then(r => ({
      journal_clinic_revenue_account_id:      toIntOrNull(r.data.journal_clinic_revenue_account_id),
      journal_doctor_receivables_account_id:  toIntOrNull(r.data.journal_doctor_receivables_account_id),
      journal_doctor_fees_expense_account_id: toIntOrNull(r.data.journal_doctor_fees_expense_account_id),
    })),

  getUser: (): Promise<UserJournalAccounts> =>
    api.get<UserJournalAccounts>('/api/user/journal-accounts').then(d),

  updateUser: (data: UserJournalAccounts): Promise<UserJournalAccounts> =>
    api.put<UserJournalAccounts>('/api/user/journal-accounts', data).then(d),
}

// ── Petty cash approval settings ────────────────────────────────────────────

export interface PettyCashApprovalSettings {
  petty_cash_manager_user_id: number | null
  petty_cash_manager_whatsapp_phone: string
  petty_cash_notify_on_create: boolean
  firebase_collection_name: string
}

function toPettyCashApprovalSettings(data: Record<string, unknown>): PettyCashApprovalSettings {
  return {
    petty_cash_manager_user_id: toIntOrNull(data.petty_cash_manager_user_id),
    petty_cash_manager_whatsapp_phone: String(data.petty_cash_manager_whatsapp_phone ?? ''),
    petty_cash_notify_on_create: Boolean(data.petty_cash_notify_on_create ?? true),
    firebase_collection_name: String(data.firebase_collection_name ?? ''),
  }
}

export const pettyCashSettingsApi = {
  get: (): Promise<PettyCashApprovalSettings> =>
    api.get<Record<string, unknown>>('/api/settings').then(r => toPettyCashApprovalSettings(r.data)),

  update: (data: PettyCashApprovalSettings): Promise<PettyCashApprovalSettings> =>
    api.put<Record<string, unknown>>('/api/settings', data).then(r => toPettyCashApprovalSettings(r.data)),
}

// ── Petty cash account settings (which accounts expenses are paid from) ────

export interface PettyCashAccountSettings {
  petty_cash_cash_account_id: number | null
  petty_cash_bank_account_id: number | null
}

function toPettyCashAccountSettings(data: Record<string, unknown>): PettyCashAccountSettings {
  return {
    petty_cash_cash_account_id: toIntOrNull(data.petty_cash_cash_account_id),
    petty_cash_bank_account_id: toIntOrNull(data.petty_cash_bank_account_id),
  }
}

export const pettyCashAccountSettingsApi = {
  get: (): Promise<PettyCashAccountSettings> =>
    api.get<Record<string, unknown>>('/api/settings').then(r => toPettyCashAccountSettings(r.data)),

  update: (data: PettyCashAccountSettings): Promise<PettyCashAccountSettings> =>
    api.put<Record<string, unknown>>('/api/settings', data).then(r => toPettyCashAccountSettings(r.data)),
}
