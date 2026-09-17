import { Body, Controller, Post } from "@nestjs/common";
import { NewsletterService } from "./newsletter.service";
import { SubscribeSchema, type SubscribeDto } from "./dto/newsletter.dto";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";

@Controller("newsletter")
export class NewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Post("subscribe")
  subscribe(@Body(new ZodValidationPipe(SubscribeSchema)) dto: SubscribeDto) {
    return this.newsletter.subscribe(dto);
  }
}
