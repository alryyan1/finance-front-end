import dayjs from 'dayjs'
import 'dayjs/locale/ar'

dayjs.locale('ar')

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost/finance-api/public'

export const CURRENCY_CODE = 'SDG'
export const CURRENCY_LABEL = 'ج.س'

export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${CURRENCY_LABEL}`
}

export const DATE_FORMAT = 'DD/MM/YYYY'

export function formatDate(date: string | Date | dayjs.Dayjs): string {
  return dayjs(date).format(DATE_FORMAT)
}
