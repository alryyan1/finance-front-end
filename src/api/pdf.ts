import api from '@/lib/axios'

export async function openPdf(
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<void> {
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
  )
  const res = await api.get(path, { params: filtered, responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export async function downloadExcel(
  path: string,
  params: Record<string, string | number | undefined>,
  filename: string,
): Promise<void> {
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
  )
  const res = await api.get(path, { params: filtered, responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([res.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
