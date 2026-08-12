import axios from 'axios'
import { enqueueSnackbar } from 'notistack'
import { BACKEND_URL } from '@/lib/constants'

const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

// Most mutating actions in the app don't (and shouldn't have to) catch every
// possible error individually — surface "you don't have permission" here in
// one place so it's never silently swallowed or left as a raw stack trace.
api.interceptors.response.use(
  response => response,
  error => {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      const message = error.response.data?.message ?? 'ليس لديك الصلاحية اللازمة للقيام بهذا الإجراء.'
      enqueueSnackbar(message, { variant: 'error' })
    }
    return Promise.reject(error)
  },
)

export default api
