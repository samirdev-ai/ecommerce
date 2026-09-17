import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const payload = typeof body === "string" ? { message: body } : (body as object);
      reply.status(status).send({ error: true, ...payload });
      return;
    }
    this.logger.error(exception);
    reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      error: true,
      message: "Internal server error",
    });
  }
}
