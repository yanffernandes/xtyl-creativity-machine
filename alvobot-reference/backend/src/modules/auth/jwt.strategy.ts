import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      // Support both Authorization header and query param (for SSE/EventSource)
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request) => request.query?.token as string | null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("SUPABASE_JWT_SECRET"),
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub, // Map 'sub' to 'id' for consistency
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
