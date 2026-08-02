import api from '@/lib/axios'

export interface WhatsAppBusinessPhoneNumber {
  display_phone_number: string
  verified_name: string
}

export const whatsappApi = {
  /** Returns null if WhatsApp isn't configured yet or the Meta lookup fails. */
  getPhoneNumber: (): Promise<WhatsAppBusinessPhoneNumber | null> =>
    api.get<Partial<WhatsAppBusinessPhoneNumber>>('/api/whatsapp/phone-number').then(r =>
      r.data.display_phone_number ? (r.data as WhatsAppBusinessPhoneNumber) : null
    ),
}
