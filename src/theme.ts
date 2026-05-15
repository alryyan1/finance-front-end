import { createTheme } from '@mui/material/styles'
import type { PaletteMode } from '@mui/material'

export function createAppTheme(mode: PaletteMode) {
  const dark = mode === 'dark'

  return createTheme({
    direction: 'rtl',
    palette: {
      mode,
      primary:   { main: '#2563eb' },
      secondary: { main: '#7c3aed' },
      success:   { main: '#16a34a' },
      warning:   { main: '#d97706' },
      error:     { main: '#dc2626' },
      background: dark
        ? { default: '#0f172a', paper: '#1e293b' }
        : { default: '#f1f5f9', paper: '#ffffff' },
      ...(dark && {
        text: { primary: '#f1f5f9', secondary: '#94a3b8', disabled: '#475569' },
        divider: 'rgba(255,255,255,0.08)',
      }),
    },
    typography: {
      fontFamily: '"Cairo Variable", "Cairo", sans-serif',
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}` },
        },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontWeight: 600,
              backgroundColor: dark ? '#162032' : '#f8fafc',
              color: dark ? '#94a3b8' : '#64748b',
              fontSize: 13,
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottomColor: dark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: { '&:last-child td': { borderBottom: 0 } },
        },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 500 } },
      },
      MuiDialogTitle: {
        styleOverrides: { root: { fontSize: '1.05rem', fontWeight: 600 } },
      },
      MuiDialog: {
        styleOverrides: {
          paper: dark ? { border: '1px solid rgba(255,255,255,0.08)' } : {},
        },
      },
    },
  })
}
