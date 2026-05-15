export interface PettyCashFund {
  id: number
  name: string
  custodian_name: string
  account_id: number
  bank_account_id: number
  account?: { id: number; code: string; name: string }
  bank_account?: { id: number; code: string; name: string }
  max_amount: string
  current_balance: string
  low_balance_threshold: string
  status: 'active' | 'inactive'
}

export type RequestStatus   = 'pending' | 'approved' | 'rejected' | 'paid'
export type RequestCategory = 'transportation' | 'stationery' | 'hospitality' | 'maintenance' | 'utilities' | 'other'

export interface PettyCashRequest {
  id: number
  fund_id: number
  requester_name: string
  date: string
  amount: string
  category: RequestCategory
  description: string
  reference: string | null
  status: RequestStatus
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  paid_by: string | null
  paid_at: string | null
  expense_account_id: number | null
  expense_account?: { id: number; code: string; name: string }
}

export type ReplenishmentStatus = 'pending' | 'approved' | 'rejected'

export interface PettyCashReplenishment {
  id: number
  fund_id: number
  amount: string
  description: string | null
  requested_by: string
  status: ReplenishmentStatus
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  journal_entry_id: number | null
  created_at: string
}

export const CATEGORY_LABELS: Record<RequestCategory, string> = {
  transportation: 'مواصلات',
  stationery:     'قرطاسية',
  hospitality:    'ضيافة',
  maintenance:    'صيانة',
  utilities:      'مرافق',
  other:          'متنوعات',
}

export const STATUS_LABELS: Record<RequestStatus, string> = {
  pending:  'معلق',
  approved: 'موافق عليه',
  rejected: 'مرفوض',
  paid:     'مدفوع',
}

export const STATUS_COLORS: Record<RequestStatus, 'default' | 'warning' | 'error' | 'success'> = {
  pending:  'warning',
  approved: 'success',
  rejected: 'error',
  paid:     'default',
}
