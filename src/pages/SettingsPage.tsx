import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Alert, Button, Divider, Flex, Input, Modal, Select, Spin, Switch, Tabs, Tag, Tooltip, Typography,
} from 'antd'
import HelpButton from '@/components/common/HelpButton'
import { useToast } from '@/lib/toast'
import {
  AlignLeft, AlignRight, Building2, Copy, Image as ImageIcon, KeyRound, Link as LinkIcon,
  LayoutTemplate, MessageCircle, Plus, Save, Settings, Trash2, User, PiggyBank, ClipboardCheck,
  ShoppingCart,
} from 'lucide-react'
import api from '@/lib/axios'
import {
  settingsApi, pettyCashSettingsApi, pettyCashAccountSettingsApi, salesBridgeSettingsApi,
  type CompanySettings, type LogoPosition, type PettyCashApprovalSettings, type SalesBridgeAccountSettings,
} from '@/api/settings'
import { accountsApi } from '@/api/accounts'
import type { Account } from '@/types/account'
import { usersApi, type UserRecord } from '@/api/users'

const { Title, Text } = Typography

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
  { value: 'right', label: 'يمين',          icon: <AlignRight size={18} />,      desc: 'الشعار على اليمين، معلومات الشركة على اليسار' },
  { value: 'left',  label: 'يسار',          icon: <AlignLeft size={18} />,       desc: 'الشعار على اليسار، معلومات الشركة على اليمين' },
  { value: 'full',  label: 'ترويسة كاملة', icon: <LayoutTemplate size={18} />, desc: 'الشعار يمتد بعرض الصفحة بالكامل' },
]

const TABS = [
  { key: 'company',     label: 'معلومات الشركة',   icon: <Building2 size={15} /> },
  { key: 'logo',        label: 'الشعار والتقارير', icon: <ImageIcon size={15} /> },
  { key: 'petty-cash',  label: 'صندوق النثريات',   icon: <PiggyBank size={15} /> },
  { key: 'approval',    label: 'اعتماد النثريات',  icon: <ClipboardCheck size={15} /> },
  { key: 'sales-bridge', label: 'ربط المبيعات',     icon: <ShoppingCart size={15} /> },
  { key: 'tokens',      label: 'رموز API',         icon: <KeyRound size={15} /> },
] as const

/** Accent color per settings section — mirrors the palette used on the dashboard stat cards. */
const SECTION_COLOR = {
  company:  '#2563eb',
  logo:     '#7c3aed',
  pettyFund: '#16a34a',
  approval: '#0891b2',
  salesBridge: '#be185d',
  tokens:   '#d97706',
} as const

interface SectionHeaderProps {
  icon: React.ReactNode
  title: string
  subtitle?: string
  color: string
  action?: React.ReactNode
}

function SectionHeader({ icon, title, subtitle, color, action }: SectionHeaderProps) {
  return (
    <Flex align="center" gap={14} style={{ marginBottom: 24 }}>
      <Flex align="center" justify="center" style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        background: `${color}18`, color,
      }}>
        {icon}
      </Flex>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Title level={5} style={{ margin: 0, lineHeight: 1.3 }}>{title}</Title>
        {subtitle && <Text type="secondary">{subtitle}</Text>}
      </div>
      {action}
    </Flex>
  )
}

export default function SettingsPage() {
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const initialTab = TABS.find(t => t.key === searchParams.get('tab'))?.key ?? TABS[0].key
  const [activeTab, setActiveTab] = useState<string>(initialTab)
  const [form, setForm]           = useState<CompanySettings>(EMPTY)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const fileRef                   = useRef<HTMLInputElement>(null)

  // Petty cash approval settings state
  const [users,             setUsers]             = useState<UserRecord[]>([])
  const [pettyCashApproval, setPettyCashApproval]  = useState<PettyCashApprovalSettings>({
    petty_cash_manager_user_id: null,
    petty_cash_manager_whatsapp_phone: '',
    petty_cash_auditor_user_id: null,
    petty_cash_notify_on_create: true,
    firebase_collection_name: '',
  })
  const [pettyCashLoading, setPettyCashLoading] = useState(true)
  const [pettyCashSaving,  setPettyCashSaving]  = useState(false)

  // Petty cash account settings state (which accounts expenses are paid from)
  const [accounts, setAccounts]         = useState<Account[]>([])
  const [cashAccount, setCashAccount]   = useState<Account | null>(null)
  const [bankAccount, setBankAccount]   = useState<Account | null>(null)
  const [pettyCashAccountsLoading, setPettyCashAccountsLoading] = useState(true)
  const [pettyCashAccountsSaving, setPettyCashAccountsSaving]   = useState(false)

  // Sales bridge account settings state (which accounts a sales-api journal entry posts to)
  const [receivableAccount, setReceivableAccount] = useState<Account | null>(null)
  const [revenueAccount,    setRevenueAccount]    = useState<Account | null>(null)
  const [cogsAccount,       setCogsAccount]       = useState<Account | null>(null)
  const [inventoryAccount,  setInventoryAccount]  = useState<Account | null>(null)
  const [salesCashAccount,  setSalesCashAccount]  = useState<Account | null>(null)
  const [salesBankAccount,  setSalesBankAccount]  = useState<Account | null>(null)
  const [salesBridgeLoading, setSalesBridgeLoading] = useState(true)
  const [salesBridgeSaving,  setSalesBridgeSaving]  = useState(false)

  useEffect(() => {
    settingsApi.get()
      .then(setForm)
      .finally(() => setLoading(false))

    Promise.all([usersApi.list(), pettyCashSettingsApi.get()])
      .then(([u, p]) => { setUsers(u); setPettyCashApproval(p) })
      .finally(() => setPettyCashLoading(false))

    Promise.all([accountsApi.list(), pettyCashAccountSettingsApi.get()])
      .then(([a, s]) => {
        setAccounts(a)
        setCashAccount(a.find(acc => acc.id === s.petty_cash_cash_account_id) ?? null)
        setBankAccount(a.find(acc => acc.id === s.petty_cash_bank_account_id) ?? null)
      })
      .finally(() => setPettyCashAccountsLoading(false))

    Promise.all([accountsApi.list(), salesBridgeSettingsApi.get()])
      .then(([a, s]) => {
        setReceivableAccount(a.find(acc => acc.id === s.sales_receivable_account_id) ?? null)
        setRevenueAccount(a.find(acc => acc.id === s.sales_revenue_account_id) ?? null)
        setCogsAccount(a.find(acc => acc.id === s.sales_cogs_account_id) ?? null)
        setInventoryAccount(a.find(acc => acc.id === s.sales_inventory_account_id) ?? null)
        setSalesCashAccount(a.find(acc => acc.id === s.sales_cash_account_id) ?? null)
        setSalesBankAccount(a.find(acc => acc.id === s.sales_bank_account_id) ?? null)
      })
      .finally(() => setSalesBridgeLoading(false))
  }, [])

  const handlePettyCashApprovalSave = async () => {
    setPettyCashSaving(true)
    try {
      const p = await pettyCashSettingsApi.update(pettyCashApproval)
      setPettyCashApproval(p)
      toast.success('تم حفظ إعدادات اعتماد النثريات')
    } catch {
      toast.error('تعذّر حفظ إعدادات اعتماد النثريات')
    } finally {
      setPettyCashSaving(false)
    }
  }

  const handlePettyCashAccountsSave = async () => {
    setPettyCashAccountsSaving(true)
    try {
      const r = await pettyCashAccountSettingsApi.update({
        petty_cash_cash_account_id: cashAccount?.id ?? null,
        petty_cash_bank_account_id: bankAccount?.id ?? null,
      })
      setCashAccount(accounts.find(acc => acc.id === r.petty_cash_cash_account_id) ?? null)
      setBankAccount(accounts.find(acc => acc.id === r.petty_cash_bank_account_id) ?? null)
      toast.success('تم حفظ حسابات صندوق النثريات')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'تعذّر حفظ حسابات صندوق النثريات')
    } finally {
      setPettyCashAccountsSaving(false)
    }
  }

  const handleSalesBridgeSave = async () => {
    setSalesBridgeSaving(true)
    try {
      const payload: SalesBridgeAccountSettings = {
        sales_receivable_account_id: receivableAccount?.id ?? null,
        sales_revenue_account_id: revenueAccount?.id ?? null,
        sales_cogs_account_id: cogsAccount?.id ?? null,
        sales_inventory_account_id: inventoryAccount?.id ?? null,
        sales_cash_account_id: salesCashAccount?.id ?? null,
        sales_bank_account_id: salesBankAccount?.id ?? null,
      }
      const r = await salesBridgeSettingsApi.update(payload)
      setReceivableAccount(accounts.find(acc => acc.id === r.sales_receivable_account_id) ?? null)
      setRevenueAccount(accounts.find(acc => acc.id === r.sales_revenue_account_id) ?? null)
      setCogsAccount(accounts.find(acc => acc.id === r.sales_cogs_account_id) ?? null)
      setInventoryAccount(accounts.find(acc => acc.id === r.sales_inventory_account_id) ?? null)
      setSalesCashAccount(accounts.find(acc => acc.id === r.sales_cash_account_id) ?? null)
      setSalesBankAccount(accounts.find(acc => acc.id === r.sales_bank_account_id) ?? null)
      toast.success('تم حفظ حسابات ربط المبيعات')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'تعذّر حفظ حسابات ربط المبيعات')
    } finally {
      setSalesBridgeSaving(false)
    }
  }

  const assetAccounts = accounts.filter(a => a.type === 'asset')
  const revenueAccounts = accounts.filter(a => a.type === 'revenue')
  const expenseAccounts = accounts.filter(a => a.type === 'expense')

  const set = (key: keyof CompanySettings) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { company_logo: _, ...payload } = form
      const saved = await settingsApi.update(payload)
      setForm(saved)
      toast.success('تم حفظ الإعدادات بنجاح')
    } catch {
      toast.error('تعذّر حفظ الإعدادات، يرجى المحاولة مجدداً')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    try {
      const res = await settingsApi.uploadLogo(file)
      setForm(prev => ({ ...prev, company_logo: res.company_logo }))
      toast.success('تم رفع الشعار')
    } catch {
      toast.error('تعذّر رفع الشعار، تأكد من صيغة الملف (JPG, PNG, WebP)')
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
      toast.success('تم حذف الشعار')
    } catch {
      toast.error('تعذّر حذف الشعار')
    } finally {
      setLogoUploading(false)
    }
  }

  if (loading) {
    return (
      <Flex justify="center" style={{ padding: '80px 0' }}>
        <Spin size="large" />
      </Flex>
    )
  }

  const cardStyle: React.CSSProperties = { padding: 24, borderRadius: 12, border: '1px solid var(--ant-color-border-secondary)' }

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <Flex justify="space-between" align="center" wrap="wrap" gap={16} style={{ marginBottom: 24 }}>
        <Flex align="center" gap={14}>
          <Flex align="center" justify="center" style={{
            width: 48, height: 48, borderRadius: 10, flexShrink: 0,
            background: 'var(--ant-color-primary-bg)', color: 'var(--ant-color-primary)',
          }}>
            <Settings size={22} />
          </Flex>
          <div>
            <Flex align="center" gap={4}>
              <Title level={4} style={{ margin: 0, lineHeight: 1.2 }}>الإعدادات</Title>
              <HelpButton title="دليل استخدام الإعدادات">
                <Flex vertical gap={16}>
                  <div><Title level={5}>معلومات الشركة</Title>
                    <Text>أدخل اسم الشركة والعنوان والهاتف والبريد والرقم الضريبي. تظهر هذه المعلومات في رأس التقارير والمستندات المُصدَّرة.</Text></div>
                  <div><Title level={5}>شعار الشركة</Title>
                    <Text>ارفع شعار الشركة (JPG, PNG, WebP) وحدد موضعه في رأس التقارير: يمين أو يسار أو ترويسة كاملة.</Text></div>
                  <div><Title level={5}>حفظ التغييرات</Title>
                    <Text>اضغط "حفظ التغييرات" لتطبيق التعديلات. الشعار يُحفظ فور رفعه بشكل منفصل.</Text></div>
                </Flex>
              </HelpButton>
            </Flex>
            <Text type="secondary">
              بيانات الشركة، الشعار، صندوق النثريات، الاعتماد ورموز الربط
            </Text>
          </div>
        </Flex>
        {(activeTab === 'company' || activeTab === 'logo') && (
          <Button
            type="primary"
            icon={saving ? <Spin size="small" /> : <Save size={16} />}
            disabled={saving}
            onClick={handleSubmit}
          >
            حفظ التغييرات
          </Button>
        )}
      </Flex>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={TABS.map(tab => ({
          key: tab.key,
          label: <Flex align="center" gap={6}>{tab.icon}{tab.label}</Flex>,
        }))}
      />

      {/* Company info */}
      {activeTab === 'company' && (
        <form onSubmit={handleSubmit} style={cardStyle}>
          <SectionHeader
            icon={<Building2 size={20} />}
            color={SECTION_COLOR.company}
            title="معلومات الشركة"
            subtitle="تظهر هذه البيانات في رأس التقارير والمستندات المُصدَّرة"
          />

          <Flex vertical gap={20}>
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>اسم الشركة</Text>
              <Input value={form.company_name} onChange={set('company_name')} placeholder="مثال: شركة المالية للتجارة" />
            </div>

            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>العنوان</Text>
              <Input.TextArea rows={2} value={form.company_address} onChange={set('company_address')} placeholder="المدينة، الشارع، الرقم" />
            </div>

            <Flex gap={16}>
              <div style={{ flex: 1 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>رقم الهاتف</Text>
                <Input dir="ltr" value={form.company_phone} onChange={set('company_phone')} placeholder="+249 9X XXX XXXX" />
              </div>
              <div style={{ flex: 1 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>البريد الإلكتروني</Text>
                <Input type="email" dir="ltr" value={form.company_email} onChange={set('company_email')} placeholder="info@company.com" />
              </div>
            </Flex>

            <div style={{ maxWidth: 300 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>الرقم الضريبي</Text>
              <Input value={form.company_tax_number} onChange={set('company_tax_number')} placeholder="اختياري" />
            </div>
          </Flex>
        </form>
      )}

      {/* Logo & report header section */}
      {activeTab === 'logo' && (
        <div style={cardStyle}>
          <SectionHeader
            icon={<ImageIcon size={20} />}
            color={SECTION_COLOR.logo}
            title="شعار الشركة في التقارير"
            subtitle="ارفع الشعار وحدد موضعه في رأس التقارير المُصدَّرة"
          />

          <Flex gap={24} align="flex-start" wrap="wrap">
            {/* Logo upload box */}
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>الشعار الحالي</Text>
              <div style={{
                width: 160, height: 100,
                border: '2px dashed var(--ant-color-border)',
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--ant-color-fill-alter)',
                overflow: 'hidden', position: 'relative',
              }}>
                {form.company_logo ? (
                  <>
                    <img src={form.company_logo} alt="شعار الشركة" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    <Tooltip title="حذف الشعار">
                      <Button
                        type="text" shape="circle" size="small" danger
                        onClick={handleLogoDelete} disabled={logoUploading}
                        style={{ position: 'absolute', top: 4, left: 4, background: 'var(--ant-color-bg-container)', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}
                        icon={logoUploading ? <Spin size="small" /> : <Trash2 size={14} />}
                      />
                    </Tooltip>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--ant-color-text-disabled)' }}>
                    <ImageIcon size={30} style={{ marginBottom: 4 }} />
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>لا يوجد شعار</Text>
                  </div>
                )}
              </div>

              <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" hidden onChange={handleLogoChange} />
              <Button
                size="small"
                icon={logoUploading ? <Spin size="small" /> : <ImageIcon size={14} />}
                onClick={() => fileRef.current?.click()}
                disabled={logoUploading}
                style={{ marginTop: 12, width: 160 }}
              >
                {form.company_logo ? 'تغيير الشعار' : 'رفع شعار'}
              </Button>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4, maxWidth: 160 }}>
                JPG · PNG · WebP · حتى 3 ميغابايت
              </Text>
            </div>

            {/* Position selector */}
            <div style={{ flex: 1, minWidth: 260 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>موضع الشعار في رأس التقارير</Text>
              <Flex vertical gap={8}>
                {POSITION_OPTIONS.map(opt => {
                  const selected = form.logo_position === opt.value
                  return (
                    <div
                      key={opt.value}
                      onClick={() => setForm(prev => ({ ...prev, logo_position: opt.value }))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${selected ? 'var(--ant-color-primary)' : 'var(--ant-color-border-secondary)'}`,
                        background: selected ? 'var(--ant-color-primary-bg)' : 'transparent',
                        color: selected ? 'var(--ant-color-primary)' : 'inherit',
                      }}
                    >
                      {opt.icon}
                      <div>
                        <Text style={{ fontWeight: 600, lineHeight: 1.2, display: 'block', color: 'inherit' }}>{opt.label}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{opt.desc}</Text>
                      </div>
                    </div>
                  )
                })}
              </Flex>
            </div>
          </Flex>

          {/* Live PDF header preview */}
          <div style={{ marginTop: 24 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>معاينة رأس صفحة التقارير</Text>
            <PdfHeaderPreview
              name={form.company_name}
              address={form.company_address}
              phone={form.company_phone}
              logoUrl={form.company_logo}
              position={form.logo_position}
            />
          </div>
        </div>
      )}

      {/* Petty cash fund settings */}
      {activeTab === 'petty-cash' && (
        <div style={cardStyle}>
          <SectionHeader
            icon={<PiggyBank size={20} />}
            color={SECTION_COLOR.pettyFund}
            title="حسابات صندوق النثريات"
            subtitle="الحساب النقدي والحساب البنكي اللذان تُصرف منهما مصروفات النثريات"
          />

          {pettyCashAccountsLoading ? <Spin /> : (
            <Flex vertical gap={20} style={{ maxWidth: 520 }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>حساب النقدية</Text>
                <Select
                  showSearch
                  allowClear
                  style={{ width: '100%' }}
                  value={cashAccount?.id}
                  onChange={v => setCashAccount(assetAccounts.find(a => a.id === v) ?? null)}
                  notFoundContent="لا توجد حسابات"
                  filterOption={(input, option) => (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                  options={assetAccounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
                />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>حساب البنك</Text>
                <Select
                  showSearch
                  allowClear
                  style={{ width: '100%' }}
                  value={bankAccount?.id}
                  onChange={v => setBankAccount(assetAccounts.find(a => a.id === v) ?? null)}
                  notFoundContent="لا توجد حسابات"
                  filterOption={(input, option) => (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                  options={assetAccounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
                />
              </div>

              <Divider style={{ margin: 0 }} />

              <Flex justify="flex-end">
                <Button
                  type="primary"
                  icon={pettyCashAccountsSaving ? <Spin size="small" /> : <Save size={16} />}
                  onClick={handlePettyCashAccountsSave}
                  disabled={pettyCashAccountsSaving}
                >
                  حفظ حسابات النثريات
                </Button>
              </Flex>
            </Flex>
          )}
        </div>
      )}

      {/* Petty cash approval settings */}
      {activeTab === 'approval' && (
        <div style={cardStyle}>
          <SectionHeader
            icon={<ClipboardCheck size={20} />}
            color={SECTION_COLOR.approval}
            title="اعتماد صندوق النثريات"
            subtitle="المسؤولون عن اعتماد طلبات الصرف وقنوات إشعارهم عبر واتساب"
          />

          {pettyCashLoading ? <Spin /> : (
            <Flex vertical gap={24}>
              {/* Manager */}
              <div style={{ maxWidth: 420, padding: 20, border: '1px solid var(--ant-color-border-secondary)', borderRadius: 10, background: 'var(--ant-color-fill-alter)' }}>
                <Flex align="center" gap={8} style={{ marginBottom: 16 }}>
                  <User size={15} color={SECTION_COLOR.approval} />
                  <Text style={{ fontWeight: 700 }}>المدير المعتمِد</Text>
                </Flex>
                <Flex vertical gap={14}>
                  <Select
                    showSearch
                    placeholder="المستخدم"
                    style={{ width: '100%' }}
                    value={pettyCashApproval.petty_cash_manager_user_id ?? undefined}
                    onChange={v => setPettyCashApproval(p => ({ ...p, petty_cash_manager_user_id: v ?? null }))}
                    allowClear
                    filterOption={(input, option) => (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                    options={users.map(u => ({ value: u.id, label: u.name }))}
                  />
                  <Input
                    placeholder="رقم واتساب" dir="ltr"
                    value={pettyCashApproval.petty_cash_manager_whatsapp_phone}
                    onChange={e => setPettyCashApproval(p => ({ ...p, petty_cash_manager_whatsapp_phone: e.target.value }))}
                  />
                </Flex>
              </div>

              {/* Auditor */}
              <div style={{ maxWidth: 420, padding: 20, border: '1px solid var(--ant-color-border-secondary)', borderRadius: 10, background: 'var(--ant-color-fill-alter)' }}>
                <Flex align="center" gap={8} style={{ marginBottom: 16 }}>
                  <ClipboardCheck size={15} color={SECTION_COLOR.approval} />
                  <Text style={{ fontWeight: 700 }}>المدقق المعتمِد</Text>
                </Flex>
                <Select
                  showSearch
                  placeholder="المستخدم"
                  style={{ width: '100%' }}
                  value={pettyCashApproval.petty_cash_auditor_user_id ?? undefined}
                  onChange={v => setPettyCashApproval(p => ({ ...p, petty_cash_auditor_user_id: v ?? null }))}
                  allowClear
                  filterOption={(input, option) => (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                  options={users.map(u => ({ value: u.id, label: u.name }))}
                />
              </div>

              {/* WhatsApp auto-notify on creation */}
              <div style={{ padding: 20, border: '1px solid var(--ant-color-border-secondary)', borderRadius: 10, background: 'var(--ant-color-fill-alter)' }}>
                <Flex align="center" justify="space-between" gap={16} wrap="wrap">
                  <Flex align="center" gap={8}>
                    <MessageCircle size={15} color={SECTION_COLOR.approval} />
                    <div>
                      <Text style={{ fontWeight: 700, display: 'block' }}>إشعار واتساب عند إنشاء مصروف</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>إرسال تلقائي لطلب الاعتماد فور حفظ المصروف</Text>
                    </div>
                  </Flex>
                  <Switch
                    checked={pettyCashApproval.petty_cash_notify_on_create}
                    onChange={checked => setPettyCashApproval(p => ({ ...p, petty_cash_notify_on_create: checked }))}
                  />
                </Flex>
              </div>

              {/* Firebase integration */}
              <div>
                <Flex align="center" gap={8} style={{ marginBottom: 10 }}>
                  <LinkIcon size={15} color="var(--ant-color-text-secondary)" />
                  <Text style={{ fontWeight: 700 }}>إعدادات الربط مع Firestore</Text>
                </Flex>
                <Input
                  dir="ltr"
                  style={{ maxWidth: 420 }}
                  placeholder="مثال: jawda"
                  value={pettyCashApproval.firebase_collection_name}
                  onChange={e => setPettyCashApproval(p => ({ ...p, firebase_collection_name: e.target.value }))}
                />
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4, maxWidth: 420 }}>
                  جذر مسار مستندات الاعتماد في Firestore: finance/{'{الاسم}'}/petty_cash_approvals/... — يُستخدم jawda افتراضياً إن تُرك فارغاً
                </Text>
              </div>

              <Divider style={{ margin: 0 }} />

              <Flex justify="flex-end">
                <Button
                  type="primary"
                  icon={pettyCashSaving ? <Spin size="small" /> : <Save size={16} />}
                  onClick={handlePettyCashApprovalSave}
                  disabled={pettyCashSaving}
                >
                  حفظ إعدادات الاعتماد
                </Button>
              </Flex>
            </Flex>
          )}
        </div>
      )}

      {/* Sales bridge account settings */}
      {activeTab === 'sales-bridge' && (
        <div style={cardStyle}>
          <SectionHeader
            icon={<ShoppingCart size={20} />}
            color={SECTION_COLOR.salesBridge}
            title="حسابات ربط المبيعات"
            subtitle="الحسابات التي تُنشأ عليها قيود المبيعات المستوردة من نظام المبيعات (sales-api) حسب طريقة الدفع — يرسل النظام الخارجي دور كل حساب فقط (مثل sales_revenue)، ولا يحتاج معرفة أرقام أو رموز الحسابات هنا"
          />

          {salesBridgeLoading ? <Spin /> : (
            <Flex vertical gap={20} style={{ maxWidth: 520 }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>ذمم العملاء (مدين) — sales_receivable</Text>
                <Select
                  showSearch
                  allowClear
                  style={{ width: '100%' }}
                  value={receivableAccount?.id}
                  onChange={v => setReceivableAccount(assetAccounts.find(a => a.id === v) ?? null)}
                  notFoundContent="لا توجد حسابات أصول"
                  filterOption={(input, option) => (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                  options={assetAccounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
                />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>إيراد المبيعات (دائن) — sales_revenue</Text>
                <Select
                  showSearch
                  allowClear
                  style={{ width: '100%' }}
                  value={revenueAccount?.id}
                  onChange={v => setRevenueAccount(revenueAccounts.find(a => a.id === v) ?? null)}
                  notFoundContent="لا توجد حسابات إيرادات"
                  filterOption={(input, option) => (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                  options={revenueAccounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
                />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>تكلفة المبيعات (مدين) — sales_cogs</Text>
                <Select
                  showSearch
                  allowClear
                  style={{ width: '100%' }}
                  value={cogsAccount?.id}
                  onChange={v => setCogsAccount(expenseAccounts.find(a => a.id === v) ?? null)}
                  notFoundContent="لا توجد حسابات مصروفات"
                  filterOption={(input, option) => (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                  options={expenseAccounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
                />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>مخزون البضاعة (دائن) — sales_inventory</Text>
                <Select
                  showSearch
                  allowClear
                  style={{ width: '100%' }}
                  value={inventoryAccount?.id}
                  onChange={v => setInventoryAccount(assetAccounts.find(a => a.id === v) ?? null)}
                  notFoundContent="لا توجد حسابات أصول"
                  filterOption={(input, option) => (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                  options={assetAccounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
                />
              </div>

              <Divider style={{ margin: '4px 0' }}>مبيعات فورية (بدل ذمم العملاء)</Divider>

              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>حساب النقدية (مدين) — sales_cash</Text>
                <Select
                  showSearch
                  allowClear
                  style={{ width: '100%' }}
                  value={salesCashAccount?.id}
                  onChange={v => setSalesCashAccount(assetAccounts.find(a => a.id === v) ?? null)}
                  notFoundContent="لا توجد حسابات أصول"
                  filterOption={(input, option) => (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                  options={assetAccounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
                />
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                  يُستخدم بدل حساب ذمم العملاء عند بيع نقدي فوري بدون آجل
                </Text>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>حساب البنك (مدين) — sales_bank</Text>
                <Select
                  showSearch
                  allowClear
                  style={{ width: '100%' }}
                  value={salesBankAccount?.id}
                  onChange={v => setSalesBankAccount(assetAccounts.find(a => a.id === v) ?? null)}
                  notFoundContent="لا توجد حسابات أصول"
                  filterOption={(input, option) => (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                  options={assetAccounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
                />
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                  يُستخدم بدل حساب ذمم العملاء عند دفع فوري عبر البنك أو بطاقة
                </Text>
              </div>

              <Divider style={{ margin: 0 }} />

              <Flex justify="flex-end">
                <Button
                  type="primary"
                  icon={salesBridgeSaving ? <Spin size="small" /> : <Save size={16} />}
                  onClick={handleSalesBridgeSave}
                  disabled={salesBridgeSaving}
                >
                  حفظ حسابات ربط المبيعات
                </Button>
              </Flex>
            </Flex>
          )}
        </div>
      )}

      {/* API Tokens */}
      {activeTab === 'tokens' && <ApiTokensSection />}
    </div>
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
      <div style={{ padding: 24, borderRadius: 12, border: '1px solid var(--ant-color-border-secondary)' }}>
        <SectionHeader
          icon={<KeyRound size={20} />}
          color={SECTION_COLOR.tokens}
          title="رموز API"
          subtitle="تُستخدم لربط الأنظمة الخارجية، مثل نظام العيادة، بهذا النظام"
        />

        {/* Create new token */}
        <Flex gap={8} style={{ marginBottom: 20 }}>
          <Input
            placeholder="اسم الرمز — مثال: نظام العيادة"
            value={tokenName}
            onChange={e => setTokenName(e.target.value)}
            onPressEnter={handleCreate}
            style={{ minWidth: 220 }}
          />
          <Button
            type="primary"
            icon={creating ? <Spin size="small" /> : <Plus size={16} />}
            onClick={handleCreate}
            disabled={!tokenName.trim() || creating}
          >
            إنشاء رمز
          </Button>
        </Flex>

        {/* Token list */}
        {loading ? (
          <Spin />
        ) : tokens.length === 0 ? (
          <Text type="secondary">لا توجد رموز API بعد.</Text>
        ) : (
          <Flex vertical gap={8}>
            {tokens.map(t => (
              <Flex key={t.id} align="center" gap={12} style={{ padding: 12, border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8 }}>
                <KeyRound size={15} color="var(--ant-color-text-secondary)" />
                <div style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 600, display: 'block' }}>{t.name}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    أُنشئ {new Date(t.created_at).toLocaleDateString('ar')}
                    {t.last_used_at ? ` · آخر استخدام ${new Date(t.last_used_at).toLocaleDateString('ar')}` : ' · لم يُستخدم بعد'}
                  </Text>
                </div>
                <Tag color="success">نشط</Tag>
                <Tooltip title="حذف الرمز">
                  <Button type="text" shape="circle" size="small" danger onClick={() => handleDelete(t.id)} icon={<Trash2 size={15} />} />
                </Tooltip>
              </Flex>
            ))}
          </Flex>
        )}
      </div>

      {/* Plain token dialog — shown ONCE after creation */}
      <Modal
        open={!!plainToken}
        onCancel={() => setPlainToken(null)}
        width={520}
        title={<Flex align="center" gap={8}><KeyRound size={18} color="var(--ant-color-warning)" /> احفظ الرمز الآن — لن يظهر مجدداً</Flex>}
        footer={
          <Flex justify="flex-end">
            <Button type="primary" onClick={() => setPlainToken(null)}>تم، أغلق</Button>
          </Flex>
        }
      >
        <Alert type="warning" showIcon style={{ marginBottom: 16 }}
          message="انسخ هذا الرمز والصقه في إعدادات نظام العيادة. بعد إغلاق هذه النافذة لن تتمكن من رؤيته مرة أخرى."
        />
        <Input
          readOnly
          value={plainToken ?? ''}
          style={{ fontFamily: 'monospace', fontSize: 13, direction: 'ltr' }}
          suffix={
            <Tooltip title={copied ? 'تم النسخ!' : 'نسخ'}>
              <Button type="text" size="small" onClick={handleCopy} icon={<Copy size={15} color={copied ? 'var(--ant-color-success)' : undefined} />} />
            </Tooltip>
          }
        />
      </Modal>
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
    <div style={{
      border: '1px solid var(--ant-color-border-secondary)',
      borderRadius: 8,
      padding: 16,
      background: '#fff',
      fontFamily: 'serif',
      direction: 'rtl',
      minHeight: 80,
    }}>
      {!hasContent && (
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '16px 0', fontSize: 12 }}>
          أدخل اسم الشركة أو ارفع شعاراً لعرض المعاينة
        </Text>
      )}

      {hasContent && position === 'full' && (
        <div>
          {logoUrl && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <img src={logoUrl} alt="" style={{ maxHeight: 48, maxWidth: '100%', objectFit: 'contain' }} />
            </div>
          )}
          <div style={{ textAlign: 'center', color: '#000' }}>
            {name && <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>}
            {address && <div style={{ fontSize: 10, color: '#666' }}>{address}</div>}
            {phone && <div style={{ fontSize: 9, color: '#666', direction: 'ltr' }}>{phone}</div>}
          </div>
        </div>
      )}

      {hasContent && (position === 'right' || position === 'left') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexDirection: position === 'right' ? 'row' : 'row-reverse' }}>
          {logoUrl && <img src={logoUrl} alt="" style={{ height: 52, maxWidth: 80, objectFit: 'contain', flexShrink: 0 }} />}
          <div style={{ flex: 1, textAlign: 'center', color: '#000' }}>
            {name && <div style={{ fontWeight: 700, fontSize: 13 }}>{name}</div>}
            {address && <div style={{ fontSize: 10, color: '#666' }}>{address}</div>}
            {phone && <div style={{ fontSize: 9, color: '#666', direction: 'ltr' }}>{phone}</div>}
          </div>
        </div>
      )}

      {hasContent && (
        <>
          <div style={{ margin: '8px 0', borderTop: '1px solid #d1d5db' }} />
          <div style={{ fontSize: 10, textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
            اسم التقرير · الفترة
          </div>
        </>
      )}
    </div>
  )
}
