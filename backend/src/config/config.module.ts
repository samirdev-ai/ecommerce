import { Global, Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import { getEnv } from "./env";

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate: () => getEnv(),
      envFilePath: [".env.local", ".env"],
    }),
  ],
})
export class ConfigModule {}
