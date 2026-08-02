import { useEffect, useState } from 'react'
import {
  Alert, Button, Flex, Modal, Spin, Table, Tag, Tooltip, Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DatabaseBackup, Download, RefreshCw, Trash2 } from 'lucide-react'

import { backupApi } from '@/api/users'
import type { BackupFile } from '@/api/users'
import HelpButton from '@/components/common/HelpButton'
import { useToast } from '@/lib/toast'

const { Title, Text } = Typography

export default function BackupPage() {
  const toast = useToast()
  const [backups, setBackups]   = useState<BackupFile[]>([])
  const [loading, setLoading]   = useState(true)
  const [running, setRunning]   = useState(false)
  const [delTarget, setDelTarget] = useState<BackupFile | null>(null)
  const [deleting, setDeleting]   = useState(false)

  const load = () => {
    setLoading(true)
    backupApi.list()
      .then(setBackups)
      .catch(() => toast.error('تعذّر تحميل النسخ الاحتياطية'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleRun = async () => {
    setRunning(true)
    try {
      const res = await backupApi.run()
      toast.success(res.message)
      load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'فشل إنشاء النسخة الاحتياطية')
    } finally { setRunning(false) }
  }

  const handleDelete = async () => {
    if (!delTarget) return
    setDeleting(true)
    try {
      await backupApi.remove(delTarget.name)
      toast.success('تم حذف النسخة الاحتياطية')
      setDelTarget(null)
      load()
    } catch {
      toast.error('فشل الحذف')
      setDelTarget(null)
    } finally { setDeleting(false) }
  }

  const columns: ColumnsType<BackupFile> = [
    {
      title: 'اسم الملف',
      dataIndex: 'name',
      render: (name: string, _row, index) => (
        <Flex align="center" gap={8}>
          <Text style={{ fontFamily: 'monospace', fontSize: 13 }}>{name}</Text>
          {index === 0 && <Tag color="success">الأحدث</Tag>}
        </Flex>
      ),
    },
    {
      title: 'الحجم',
      dataIndex: 'size_human',
      align: 'center',
      render: (size: string) => <Tag>{size}</Tag>,
    },
    {
      title: 'تاريخ الإنشاء',
      dataIndex: 'date',
      render: (date: string) => <span style={{ direction: 'ltr', color: 'var(--ant-color-text-secondary)', fontSize: 13 }}>{date}</span>,
    },
    {
      title: 'إجراءات',
      align: 'center',
      render: (_: unknown, row) => (
        <Flex gap={4} justify="center">
          <Tooltip title="تنزيل">
            <Button
              type="text" shape="circle" size="small" color="primary" variant="text"
              href={backupApi.downloadUrl(row.name)}
              download={row.name}
              icon={<Download size={16} />}
            />
          </Tooltip>
          <Tooltip title="حذف">
            <Button
              type="text" shape="circle" size="small" danger
              onClick={() => setDelTarget(row)}
              icon={<Trash2 size={16} />}
            />
          </Tooltip>
        </Flex>
      ),
    },
  ]

  return (
    <div>
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <Flex align="center" gap={12}>
          <DatabaseBackup size={28} color="var(--ant-color-primary)" />
          <div>
            <Title level={4} style={{ margin: 0, lineHeight: 1.2 }}>النسخ الاحتياطية</Title>
            <Text type="secondary">{backups.length} نسخة احتياطية</Text>
          </div>
        </Flex>
        <Flex gap={8}>
          <HelpButton title="دليل استخدام النسخ الاحتياطية">
            <Flex vertical gap={16}>
              <div><Title level={5}>ما هي النسخة الاحتياطية؟</Title>
                <Text>النسخة الاحتياطية تحفظ جميع بيانات قاعدة البيانات (القيود، الحسابات، المستخدمين…) في ملف مضغوط يمكن استخدامه للاستعادة عند الحاجة.</Text></div>
              <div><Title level={5}>إنشاء نسخة احتياطية</Title>
                <Text>اضغط "إنشاء نسخة احتياطية" وانتظر حتى تكتمل العملية. تُحفظ النسخة على الخادم ويمكن تنزيلها على جهازك.</Text></div>
              <div><Title level={5}>تنزيل النسخة</Title>
                <Text>اضغط أيقونة التنزيل بجانب أي نسخة لحفظها على جهازك. يُنصح بالاحتفاظ بنسخ دورية (يومية أو أسبوعية).</Text></div>
              <div><Title level={5}>حذف النسخ القديمة</Title>
                <Text>احذف النسخ القديمة لتوفير المساحة على الخادم. احرص على الاحتفاظ دائماً بآخر نسختين على الأقل.</Text></div>
            </Flex>
          </HelpButton>
          <Button icon={<RefreshCw size={16} />} onClick={load} disabled={loading}>تحديث</Button>
          <Button
            type="primary"
            icon={running ? <Spin size="small" /> : <DatabaseBackup size={16} />}
            onClick={handleRun}
            disabled={running}
          >
            {running ? 'جاري الإنشاء…' : 'إنشاء نسخة احتياطية'}
          </Button>
        </Flex>
      </Flex>

      {/* Info card */}
      <Alert type="info" showIcon style={{ marginBottom: 24 }}
        message="النسخ الاحتياطية تشمل قاعدة البيانات فقط وتُخزّن محلياً على الخادم. يُنصح بإنشاء نسخة دورية قبل أي تحديثات كبيرة."
      />

      {loading ? (
        <Flex justify="center" style={{ padding: '80px 0' }}><Spin size="large" /></Flex>
      ) : (
        <Table
          columns={columns}
          dataSource={backups}
          rowKey="name"
          pagination={false}
          locale={{ emptyText: 'لا توجد نسخ احتياطية — اضغط "إنشاء نسخة احتياطية" للبدء' }}
        />
      )}

      {/* Delete confirm */}
      <Modal
        open={!!delTarget}
        onCancel={() => setDelTarget(null)}
        width={420}
        title={<span style={{ color: 'var(--ant-color-error)', fontWeight: 700 }}>تأكيد الحذف</span>}
        footer={
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => setDelTarget(null)} disabled={deleting}>إلغاء</Button>
            <Button type="primary" danger onClick={handleDelete} disabled={deleting}>
              {deleting ? <Spin size="small" /> : 'حذف'}
            </Button>
          </Flex>
        }
      >
        <Text>
          هل أنت متأكد من حذف النسخة الاحتياطية <strong>{delTarget?.name}</strong>؟
        </Text>
      </Modal>
    </div>
  )
}
