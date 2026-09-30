import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from './password.service';
import type { LoginDto, RegisterAdminDto } from './dto/auth.dto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly passwords: PasswordService,
  ) {}

  async needsSetup() {
    return (await this.prisma.hubUser.count()) === 0;
  }

  /** Cria o primeiro operador do Hub. Só é permitido quando não há usuários. */
  async registerFirstUser(dto: RegisterAdminDto, meta: RequestMeta) {
    const passwordHash = await this.passwords.hash(dto.password);
    const user = await this.prisma.$transaction(
      async (tx) => {
        if ((await tx.hubUser.count()) > 0)
          throw new ConflictException('O Hub já possui um administrador');
        return tx.hubUser.create({
          data: { name: dto.name, email: dto.email, passwordHash },
        });
      },
      { isolationLevel: 'Serializable' },
    );
    return this.issueSession(user.id, meta);
  }

  async login(dto: LoginDto, meta: RequestMeta) {
    const user = await this.prisma.hubUser.findUnique({
      where: { email: dto.email },
    });
    const invalid = new UnauthorizedException('E-mail ou senha inválidos');
    if (!user) {
      // Mantém o tempo de resposta semelhante para não revelar e-mails válidos.
      await this.passwords.hash(dto.password);
      throw invalid;
    }
    if (user.lockedUntil && user.lockedUntil > new Date())
      throw new UnauthorizedException(
        'Conta temporariamente bloqueada por excesso de tentativas. Tente novamente mais tarde.',
      );

    if (!(await this.passwords.verify(user.passwordHash, dto.password))) {
      const attempts = user.failedLoginAttempts + 1;
      const lock = attempts >= MAX_FAILED_ATTEMPTS;
      await this.prisma.hubUser.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: lock ? 0 : attempts,
          lockedUntil: lock
            ? new Date(Date.now() + LOCK_MINUTES * 60_000)
            : null,
        },
      });
      throw invalid;
    }
    if (user.status !== 'ACTIVE')
      throw new UnauthorizedException('Usuário inativo');

    await this.prisma.hubUser.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });
    return this.issueSession(user.id, meta);
  }

  async refresh(refreshToken: string | undefined, meta: RequestMeta) {
    if (!refreshToken) throw new UnauthorizedException('Sessão expirada');
    const session = await this.prisma.hubSession.findUnique({
      where: { refreshTokenHash: sha256(refreshToken) },
      include: { user: { select: { status: true } } },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt < new Date() ||
      session.user.status !== 'ACTIVE'
    )
      throw new UnauthorizedException('Sessão expirada');

    // Rotação do refresh token a cada uso.
    const refresh = this.newRefreshToken();
    await this.prisma.hubSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: sha256(refresh.token),
        expiresAt: refresh.expiresAt,
        lastUsedAt: new Date(),
        ip: meta.ip,
        userAgent: meta.userAgent?.slice(0, 255),
      },
    });
    return {
      accessToken: await this.signAccess(session.userId, session.id),
      refreshToken: refresh.token,
      refreshExpiresAt: refresh.expiresAt,
    } satisfies IssuedTokens;
  }

  async logout(sessionId: string) {
    await this.prisma.hubSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueSession(
    userId: string,
    meta: RequestMeta,
  ): Promise<IssuedTokens> {
    const refresh = this.newRefreshToken();
    const session = await this.prisma.hubSession.create({
      data: {
        userId,
        refreshTokenHash: sha256(refresh.token),
        expiresAt: refresh.expiresAt,
        ip: meta.ip,
        userAgent: meta.userAgent?.slice(0, 255),
      },
    });
    return {
      accessToken: await this.signAccess(userId, session.id),
      refreshToken: refresh.token,
      refreshExpiresAt: refresh.expiresAt,
    };
  }

  private signAccess(userId: string, sessionId: string) {
    return this.jwt.signAsync({ sub: userId, sid: sessionId, typ: 'access' });
  }

  private newRefreshToken() {
    const days = Number(this.config.get('REFRESH_TOKEN_DAYS') ?? 7);
    return {
      token: randomBytes(48).toString('base64url'),
      expiresAt: new Date(Date.now() + days * 86_400_000),
    };
  }
}
