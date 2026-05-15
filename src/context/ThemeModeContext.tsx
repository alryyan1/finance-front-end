import { createContext, useContext, useMemo, useState } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import type { PaletteMode } from '@mui/material'
import { createAppTheme } from '@/theme'

interface ThemeModeContextValue {
  mode: PaletteMode
  toggleMode: () => void
}

const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: 'light',
  toggleMode: () => {},
})

export const useThemeMode = () => useContext(ThemeModeContext)

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>(() => {
    const saved = localStorage.getItem('theme-mode')
    return (saved === 'dark' || saved === 'light') ? saved : 'light'
  })

  const toggleMode = () =>
    setMode(prev => {
      const next: PaletteMode = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme-mode', next)
      return next
    })

  const theme = useMemo(() => createAppTheme(mode), [mode])

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}
