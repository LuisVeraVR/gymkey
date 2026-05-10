import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  BadRequestException,
  Get,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/change-password.dto';

const authTokenCookie = {
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('login')
  async login(@Body() req: any, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.validateUser(req.email, req.password);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const result = await this.authService.login(user);

    if (
      result &&
      typeof result === 'object' &&
      'access_token' in result &&
      typeof (result as { access_token?: unknown }).access_token === 'string'
    ) {
      res.cookie('token', (result as { access_token: string }).access_token, {
        ...authTokenCookie,
        maxAge: 24 * 60 * 60 * 1000,
      });
    }

    // Always return the result (which contains tempToken and flags)
    // The frontend must handle the flow (verify, skip, or enable)
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/generate')
  async generateMfa(@Request() req: any) {
    return this.authService.generateMfaSecret(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/enable')
  async enableMfa(
    @Request() req: any,
    @Body() body: { token: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const isValid = await this.authService.verifyMfaToken(
      req.user.sub,
      body.token,
    );
    if (!isValid) {
      throw new BadRequestException('Invalid MFA token');
    }
    await this.authService.enableMfa(req.user.sub);

    // Issue full token
    const user = {
      id: req.user.sub,
      email: req.user.email,
      role: req.user.role,
      tenantId: req.user.tenantId,
    };
    const result = await this.authService.loginWithMfa(user);

    res.cookie('token', result.access_token, {
      ...authTokenCookie,
      maxAge: 24 * 60 * 60 * 1000,
    });

    return {
      success: true,
      user: result.user,
      access_token: result.access_token,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/verify-login')
  async verifyMfaLogin(
    @Request() req: any,
    @Body() body: { token: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const isValid = await this.authService.verifyMfaToken(
      req.user.sub,
      body.token,
    );
    if (!isValid) {
      throw new BadRequestException('Invalid MFA token');
    }

    const user = {
      id: req.user.sub,
      email: req.user.email,
      role: req.user.role,
      tenantId: req.user.tenantId,
    };
    const result = await this.authService.loginWithMfa(user);

    res.cookie('token', result.access_token, {
      ...authTokenCookie,
      maxAge: 24 * 60 * 60 * 1000,
    });

    return { user: result.user, access_token: result.access_token };
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/skip')
  async skipMfa(
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.skipMfa(req.user.sub);

    const user = {
      id: req.user.sub,
      email: req.user.email,
      role: req.user.role,
      tenantId: req.user.tenantId,
    };
    const result = await this.authService.loginWithMfa(user);

    res.cookie('token', result.access_token, {
      ...authTokenCookie,
      maxAge: 24 * 60 * 60 * 1000,
    });

    return { user: result.user, access_token: result.access_token };
  }

  @Post('admin/login')
  async adminLogin(
    @Body() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(req.email, req.password);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const allowedRoles = [
      UserRole.SUPER_ADMIN,
      UserRole.GYM_ADMIN,
      UserRole.STAFF,
      UserRole.COACH,
    ];
    if (!allowedRoles.includes(user.role)) {
      throw new UnauthorizedException(
        'No tienes permisos para acceder al panel administrativo',
      );
    }

    const result = await this.authService.login(user);

    if (
      result &&
      typeof result === 'object' &&
      'access_token' in result &&
      typeof (result as { access_token?: unknown }).access_token === 'string'
    ) {
      res.cookie('token', (result as { access_token: string }).access_token, {
        ...authTokenCookie,
        maxAge: 24 * 60 * 60 * 1000,
      });
    }

    // Admin login also follows the same flow (check for temp token or full token)
    return result;
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.cookie('token', '', {
      ...authTokenCookie,
      maxAge: 0,
    });
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Request() req: any,
    @Body() body: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.sub, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: { user: { sub: string } }) {
    const user = await this.usersService.findById(req.user.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    const { password, mfaSecret, ...rest } = user;
    const displayName = rest.name?.trim() || rest.email;
    return { ...rest, name: displayName };
  }
}
