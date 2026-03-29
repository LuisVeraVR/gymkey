import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { generateSecret, generateURI, verify } from 'otplib';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(email);
    // For demo/seed compatibility where I used 'hashed_' prefix
    if (
      user &&
      ((await bcrypt.compare(pass, user.password)) ||
        user.password === `hashed_${pass}`)
    ) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const tempPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      isTemp: true,
      tenantId: user.tenantId,
    };

    // Check Password Change Requirement
    if (user.mustChangePassword) {
      return {
        passwordChangeRequired: true,
        tempToken: this.jwtService.sign(tempPayload, { expiresIn: '15m' }),
        user: { id: user.id, email: user.email, role: user.role },
      };
    }

    // Check MFA status
    if (user.mfaEnabled) {
      return {
        mfaRequired: true,
        tempToken: this.jwtService.sign(tempPayload, { expiresIn: '5m' }),
        user: { id: user.id, email: user.email, role: user.role },
      };
    }

    // If MFA is not enabled, check skip count
    if ((user.mfaSkipCount || 0) >= 3) {
      return {
        mfaSetupRequired: true,
        tempToken: this.jwtService.sign(tempPayload, { expiresIn: '15m' }),
        user: { id: user.id, email: user.email, role: user.role },
      };
    }

    // Suggest MFA but allow skipping (still return temp token so they MUST call skip endpoint)
    return {
      mfaSetupSuggested: true,
      tempToken: this.jwtService.sign(tempPayload, { expiresIn: '15m' }),
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  async changePassword(userId: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    // Cast to any because TS might not know about mustChangePassword yet in the update input type
    await this.usersService.update(userId, {
      password: hashedPassword,
      mustChangePassword: false,
    } as any);

    const user = await this.usersService.findById(userId);
    return this.login(user);
  }

  async generateMfaSecret(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const secret = generateSecret();
    const otpauthUrl = generateURI({
      secret,
      label: user.email,
      issuer: 'GymKey',
    });

    // Cast to any to avoid type errors until server restarts
    await this.usersService.update(userId, { mfaSecret: secret } as any);

    return {
      secret,
      otpauthUrl,
    };
  }

  async verifyMfaToken(userId: string, token: string) {
    const user = await this.usersService.findById(userId);
    // Cast to any to avoid type errors
    if (!user || !(user as any).mfaSecret) {
      console.log('MFA Verification failed: No secret found for user', userId);
      throw new UnauthorizedException('MFA not initialized');
    }

    // Check if token is valid with a window of 1 (allows +/- 30 seconds drift)
    // verify returns a Promise<{ valid: boolean }> or similar in this version of otplib
    const result: any = await verify({
      token,
      secret: (user as any).mfaSecret,
      window: 1,
    } as any);

    // Handle both boolean and object return types
    const isValid = typeof result === 'object' ? result?.valid : result;

    if (!isValid) {
      console.log(
        'MFA Verification failed for user',
        userId,
        'Token:',
        token,
        'Secret:',
        (user as any).mfaSecret,
      );
    }

    return isValid;
  }

  async enableMfa(userId: string) {
    await this.usersService.update(userId, { mfaEnabled: true } as any);
  }

  async skipMfa(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    await this.usersService.update(userId, {
      mfaSkipCount: ((user as any).mfaSkipCount || 0) + 1,
    } as any);
  }

  async loginWithMfa(user: { id: string; email?: string; role?: string; tenantId?: string | null }) {
    const full = await this.usersService.findById(user.id);
    if (!full) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    const displayName = full.name?.trim() || full.email;
    const payload = {
      email: full.email,
      sub: full.id,
      role: full.role,
      tenantId: full.tenantId,
      name: displayName,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: full.id,
        email: full.email,
        role: full.role,
        tenantId: full.tenantId,
        name: displayName,
      },
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findOne(email);
    if (!user) {
      // Don't reveal if user exists
      return { message: 'If the email exists, instructions have been sent.' };
    }

    // In a real app, generate a reset token and send email
    // For now, we'll just return success
    return { message: 'If the email exists, instructions have been sent.' };
  }
}
