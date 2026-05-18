export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
export type AccountSubType = 'main' | 'sub' | 'detail' | 'current' | 'non_current' | 'long_term' | null

export interface Account {
  id: number
  code: string
  name: string
  type: AccountType
  sub_type: AccountSubType
  parent_id: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}
