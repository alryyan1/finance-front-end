import { createContext, useContext, useEffect, useState } from 'react'
import { fiscalYearsApi, type FiscalYear } from '@/api/fiscalYears'

interface Ctx {
  years: FiscalYear[]
  loading: boolean
  reload: () => void
}

const FiscalYearsContext = createContext<Ctx>({ years: [], loading: true, reload: () => {} })

export function FiscalYearsProvider({ children }: { children: React.ReactNode }) {
  const [years, setYears]     = useState<FiscalYear[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = () => {
    setLoading(true)
    fiscalYearsApi.list()
      .then(setYears)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  return (
    <FiscalYearsContext.Provider value={{ years, loading, reload: fetch }}>
      {children}
    </FiscalYearsContext.Provider>
  )
}

export const useFiscalYears = () => useContext(FiscalYearsContext)
