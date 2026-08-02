import { theme as antdTheme, type ThemeConfig } from 'antd'

export type ThemeMode = 'light' | 'dark'

export function createAntTheme(mode: ThemeMode): ThemeConfig {
  const dark = mode === 'dark'

  return {
    algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: '#2563eb',
      colorInfo: '#2563eb',
      colorSuccess: '#16a34a',
      colorWarning: '#d97706',
      colorError: '#dc2626',
      colorBgLayout: dark ? '#0f172a' : '#f1f5f9',
      colorBgContainer: dark ? '#1e293b' : '#ffffff',
      fontFamily: '"Cairo Variable", "Cairo", sans-serif',
      borderRadius: 8,
    },
  }
}
