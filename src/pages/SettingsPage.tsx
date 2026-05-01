import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, CircularProgress, Divider,
  Paper, Snackbar, TextField, Typography,
} from '@mui/material'
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import { settingsApi, type CompanySettings } from '@/api/settings'

const EMPTY: CompanySettings = {
  company_name:       '',
  company_address:    '',
  company_phone:      '',
  company_email:      '',
  company_tax_number: '',
}

export default function SettingsPage() {
  const [form, setForm]       = useState<CompanySettings>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    settingsApi.get()
      .then(setForm)
      .finally(() => setLoading(false))
  }, [])

  const set = (key: keyof CompanySettings) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const saved = await settingsApi.update(form)
      setForm(saved)
      setSuccess(true)
    } catch {
      setError('تعذّر حفظ الإعدادات، يرجى المحاولة مجدداً')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 680 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>الإعدادات</Typography>
        <Button
          type="submit"
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
          disabled={saving}
        >
          حفظ التغييرات
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Company info */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
          <BusinessOutlinedIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>معلومات الشركة</Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            label="اسم الشركة"
            value={form.company_name}
            onChange={set('company_name')}
            fullWidth
            placeholder="مثال: شركة المالية للتجارة"
          />

          <TextField
            label="العنوان"
            value={form.company_address}
            onChange={set('company_address')}
            fullWidth
            multiline
            rows={2}
            placeholder="المدينة، الشارع، الرقم"
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="رقم الهاتف"
              value={form.company_phone}
              onChange={set('company_phone')}
              inputProps={{ dir: 'ltr' }}
              placeholder="+249 9X XXX XXXX"
            />
            <TextField
              label="البريد الإلكتروني"
              type="email"
              value={form.company_email}
              onChange={set('company_email')}
              inputProps={{ dir: 'ltr' }}
              placeholder="info@company.com"
            />
          </Box>

          <TextField
            label="الرقم الضريبي"
            value={form.company_tax_number}
            onChange={set('company_tax_number')}
            sx={{ maxWidth: 300 }}
            placeholder="اختياري"
          />
        </Box>
      </Paper>

      {/* Preview */}
      {form.company_name && (
        <Paper sx={{ p: 3, mt: 3, bgcolor: 'grey.50', border: '1px dashed', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            معاينة رأس الصفحة في التقارير
          </Typography>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{form.company_name}</Typography>
            {form.company_address && (
              <Typography variant="body2" color="text.secondary">{form.company_address}</Typography>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 0.5 }}>
              {form.company_phone && (
                <Typography variant="caption" color="text.secondary" sx={{ direction: 'ltr' }}>
                  {form.company_phone}
                </Typography>
              )}
              {form.company_email && (
                <Typography variant="caption" color="text.secondary" sx={{ direction: 'ltr' }}>
                  {form.company_email}
                </Typography>
              )}
            </Box>
            {form.company_tax_number && (
              <Typography variant="caption" color="text.secondary">
                الرقم الضريبي: {form.company_tax_number}
              </Typography>
            )}
          </Box>
        </Paper>
      )}

      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(false)}>
          تم حفظ الإعدادات بنجاح
        </Alert>
      </Snackbar>
    </Box>
  )
}
