import api from './axios'

export interface ChatMessage {
  role: 'user' | 'model'
  text: string
}

export const aiApi = {
  chat: (messages: ChatMessage[]) =>
    api.post<{ reply: string }>('/api/ai/chat', { messages }).then(r => r.data.reply),

  suggestDescription: (params: {
    debit_account?: string
    credit_account?: string
    amount?: number
  }) =>
    api.post<{ suggestion: string }>('/api/ai/suggest-description', params)
       .then(r => r.data.suggestion),

  analyzeReport: (type: string, data: object) =>
    api.post<{ analysis: string }>('/api/ai/analyze-report', { type, data })
       .then(r => r.data.analysis),
}
