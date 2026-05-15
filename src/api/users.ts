import api from '@/lib/axios'

export interface UserRecord {
  id: number
  name: string
  username: string
  email: string
  roles: string[]
  created_at: string
}

export interface UserPayload {
  name: string
  username: string
  email: string
  password?: string
  roles?: string[]
}

export interface RoleRecord {
  id: number
  name: string
}

export const usersApi = {
  list: () =>
    api.get<UserRecord[]>('/api/users').then(r => r.data),

  listRoles: () =>
    api.get<RoleRecord[]>('/api/users/roles').then(r => r.data),

  create: (data: UserPayload) =>
    api.post<UserRecord>('/api/users', data).then(r => r.data),

  update: (id: number, data: UserPayload) =>
    api.put<UserRecord>(`/api/users/${id}`, data).then(r => r.data),

  remove: (id: number) =>
    api.delete(`/api/users/${id}`).then(r => r.data),
}

export interface BackupFile {
  name: string
  path: string
  size: number
  size_human: string
  date: string
}

export const backupApi = {
  list: () =>
    api.get<BackupFile[]>('/api/backup').then(r => r.data),

  run: () =>
    api.post<{ message: string }>('/api/backup/run').then(r => r.data),

  downloadUrl: (filename: string) =>
    `${api.defaults.baseURL}/api/backup/download/${encodeURIComponent(filename)}`,

  remove: (filename: string) =>
    api.delete(`/api/backup/${encodeURIComponent(filename)}`).then(r => r.data),
}
