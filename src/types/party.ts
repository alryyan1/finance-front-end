export type PartyType = 'customer' | 'supplier' | 'employee' | 'other' | 'doctor'

export interface Party {
  id: number
  name: string
  type: PartyType
  phone: string | null
  email: string | null
  address: string | null
  account_id: number | null
  category_id: number | null
  is_active: boolean
  account?: { id: number; code: string; name: string } | null
  category?: { id: number; name: string } | null
  created_at: string
  updated_at: string
}
