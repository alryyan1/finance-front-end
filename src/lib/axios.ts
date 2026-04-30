import axios from 'axios'
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

export default api
