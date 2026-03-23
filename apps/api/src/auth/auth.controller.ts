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
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() req: any, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.validateUser(req.email, req.password);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const result = await this.authService.login(user);

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
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return { success: true, user: result.user };
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
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return { user: result.user };
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
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return { user: result.user };
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
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Request() req: any,
    @Body() body: { password: string },
  ) {
    return this.authService.changePassword(req.user.sub, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: any) {
    return req.user;
  }
}
