import { createContext, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fiscalYearsApi, type FiscalYear } from '@/api/fiscalYears'

interface Ctx {
  years: FiscalYear[]
  loading: boolean
  reload: () => void
}

const FiscalYearsContext = createContext<Ctx>({ years: [], loading: true, reload: () => {} })

export function FiscalYearsProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['fiscal-years'],
    queryFn: fiscalYearsApi.list,
    // Refetch when the tab regains focus so newly closed/opened periods
    // (e.g. from another tab) show up without a manual page refresh.
    refetchOnWindowFocus: true,
  })

  return (
    <FiscalYearsContext.Provider value={{ years: data ?? [], loading: isLoading, reload: () => refetch() }}>
      {children}
    </FiscalYearsContext.Provider>
  )
}

export const useFiscalYears = () => useContext(FiscalYearsContext)
