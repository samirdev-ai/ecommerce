import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { FastifyRequest } from "fastify";

@Injectable()
export class OptionalJwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return true;
    try {
      const payload = await this.jwt.verifyAsync(header.slice(7));
      (req as FastifyRequest & { user: unknown }).user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    } catch { /* ignore */ }
    return true;
  }
}
