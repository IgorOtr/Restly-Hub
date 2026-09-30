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
import { LoginDto, RegisterAdminDto } from './dto/auth.dto';

const REFRESH_COOKIE = 'restly_hub_rt';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
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
    return this.respond(await this.auth.login(dto, meta(req)), res);
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
