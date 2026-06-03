import { useEffect, useRef, useState } from 'react'
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogContent, DialogTitle,
  Divider, IconButton, InputAdornment, Paper, Snackbar, Stack, TextField,
  ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material'
import HelpButton from '@/components/common/HelpButton'
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import AlignRightIcon from '@mui/icons-material/AlignHorizontalRight'
import AlignLeftIcon from '@mui/icons-material/AlignHorizontalLeft'
import ViewHeadlineIcon from '@mui/icons-material/ViewHeadline'
import KeyIcon from '@mui/icons-material/Key'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import AddIcon from '@mui/icons-material/Add'
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined'
import api from '@/lib/axios'
import { settingsApi, journalSettingsApi, type CompanySettings, type LogoPosition, type GlobalJournalSettings } from '@/api/settings'
import { accountsApi } from '@/api/accounts'
import type { Account } from '@/types/account'

const EMPTY: CompanySettings = {
  company_name:       '',
  company_address:    '',
  company_phone:      '',
  company_email:      '',
  company_tax_number: '',
  logo_position:      'right',
  company_logo:       null,
}

const POSITION_OPTIONS: { value: LogoPosition; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'right', label: 'يمين',          icon: <AlignRightIcon />,   desc: 'الشعار على اليمين، معلومات الشركة على اليسار' },
  { value: 'left',  label: 'يسار',          icon: <AlignLeftIcon />,    desc: 'الشعار على اليسار، معلومات الشركة على اليمين' },
  { value: 'full',  label: 'ترويسة كاملة', icon: <ViewHeadlineIcon />, desc: 'الشعار يمتد بعرض الصفحة بالكامل' },
]

export default function SettingsPage() {
  const [form, setForm]           = useState<CompanySettings>(EMPTY)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [success, setSuccess]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const fileRef                   = useRef<HTMLInputElement>(null)

  // Journal settings state
  const [accounts,       setAccounts]       = useState<Account[]>([])
  const [journalGlobal,  setJournalGlobal]  = useState<GlobalJournalSettings>({
    journal_clinic_revenue_account_id:      null,
    journal_doctor_receivables_account_id:  null,
    journal_doctor_fees_expense_account_id: null,
  })
  const [journalLoading, setJournalLoading] = useState(true)
  const [journalSaving,  setJournalSaving]  = useState(false)

  useEffect(() => {
    settingsApi.get()
      .then(setForm)
      .finally(() => setLoading(false))

    Promise.all([accountsApi.list(), journalSettingsApi.getGlobal()])
      .then(([accs, g]) => { setAccounts(accs); setJournalGlobal(g) })
      .finally(() => setJournalLoading(false))
  }, [])

  const handleJournalSave = async () => {
    setJournalSaving(true)
    try {
      const g = await journalSettingsApi.updateGlobal(journalGlobal)
      setJournalGlobal(g)
      setSuccess(true)
    } catch {
      setError('تعذّر حفظ إعدادات القيود')
    } finally {
      setJournalSaving(false)
    }
  }

  const set = (key: keyof CompanySettings) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const { company_logo: _, ...payload } = form
      const saved = await settingsApi.update(payload)
      setForm(saved)
      setSuccess(true)
    } catch {
      setError('تعذّر حفظ الإعدادات، يرجى المحاولة مجدداً')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    setError(null)
    try {
      const res = await settingsApi.uploadLogo(file)
      setForm(prev => ({ ...prev, company_logo: res.company_logo }))
    } catch {
      setError('تعذّر رفع الشعار، تأكد من صيغة الملف (JPG, PNG, WebP)')
    } finally {
      setLogoUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleLogoDelete = async () => {
    setLogoUploading(true)
    try {
      await settingsApi.deleteLogo()
      setForm(prev => ({ ...prev, company_logo: null }))
    } catch {
      setError('تعذّر حذف الشعار')
    } finally {
      setLogoUploading(false)
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
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 720 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>الإعدادات</Typography>
          <HelpButton title="دليل استخدام الإعدادات">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>معلومات الشركة</Typography>
                <Typography variant="body2">أدخل اسم الشركة والعنوان والهاتف والبريد والرقم الضريبي. تظهر هذه المعلومات في رأس التقارير والمستندات المُصدَّرة.</Typography></Box>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>شعار الشركة</Typography>
                <Typography variant="body2">ارفع شعار الشركة (JPG, PNG, WebP) وحدد موضعه في رأس التقارير: يمين أو يسار أو ترويسة كاملة.</Typography></Box>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>حفظ التغييرات</Typography>
                <Typography variant="body2">اضغط "حفظ التغييرات" لتطبيق التعديلات. الشعار يُحفظ فور رفعه بشكل منفصل.</Typography></Box>
            </Box>
          </HelpButton>
        </Box>
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
              slotProps={{ htmlInput: { dir: 'ltr' } }}
              placeholder="+249 9X XXX XXXX"
            />
            <TextField
              label="البريد الإلكتروني"
              type="email"
              value={form.company_email}
              onChange={set('company_email')}
              slotProps={{ htmlInput: { dir: 'ltr' } }}
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

      {/* Logo & report header section */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
          <ImageOutlinedIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>شعار الشركة في التقارير</Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />

        <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Logo upload box */}
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              الشعار الحالي
            </Typography>
            <Box
              sx={{
                width: 160, height: 100,
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.50',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {form.company_logo ? (
                <>
                  <Box
                    component="img"
                    src={form.company_logo!}
                    alt="شعار الشركة"
                    sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                  <Tooltip title="حذف الشعار">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={handleLogoDelete}
                      disabled={logoUploading}
                      sx={{
                        position: 'absolute', top: 4, left: 4,
                        bgcolor: 'background.paper',
                        '&:hover': { bgcolor: 'error.50' },
                        boxShadow: 1,
                      }}
                    >
                      {logoUploading ? <CircularProgress size={14} /> : <DeleteOutlineIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </>
              ) : (
                <Box sx={{ textAlign: 'center', color: 'text.disabled' }}>
                  <ImageOutlinedIcon sx={{ fontSize: 36, mb: 0.5 }} />
                  <Typography variant="caption" display="block">لا يوجد شعار</Typography>
                </Box>
              )}
            </Box>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              hidden
              onChange={handleLogoChange}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={logoUploading ? <CircularProgress size={14} /> : <ImageOutlinedIcon />}
              onClick={() => fileRef.current?.click()}
              disabled={logoUploading}
              sx={{ mt: 1.5, width: 160 }}
            >
              {form.company_logo ? 'تغيير الشعار' : 'رفع شعار'}
            </Button>
            <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5, maxWidth: 160 }}>
              JPG · PNG · WebP · حتى 3 ميغابايت
            </Typography>
          </Box>

          {/* Position selector */}
          <Box sx={{ flex: 1, minWidth: 260 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              موضع الشعار في رأس التقارير
            </Typography>
            <ToggleButtonGroup
              value={form.logo_position}
              exclusive
              onChange={(_, v) => v && setForm(prev => ({ ...prev, logo_position: v }))}
              sx={{ flexDirection: 'column', width: '100%', gap: 1 }}
            >
              {POSITION_OPTIONS.map(opt => (
                <ToggleButton
                  key={opt.value}
                  value={opt.value}
                  sx={{
                    justifyContent: 'flex-start',
                    gap: 1.5,
                    px: 2,
                    py: 1.5,
                    borderRadius: '8px !important',
                    border: '1px solid',
                    borderColor: 'divider',
                    textAlign: 'right',
                    '&.Mui-selected': {
                      bgcolor: 'primary.50',
                      borderColor: 'primary.main',
                      color: 'primary.main',
                    },
                  }}
                >
                  {opt.icon}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                      {opt.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {opt.desc}
                    </Typography>
                  </Box>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Live PDF header preview */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            معاينة رأس صفحة التقارير
          </Typography>
          <PdfHeaderPreview
            name={form.company_name}
            address={form.company_address}
            phone={form.company_phone}
            logoUrl={form.company_logo}
            position={form.logo_position}
          />
        </Box>
      </Paper>

      {/* Journal account settings */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
          <AccountBalanceOutlinedIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>إعدادات القيود المحاسبية</Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />

        {journalLoading ? <CircularProgress size={22} /> : (
          <Stack gap={3}>
            {/* Phase 1 — global */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
                حسابات مشتركة لجميع المستخدمين
              </Typography>
              <Stack gap={1.5}>
                {([
                  ['journal_clinic_revenue_account_id',      'إيرادات العيادة *'],
                  ['journal_doctor_receivables_account_id',  'ذمم الأطباء (مستحقات الطبيب) *'],
                  ['journal_doctor_fees_expense_account_id', 'مصروف أتعاب الأطباء *'],
                ] as [keyof GlobalJournalSettings, string][]).map(([key, label]) => (
                  <Autocomplete
                    key={key}
                    size="small"
                    options={accounts}
                    value={accounts.find(a => a.id === journalGlobal[key]) ?? null}
                    onChange={(_, v) => setJournalGlobal(g => ({ ...g, [key]: v?.id ?? null }))}
                    getOptionLabel={a => `${a.code} — ${a.name}`}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    renderInput={p => <TextField {...p} label={label} />}
                  />
                ))}
              </Stack>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={journalSaving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
                onClick={handleJournalSave}
                disabled={journalSaving}
              >
                حفظ إعدادات القيود
              </Button>
            </Box>
          </Stack>
        )}
      </Paper>

      {/* API Tokens */}
      <ApiTokensSection />

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

// ── API Tokens section ────────────────────────────────────────────────────────

interface ApiToken { id: number; name: string; created_at: string; last_used_at: string | null }

function ApiTokensSection() {
  const [tokens, setTokens]         = useState<ApiToken[]>([])
  const [loading, setLoading]       = useState(true)
  const [tokenName, setTokenName]   = useState('')
  const [creating, setCreating]     = useState(false)
  const [plainToken, setPlainToken] = useState<string | null>(null)
  const [copied, setCopied]         = useState(false)

  const load = () => {
    setLoading(true)
    api.get<ApiToken[]>('/api/tokens')
      .then(r => setTokens(r.data))
      .catch(() => setTokens([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!tokenName.trim()) return
    setCreating(true)
    try {
      const { data } = await api.post<{ plain_token: string } & ApiToken>('/api/tokens', { name: tokenName.trim() })
      setPlainToken(data.plain_token)
      setTokenName('')
      load()
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('حذف هذا الرمز؟ لا يمكن التراجع.')) return
    await api.delete(`/api/tokens/${id}`)
    load()
  }

  const handleCopy = () => {
    if (!plainToken) return
    navigator.clipboard.writeText(plainToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <Paper sx={{ p: 3, mt: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
          <KeyIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>رموز API</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
            (تُستخدم لربط الأنظمة الخارجية كنظام العيادة)
          </Typography>
        </Box>
        <Divider sx={{ mb: 2.5 }} />

        {/* Create new token */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
          <TextField
            size="small"
            label="اسم الرمز"
            placeholder="مثال: نظام العيادة"
            value={tokenName}
            onChange={e => setTokenName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            sx={{ minWidth: 220 }}
          />
          <Button
            variant="contained"
            size="small"
            startIcon={creating ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}
            onClick={handleCreate}
            disabled={!tokenName.trim() || creating}
          >
            إنشاء رمز
          </Button>
        </Box>

        {/* Token list */}
        {loading ? (
          <CircularProgress size={22} />
        ) : tokens.length === 0 ? (
          <Typography variant="body2" color="text.secondary">لا توجد رموز API بعد.</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {tokens.map(t => (
              <Box
                key={t.id}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
              >
                <KeyIcon fontSize="small" color="action" />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    أُنشئ {new Date(t.created_at).toLocaleDateString('ar')}
                    {t.last_used_at ? ` · آخر استخدام ${new Date(t.last_used_at).toLocaleDateString('ar')}` : ' · لم يُستخدم بعد'}
                  </Typography>
                </Box>
                <Chip label="نشط" color="success" size="small" variant="outlined" />
                <Tooltip title="حذف الرمز">
                  <IconButton size="small" color="error" onClick={() => handleDelete(t.id)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* Plain token dialog — shown ONCE after creation */}
      <Dialog open={!!plainToken} onClose={() => setPlainToken(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <KeyIcon color="warning" />
          احفظ الرمز الآن — لن يظهر مجدداً
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            انسخ هذا الرمز والصقه في إعدادات نظام العيادة. بعد إغلاق هذه النافذة لن تتمكن من رؤيته مرة أخرى.
          </Alert>
          <TextField
            fullWidth
            value={plainToken ?? ''}
            slotProps={{
              input: {
                readOnly: true,
                sx: { fontFamily: 'monospace', fontSize: 13, direction: 'ltr' },
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={copied ? 'تم النسخ!' : 'نسخ'}>
                      <IconButton onClick={handleCopy} edge="end" color={copied ? 'success' : 'default'}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button variant="contained" onClick={() => setPlainToken(null)}>تم، أغلق</Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── PDF header preview component ─────────────────────────────────────────────

interface PreviewProps {
  name: string
  address: string
  phone: string
  logoUrl: string | null
  position: LogoPosition
}

function PdfHeaderPreview({ name, address, phone, logoUrl, position }: PreviewProps) {
  const hasContent = name || logoUrl

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 2,
        bgcolor: '#fff',
        fontFamily: 'serif',
        direction: 'rtl',
        minHeight: 80,
      }}
    >
      {!hasContent && (
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', py: 2 }}>
          أدخل اسم الشركة أو ارفع شعاراً لعرض المعاينة
        </Typography>
      )}

      {hasContent && position === 'full' && (
        <Box>
          {logoUrl && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
              <Box
                component="img"
                src={logoUrl}
                alt=""
                sx={{ maxHeight: 48, maxWidth: '100%', objectFit: 'contain' }}
              />
            </Box>
          )}
          <Box sx={{ textAlign: 'center' }}>
            {name && <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{name}</Typography>}
            {address && <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{address}</Typography>}
            {phone && <Typography sx={{ fontSize: 9, color: 'text.secondary', direction: 'ltr' }}>{phone}</Typography>}
          </Box>
        </Box>
      )}

      {hasContent && (position === 'right' || position === 'left') && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexDirection: position === 'right' ? 'row' : 'row-reverse' }}>
          {logoUrl && (
            <Box
              component="img"
              src={logoUrl}
              alt=""
              sx={{ height: 52, maxWidth: 80, objectFit: 'contain', flexShrink: 0 }}
            />
          )}
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            {name && <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{name}</Typography>}
            {address && <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{address}</Typography>}
            {phone && <Typography sx={{ fontSize: 9, color: 'text.secondary', direction: 'ltr' }}>{phone}</Typography>}
          </Box>
        </Box>
      )}

      {hasContent && (
        <>
          <Divider sx={{ my: 1, borderColor: 'grey.300' }} />
          <Typography sx={{ fontSize: 10, textAlign: 'center', color: 'text.secondary', fontStyle: 'italic' }}>
            اسم التقرير · الفترة
          </Typography>
        </>
      )}
    </Box>
  )
}
