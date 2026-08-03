import { theme as antdTheme, type ThemeConfig } from 'antd'

export type ThemeMode = 'light' | 'dark'

export function createAntTheme(mode: ThemeMode): ThemeConfig {
  const dark = mode === 'dark'

  return {
    algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: '#173A66',
      colorInfo: '#173A66',
      colorSuccess: '#16a34a',
      colorWarning: '#d97706',
      colorError: '#dc2626',
      colorBgLayout: dark ? '#0B1220' : '#f1f5f9',
      colorBgContainer: dark ? '#121B2E' : '#ffffff',
      fontFamily: '"Tajawal", sans-serif',
      borderRadius: 10,
    },
  }
}
