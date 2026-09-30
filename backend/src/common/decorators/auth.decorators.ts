import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';

export interface HubAuthUser {
  id: string;
  sessionId: string;
  name: string;
  email: string;
}

export const IS_PUBLIC_KEY = 'isPublic';
/** Rota sem login (autenticação e endpoint consultado pelas instalações). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): HubAuthUser =>
    ctx.switchToHttp().getRequest<{ user: HubAuthUser }>().user,
);

export const ClientIp = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | undefined =>
    ctx
      .switchToHttp()
      .getRequest<{ ip?: string }>()
      .ip?.replace(/^::ffff:/, ''),
);
