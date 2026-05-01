import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  direction: 'rtl',
  palette: {
    primary:    { main: '#2563eb' },
    secondary:  { main: '#7c3aed' },
    success:    { main: '#16a34a' },
    warning:    { main: '#d97706' },
    error:      { main: '#dc2626' },
    background: { default: '#f1f5f9', paper: '#ffffff' },
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
      styleOverrides: { root: { border: '1px solid #e2e8f0' } },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 600,
            backgroundColor: '#f8fafc',
            color: '#64748b',
            fontSize: 13,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: { root: { borderBottomColor: '#f1f5f9' } },
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
  },
})
