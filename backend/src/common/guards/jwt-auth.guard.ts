import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY, type HubAuthUser } from '../decorators/auth.decorators';

export function extractBearer(req: Request): string | undefined {
  const [type, token] = req.headers.authorization?.split(' ') ?? [];
  return type === 'Bearer' ? token : undefined;
}

/** Exige sessão válida de um operador do Hub em todas as rotas não públicas. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx
      .switchToHttp()
      .getRequest<Request & { user?: HubAuthUser }>();
    const token = extractBearer(req);
    if (!token) throw new UnauthorizedException('Não autenticado');

    let payload: { sub: string; sid: string; typ: string };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
    if (payload.typ !== 'access') throw new UnauthorizedException();

    const session = await this.prisma.hubSession.findUnique({
      where: { id: payload.sid },
      select: {
        revokedAt: true,
        expiresAt: true,
        user: { select: { id: true, name: true, email: true, status: true } },
      },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt < new Date() ||
      session.user.id !== payload.sub ||
      session.user.status !== 'ACTIVE'
    )
      throw new UnauthorizedException('Sessão encerrada');

    req.user = {
      id: session.user.id,
      sessionId: payload.sid,
      name: session.user.name,
      email: session.user.email,
    };
    return true;
  }
}
