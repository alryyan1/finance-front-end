import { createContext, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { partySettingsApi } from '@/api/settings'

interface Ctx {
  partyEnabled: boolean
}

const AppSettingsContext = createContext<Ctx>({ partyEnabled: true })

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const { data } = useQuery({
    queryKey: ['app-settings', 'party-enabled'],
    queryFn: partySettingsApi.get,
  })

  return (
    <AppSettingsContext.Provider value={{ partyEnabled: data?.party_enabled ?? true }}>
      {children}
    </AppSettingsContext.Provider>
  )
}

export const useAppSettings = () => useContext(AppSettingsContext)
