import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { getEnv } from "./config/env";

async function bootstrap() {
  const env = getEnv();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true }),
  );

  app.setGlobalPrefix("api/v1");
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.enableCors({
    origin: env.FRONTEND_URL.split(","),
    credentials: true,
  });
  app.enableShutdownHooks();

  await app.listen(env.PORT, "0.0.0.0");
  Logger.log(`API running on http://localhost:${env.PORT}/api/v1`, "Bootstrap");
}

bootstrap();
