import { useState, type ReactNode } from 'react'
import { Modal } from './Modal'
import { Button, type ButtonVariant } from './Button'
import { Field, Textarea } from './Field'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  variant?: ButtonVariant
  loading?: boolean
  /** Exige um motivo (ex.: cancelamentos). */
  requireReason?: boolean
  reasonLabel?: string
}

/** Confirmação para ações destrutivas/irreversíveis, com motivo opcional. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  variant = 'danger',
  loading,
  requireReason,
  reasonLabel = 'Motivo',
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('')
  const invalid = requireReason && reason.trim().length < 3

  const close = () => {
    setReason('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={loading}>
            Voltar
          </Button>
          <Button variant={variant} loading={loading} disabled={invalid} onClick={() => onConfirm(reason.trim())}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description && <div className="text-sm text-muted">{description}</div>}
      {requireReason && (
        <Field label={reasonLabel} required className="mt-4">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} autoFocus placeholder="Descreva o motivo" />
        </Field>
      )}
    </Modal>
  )
}
