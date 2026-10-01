import { useState, type ReactNode } from 'react'
import { Modal } from './Modal'
import { Button, type ButtonVariant } from './Button'
import { Field, Input, Textarea } from './Field'

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
  /** Exige digitar exatamente este texto para confirmar (ações críticas). */
  confirmText?: string
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
  confirmText,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('')
  const [typed, setTyped] = useState('')
  const invalid = (requireReason && reason.trim().length < 3) || (confirmText !== undefined && typed.trim() !== confirmText)

  const close = () => {
    setReason('')
    setTyped('')
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
      {confirmText !== undefined && (
        <Field label={`Digite "${confirmText}" para confirmar`} className="mt-4">
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus autoComplete="off" />
        </Field>
      )}
      {requireReason && (
        <Field label={reasonLabel} required className="mt-4">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} autoFocus placeholder="Descreva o motivo" />
        </Field>
      )}
    </Modal>
  )
}
