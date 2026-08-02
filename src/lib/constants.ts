import dayjs from 'dayjs'
import 'dayjs/locale/ar'

dayjs.locale('ar')


export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost/finance-api/public'

export function formatCurrency(amount: number): string {
  return Math.round(amount).toLocaleString('en-US')
}

export const DATE_FORMAT = 'DD/MM/YYYY'

export function formatDate(date: string | Date | dayjs.Dayjs): string {
  return dayjs(date).format(DATE_FORMAT)
}
