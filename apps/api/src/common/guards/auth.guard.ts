import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jose from 'jose';
import { eq } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import { users } from '../../database/drizzle/schema';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  private userCache = new Map<string, { user: any; expiresAt: number }>();

  constructor(
    @Inject(DATABASE) private readonly db: any,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Missing authentication token');

    try {
      const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
      const { payload } = await jose.jwtVerify(token, secret, {
        audience: 'authenticated',
        algorithms: ['HS256'],
      });

      const userId = payload.sub;
      if (!userId)
        throw new UnauthorizedException('Invalid token: no subject');

      const user = await this.getUser(userId);
      if (!user) throw new UnauthorizedException('User not found');
      if (user.isBlocked)
        throw new ForbiddenException(
          'Your account has been suspended. Please contact support.',
        );

      request.user = user;
      return true;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      )
        throw error;
      throw new UnauthorizedException('Invalid authentication token');
    }
  }

  private extractToken(request: any): string | null {
    const auth = request.headers?.authorization;
    if (!auth) return null;
    const [type, token] = auth.split(' ');
    return type === 'Bearer' ? token : null;
  }

  private async getUser(userId: string) {
    const cached = this.userCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) return cached.user;

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user) {
      this.userCache.set(userId, {
        user,
        expiresAt: Date.now() + 60_000,
      });
    }

    return user ?? null;
  }
}
