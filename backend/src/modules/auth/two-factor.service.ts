import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import type { HubUser } from '#prisma-client';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from './password.service';
import { generateSecret, otpauthUri, verifyTotp } from './totp';

const ISSUER = 'Restly Hub';
const RECOVERY_CODES = 10;

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const normalizeRecovery = (v: string) =>
  v.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Verificação em duas etapas (TOTP) dos operadores do Hub. O segredo fica
 * criptografado no banco (AES-256-GCM); os códigos de recuperação são
 * guardados apenas como hash e valem uma única vez.
 */
@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger('TwoFactor');
  private readonly key: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    config: ConfigService,
  ) {
    const dedicated = config.get<string>('TOTP_ENCRYPTION_KEY');
    // Sem chave própria, deriva uma do segredo de refresh (trocá-lo invalida a 2FA).
    const material =
      dedicated || config.getOrThrow<string>('JWT_REFRESH_SECRET');
    if (!dedicated)
      this.logger.warn(
        'TOTP_ENCRYPTION_KEY não definida: usando chave derivada de JWT_REFRESH_SECRET',
      );
    this.key = Buffer.from(
      hkdfSync('sha256', material, 'restly-hub', 'totp-secret', 32),
    );
  }

  // ─────────────── Criptografia do segredo ───────────────

  private encrypt(plain: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), data]
      .map((b) => b.toString('base64url'))
      .join('.');
  }

  private decrypt(payload: string) {
    const [iv, tag, data] = payload
      .split('.')
      .map((p) => Buffer.from(p, 'base64url'));
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      'utf8',
    );
  }

  // ─────────────── Ativação / desativação ───────────────

  /** Gera um segredo pendente e devolve o QR Code (URI) para o app autenticador. */
  async setup(userId: string) {
    const user = await this.prisma.hubUser.findUniqueOrThrow({
      where: { id: userId },
    });
    if (user.totpEnabledAt)
      throw new ConflictException('A verificação em duas etapas já está ativa');
    const secret = generateSecret();
    await this.prisma.hubUser.update({
      where: { id: userId },
      data: { totpPendingSecret: this.encrypt(secret) },
    });
    return { secret, otpauthUrl: otpauthUri(secret, user.email, ISSUER) };
  }

  /** Confirma o primeiro código do app e ativa; devolve os códigos de recuperação (uma única vez). */
  async enable(userId: string, code: string) {
    const user = await this.prisma.hubUser.findUniqueOrThrow({
      where: { id: userId },
    });
    if (user.totpEnabledAt)
      throw new ConflictException('A verificação em duas etapas já está ativa');
    if (!user.totpPendingSecret)
      throw new BadRequestException('Inicie a configuração novamente');
    const step = verifyTotp(this.decrypt(user.totpPendingSecret), code);
    if (step === null)
      throw new BadRequestException(
        'Código inválido. Confira o horário do celular e tente de novo.',
      );
    const recovery = this.newRecoveryCodes();
    await this.prisma.hubUser.update({
      where: { id: userId },
      data: {
        totpSecret: user.totpPendingSecret,
        totpPendingSecret: null,
        totpEnabledAt: new Date(),
        totpLastStep: step,
        recoveryCodes: recovery.hashes,
      },
    });
    this.logger.log(`2FA ativada para ${user.email}`);
    return { recoveryCodes: recovery.codes };
  }

  /** Desativar exige a senha e um código válido (do app ou de recuperação). */
  async disable(userId: string, password: string, code: string) {
    const user = await this.prisma.hubUser.findUniqueOrThrow({
      where: { id: userId },
    });
    if (!user.totpEnabledAt)
      throw new ConflictException(
        'A verificação em duas etapas não está ativa',
      );
    if (!(await this.passwords.verify(user.passwordHash, password)))
      throw new BadRequestException('Senha incorreta');
    if (!(await this.verify(user, code)))
      throw new BadRequestException('Código inválido');
    await this.prisma.hubUser.update({
      where: { id: userId },
      data: {
        totpSecret: null,
        totpPendingSecret: null,
        totpEnabledAt: null,
        totpLastStep: null,
        recoveryCodes: [],
      },
    });
    this.logger.warn(`2FA desativada para ${user.email}`);
  }

  /** Gera novos códigos de recuperação (os anteriores deixam de valer). */
  async regenerateRecoveryCodes(userId: string, code: string) {
    const user = await this.prisma.hubUser.findUniqueOrThrow({
      where: { id: userId },
    });
    if (!user.totpEnabledAt)
      throw new ConflictException(
        'A verificação em duas etapas não está ativa',
      );
    if (!(await this.verify(user, code, { totpOnly: true })))
      throw new BadRequestException('Código inválido');
    const recovery = this.newRecoveryCodes();
    await this.prisma.hubUser.update({
      where: { id: userId },
      data: { recoveryCodes: recovery.hashes },
    });
    return { recoveryCodes: recovery.codes };
  }

  async status(userId: string) {
    const user = await this.prisma.hubUser.findUniqueOrThrow({
      where: { id: userId },
      select: { totpEnabledAt: true, recoveryCodes: true },
    });
    return {
      enabled: Boolean(user.totpEnabledAt),
      enabledAt: user.totpEnabledAt,
      recoveryCodesLeft: Array.isArray(user.recoveryCodes)
        ? user.recoveryCodes.length
        : 0,
    };
  }

  // ─────────────── Verificação (login e ações sensíveis) ───────────────

  /**
   * Valida um código do app (sem reutilizar o mesmo intervalo) ou um código de
   * recuperação (consumido). Atualizações são condicionais para evitar corrida.
   */
  async verify(user: HubUser, code: string, opts: { totpOnly?: boolean } = {}) {
    if (!user.totpSecret) return false;
    const clean = code.trim();
    if (/^\d{6}$/.test(clean.replace(/\s/g, ''))) {
      const step = verifyTotp(this.decrypt(user.totpSecret), clean);
      if (
        step === null ||
        (user.totpLastStep !== null && step <= user.totpLastStep)
      )
        return false;
      const res = await this.prisma.hubUser.updateMany({
        where: {
          id: user.id,
          OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }],
        },
        data: { totpLastStep: step },
      });
      return res.count === 1;
    }
    if (opts.totpOnly) return false;

    const hashes = Array.isArray(user.recoveryCodes)
      ? (user.recoveryCodes as string[])
      : [];
    const candidate = Buffer.from(sha256(normalizeRecovery(clean)));
    const match = hashes.find((h) => {
      const b = Buffer.from(h);
      return b.length === candidate.length && timingSafeEqual(b, candidate);
    });
    if (!match) return false;
    const remaining = hashes.filter((h) => h !== match);
    // Condicional ao conjunto atual: o mesmo código não é aceito duas vezes em paralelo.
    const res = await this.prisma.$executeRaw`
      UPDATE HubUser SET recoveryCodes = ${JSON.stringify(remaining)}
      WHERE id = ${user.id} AND JSON_CONTAINS(recoveryCodes, ${JSON.stringify(match)})`;
    if (res === 1)
      this.logger.warn(
        `Código de recuperação usado por ${user.email} (${remaining.length} restantes)`,
      );
    return res === 1;
  }

  private newRecoveryCodes() {
    const codes = Array.from({ length: RECOVERY_CODES }, () => {
      const raw = randomBytes(5).toString('hex'); // 10 caracteres
      return `${raw.slice(0, 5)}-${raw.slice(5)}`;
    });
    return { codes, hashes: codes.map((c) => sha256(normalizeRecovery(c))) };
  }
}
