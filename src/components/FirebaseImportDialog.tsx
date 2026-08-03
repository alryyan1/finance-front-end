import { useEffect, useState } from 'react'
import {
  Alert, Button, Flex, Modal, Progress, Spin, Tag, Tooltip, Typography,
} from 'antd'
import { CheckCircle2, CloudDownload, Trash2 } from 'lucide-react'
import {
  fetchPendingEntries, fetchDoctorMappings, markAsImported, toJournalPayload, deleteEntry,
  type FirebaseJournalEntry,
} from '@/lib/firebaseImport'
import { journalApi } from '@/api/journal'
import { pettyCashSettingsApi } from '@/api/settings'
import { useToast } from '@/lib/toast'

const { Text } = Typography

interface Props {
  open:    boolean
  onClose: () => void
  onDone:  () => void   // refresh parent list after import
}

export default function FirebaseImportDialog({ open, onClose, onDone }: Props) {
  const toast = useToast()
  const [loading,        setLoading]        = useState(false)
  const [entries,        setEntries]        = useState<FirebaseJournalEntry[]>([])
  const [doctorMappings, setDoctorMappings] = useState<Record<string, string>>({})

  const [importing, setImporting] = useState(false)
  const [progress,  setProgress]  = useState(0)        // 0-100
  const [done,      setDone]      = useState(false)
  const [failed,    setFailed]    = useState<string[]>([])
  const [deleting,  setDeleting]  = useState<string | null>(null)  // firebaseId being deleted

  // Firestore tenant collection journal entries are imported from — falls back to
  // the same default ("jawda") the backend uses when the setting hasn't been configured.
  const [storageName, setStorageName] = useState<string | null>(null)

  // Load pending entries whenever dialog opens
  useEffect(() => {
    if (!open) return
    setLoading(true); setDone(false); setFailed([])
    pettyCashSettingsApi.get()
      .then(s => {
        const name = s.firebase_collection_name || 'jawda'
        setStorageName(name)
        return Promise.all([fetchPendingEntries(name), fetchDoctorMappings(name)])
      })
      .then(([e, m]) => { setEntries(e); setDoctorMappings(m) })
      .catch(e => toast.error((e as Error).message ?? 'فشل التحميل'))
      .finally(() => setLoading(false))
  }, [open])

  const handleImportAll = async () => {
    if (!storageName) return
    setImporting(true); setProgress(0); setFailed([])
    const errors: string[] = []

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      try {
        const payload = toJournalPayload(entry, doctorMappings)
        // Skip lines where account_id couldn't be resolved
        const validLines = payload.lines.filter(l => l.account_id != null)
        if (validLines.length < 2) {
          errors.push(`${entry.description} — أسطر غير كافية (حسابات غير قابلة للتحويل)`)
        } else {
          await journalApi.create({ ...payload, lines: validLines as any })
          await markAsImported(entry.firebaseId, storageName)
        }
      } catch (e) {
        errors.push(`${entry.description} — ${(e as Error).message}`)
      }
      setProgress(Math.round(((i + 1) / entries.length) * 100))
    }

    setFailed(errors)
    setDone(true)
    setImporting(false)
    if (errors.length === 0) onDone()
  }

  const handleDelete = async (entry: FirebaseJournalEntry) => {
    if (!storageName) return
    if (!window.confirm(`حذف "${entry.description}" من Firebase نهائياً؟`)) return
    setDeleting(entry.firebaseId)
    try {
      await deleteEntry(entry.firebaseId, storageName)
      setEntries(prev => prev.filter(e => e.firebaseId !== entry.firebaseId))
    } catch (e) {
      toast.error((e as Error).message ?? 'فشل الحذف')
    } finally {
      setDeleting(null)
    }
  }

  const handleDeleteAll = async () => {
    if (!storageName) return
    if (!window.confirm(`حذف جميع القيود (${entries.length}) من Firebase نهائياً؟`)) return
    setDeleting('__all__')
    try {
      await Promise.all(entries.map(e => deleteEntry(e.firebaseId, storageName)))
      setEntries([])
    } catch (e) {
      toast.error((e as Error).message ?? 'فشل الحذف')
    } finally {
      setDeleting(null)
    }
  }

  const handleClose = () => {
    if (importing) return
    setEntries([]); setDone(false); setFailed([])
    onClose()
  }

  const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
  const entryTotal = (e: FirebaseJournalEntry) =>
    e.lines.reduce((s, l) => s + l.debit, 0)

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      width={720}
      title={
        <Flex align="center" gap={8}>
          <CloudDownload size={18} color="var(--ant-color-primary)" />
          استيراد القيود من Firebase
        </Flex>
      }
      footer={
        <Flex justify="flex-end" gap={8}>
          <Button onClick={handleClose} disabled={importing}>
            {done ? 'إغلاق' : 'إلغاء'}
          </Button>
          {!done && entries.length > 0 && (
            <>
              <Button
                danger
                disabled={loading || importing || deleting !== null}
                onClick={handleDeleteAll}
                icon={deleting === '__all__' ? <Spin size="small" /> : <Trash2 size={16} />}
              >
                حذف الكل
              </Button>
              <Button
                type="primary"
                disabled={loading || importing || deleting !== null || entries.length === 0}
                onClick={handleImportAll}
                icon={importing ? <Spin size="small" /> : <CloudDownload size={16} />}
              >
                {importing ? 'جاري الاستيراد...' : `استيراد ${entries.length} قيد`}
              </Button>
            </>
          )}
        </Flex>
      }
    >
      {/* Centered import progress overlay */}
      {importing && (
        <Flex
          vertical align="center" justify="center" gap={16}
          style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(0,0,0,0.65)',
          }}
        >
          <Progress type="circle" percent={progress} size={64} strokeColor="white" trailColor="rgba(255,255,255,0.3)" />
          <Text style={{ color: 'white', fontWeight: 600, fontSize: 16 }}>
            جاري الاستيراد... {progress}%
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)' }}>
            يرجى الانتظار، لا تغلق النافذة
          </Text>
        </Flex>
      )}

      {loading && (
        <Flex justify="center" style={{ padding: '32px 0' }}>
          <Spin />
        </Flex>
      )}

      {!loading && !done && (
        <>
          {entries.length === 0 ? (
            <Alert type="success" message="لا توجد قيود معلّقة — كل شيء محدَّث." showIcon />
          ) : (
            <Flex vertical gap={8}>
              <Text type="secondary" style={{ marginBottom: 4 }}>
                {entries.length} قيد في Firebase جاهز للاستيراد إلى نظام المحاسبة:
              </Text>

              {entries.map(e => (
                <div key={e.firebaseId} style={{ padding: 12, border: '1px solid var(--ant-color-border-secondary)', borderRadius: 6 }}>
                  <Flex justify="space-between" align="center">
                    <Text style={{ fontWeight: 600 }}>{e.description}</Text>
                    <Flex align="center" gap={8}>
                      <Tag color="blue">{fmt(entryTotal(e))}</Tag>
                      <Tooltip title="حذف من Firebase">
                        <Button
                          type="text"
                          danger
                          size="small"
                          shape="circle"
                          disabled={importing || deleting !== null}
                          onClick={() => handleDelete(e)}
                          icon={deleting === e.firebaseId ? <Spin size="small" /> : <Trash2 size={15} />}
                        />
                      </Tooltip>
                    </Flex>
                  </Flex>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {e.date} · {e.lines.length} سطر
                    {e.reference ? ` · ${e.reference}` : ''}
                  </Text>
                </div>
              ))}
            </Flex>
          )}
        </>
      )}

      {done && (
        <Flex vertical gap={12} style={{ marginTop: 4 }}>
          <Flex align="center" gap={8}>
            <CheckCircle2 size={18} color="var(--ant-color-success)" />
            <Text style={{ color: 'var(--ant-color-success)', fontWeight: 600 }}>
              {entries.length - failed.length} قيد تم استيراده بنجاح
            </Text>
          </Flex>
          {failed.length > 0 && (
            <Alert
              type="warning"
              message={`${failed.length} قيد فشل:`}
              description={
                <Flex vertical>
                  {failed.map((msg, i) => (
                    <Text key={i} style={{ fontSize: 12 }}>• {msg}</Text>
                  ))}
                </Flex>
              }
            />
          )}
        </Flex>
      )}
    </Modal>
  )
}
