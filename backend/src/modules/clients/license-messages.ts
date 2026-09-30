import type { LicenseStatus } from '#prisma-client';

/** Motivos padronizados (os mesmos códigos que a instalação sabe rotular). */
export const LICENSE_REASONS = [
  'PAYMENT_OVERDUE',
  'CONTRACT_ENDED',
  'MAINTENANCE',
  'TRIAL_ENDED',
  'OTHER',
] as const;
export type LicenseReason = (typeof LICENSE_REASONS)[number];

const DEFAULTS: Partial<
  Record<LicenseStatus, Partial<Record<LicenseReason, string>>>
> = {
  WARNING: {
    PAYMENT_OVERDUE:
      'Identificamos uma pendência no pagamento da sua mensalidade. Regularize para evitar o bloqueio do sistema.',
    CONTRACT_ENDED:
      'Seu contrato está próximo do encerramento. Entre em contato para renovar.',
    MAINTENANCE:
      'Uma manutenção programada está agendada. O sistema poderá ficar indisponível por um curto período.',
    TRIAL_ENDED:
      'Seu período de teste está terminando. Entre em contato para continuar usando o sistema.',
  },
  BLOCKED: {
    PAYMENT_OVERDUE:
      'O sistema foi bloqueado por falta de pagamento. Regularize a mensalidade para restabelecer o acesso.',
    CONTRACT_ENDED:
      'O contrato foi encerrado e o acesso ao sistema está suspenso.',
    MAINTENANCE: 'O sistema está em manutenção e voltará em breve.',
    TRIAL_ENDED:
      'O período de teste terminou. Entre em contato para contratar o sistema.',
  },
};

/** Mensagem exibida ao cliente quando o operador não escreve uma personalizada. */
export function defaultLicenseMessage(
  status: LicenseStatus,
  reason?: string | null,
) {
  return DEFAULTS[status]?.[reason as LicenseReason] ?? null;
}
