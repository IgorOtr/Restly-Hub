import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import {
  CurrentUser,
  Public,
  type HubAuthUser,
} from '../../common/decorators/auth.decorators';
import { AuthService, IssuedTokens, RequestMeta } from './auth.service';
import {
  DisableTwoFactorDto,
  LoginDto,
  LoginSecondFactorDto,
  RegisterAdminDto,
  TwoFactorCodeDto,
} from './dto/auth.dto';
import { TwoFactorService } from './two-factor.service';

const REFRESH_COOKIE = 'restly_hub_rt';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly twoFactor: TwoFactorService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get('setup-status')
  async setupStatus() {
    return { needsSetup: await this.auth.needsSetup() };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register-admin')
  async registerAdmin(
    @Body() dto: RegisterAdminDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respond(await this.auth.registerFirstUser(dto, meta(req)), res);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto, meta(req));
    // Com 2FA: devolve o desafio; a sessão só sai no segundo passo.
    if ('mfaRequired' in result) return result;
    return this.respond(result, res);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login/2fa')
  async loginSecondFactor(
    @Body() dto: LoginSecondFactorDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respond(
      await this.auth.loginSecondFactor(dto.mfaToken, dto.code, meta(req)),
      res,
    );
  }

  // ─────────────── Verificação em duas etapas (usuário logado) ───────────────

  @Get('2fa')
  twoFactorStatus(@CurrentUser() user: HubAuthUser) {
    return this.twoFactor.status(user.id);
  }

  @HttpCode(200)
  @Post('2fa/setup')
  twoFactorSetup(@CurrentUser() user: HubAuthUser) {
    return this.twoFactor.setup(user.id);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('2fa/enable')
  twoFactorEnable(
    @CurrentUser() user: HubAuthUser,
    @Body() dto: TwoFactorCodeDto,
  ) {
    return this.twoFactor.enable(user.id, dto.code);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(204)
  @Post('2fa/disable')
  async twoFactorDisable(
    @CurrentUser() user: HubAuthUser,
    @Body() dto: DisableTwoFactorDto,
  ) {
    await this.twoFactor.disable(user.id, dto.password, dto.code);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('2fa/recovery-codes')
  twoFactorRecoveryCodes(
    @CurrentUser() user: HubAuthUser,
    @Body() dto: TwoFactorCodeDto,
  ) {
    return this.twoFactor.regenerateRecoveryCodes(user.id, dto.code);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(200)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = (req.cookies as Record<string, string> | undefined)?.[
      REFRESH_COOKIE
    ];
    try {
      return this.respond(await this.auth.refresh(token, meta(req)), res);
    } catch (e) {
      res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
      throw e;
    }
  }

  @HttpCode(204)
  @Post('logout')
  async logout(
    @CurrentUser() user: HubAuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(user.sessionId);
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  @Get('me')
  me(@CurrentUser() user: HubAuthUser) {
    return { id: user.id, name: user.name, email: user.email };
  }

  private respond(tokens: IssuedTokens, res: Response) {
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...this.cookieOptions(),
      expires: tokens.refreshExpiresAt,
    });
    return { accessToken: tokens.accessToken };
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.config.get('COOKIE_SECURE') === 'true',
      path: '/api/auth',
    };
  }
}

const meta = (req: Request): RequestMeta => ({
  ip: req.ip?.replace(/^::ffff:/, ''),
  userAgent: req.headers['user-agent'],
});
