import { useState } from 'react'
import { Button, Modal, Tooltip } from 'antd'
import { CircleHelp } from 'lucide-react'

interface HelpButtonProps {
  title: string
  children: React.ReactNode
}

export default function HelpButton({ title, children }: HelpButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Tooltip title="دليل الاستخدام">
        <Button
          type="text"
          shape="circle"
          size="small"
          color="primary"
          variant="text"
          icon={<CircleHelp size={18} />}
          onClick={() => setOpen(true)}
        />
      </Tooltip>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        width={720}
        title={title}
        styles={{ header: { fontWeight: 700, fontSize: '1.1rem' } }}
        footer={[
          <Button key="ok" type="primary" size="small" onClick={() => setOpen(false)}>
            فهمت
          </Button>,
        ]}
      >
        {children}
      </Modal>
    </>
  )
}
