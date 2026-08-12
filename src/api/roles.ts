import api from '@/lib/axios'

export interface RoleDetail {
  id: number
  name: string
  permissions: string[]
  users_count: number
}

export interface RolePayload {
  name: string
  permissions: string[]
}

export const rolesApi = {
  list: () =>
    api.get<RoleDetail[]>('/api/roles').then(r => r.data),

  listPermissions: () =>
    api.get<string[]>('/api/permissions').then(r => r.data),

  create: (data: RolePayload) =>
    api.post<RoleDetail>('/api/roles', data).then(r => r.data),

  update: (id: number, data: RolePayload) =>
    api.put<RoleDetail>(`/api/roles/${id}`, data).then(r => r.data),

  remove: (id: number) =>
    api.delete(`/api/roles/${id}`).then(r => r.data),
}
