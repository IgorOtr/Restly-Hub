/**
 * Valida as variáveis de ambiente na inicialização. Em produção, recusa subir
 * com segredos ausentes, curtos, repetidos ou com os valores de exemplo.
 */
const SECRETS = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const;
const WEAK = /change-me|dev-|secret|123456|password/i;

export function validateEnv(env: Record<string, unknown>) {
  const errors: string[] = [];
  const production = env.NODE_ENV === 'production';

  if (!env.DATABASE_URL) errors.push('DATABASE_URL é obrigatória');
  for (const key of SECRETS) {
    const raw = env[key];
    const value = typeof raw === 'string' ? raw : '';
    if (!value) errors.push(`${key} é obrigatória`);
    else if (production && (value.length < 32 || WEAK.test(value)))
      errors.push(
        `${key} deve ter ao menos 32 caracteres aleatórios em produção`,
      );
  }
  if (production && env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET)
    errors.push('Os segredos JWT devem ser diferentes entre si');
  const totpKey =
    typeof env.TOTP_ENCRYPTION_KEY === 'string' ? env.TOTP_ENCRYPTION_KEY : '';
  if (production && (totpKey.length < 32 || WEAK.test(totpKey)))
    errors.push(
      'TOTP_ENCRYPTION_KEY deve ter ao menos 32 caracteres aleatórios em produção',
    );
  if (production && env.COOKIE_SECURE !== 'true')
    errors.push('COOKIE_SECURE=true é obrigatório em produção (HTTPS)');

  if (errors.length)
    throw new Error(`Configuração inválida:\n- ${errors.join('\n- ')}`);
  return env;
}
