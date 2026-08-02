import { createContext, useContext, useMemo, useState } from 'react'
import { ConfigProvider } from 'antd'
import { createAntTheme, type ThemeMode } from '@/antdTheme'

interface ThemeModeContextValue {
  mode: ThemeMode
  toggleMode: () => void
}

const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: 'light',
  toggleMode: () => {},
})

export const useThemeMode = () => useContext(ThemeModeContext)

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme-mode')
    return (saved === 'dark' || saved === 'light') ? saved : 'light'
  })

  const toggleMode = () =>
    setMode(prev => {
      const next: ThemeMode = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme-mode', next)
      return next
    })

  const antTheme = useMemo(() => createAntTheme(mode), [mode])

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      <ConfigProvider direction="rtl" theme={antTheme}>
        {children}
      </ConfigProvider>
    </ThemeModeContext.Provider>
  )
}
