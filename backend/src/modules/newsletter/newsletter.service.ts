import { Injectable, Logger } from "@nestjs/common";
import type { SubscribeDto } from "./dto/newsletter.dto";

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  async subscribe(dto: SubscribeDto) {
    // Persist to newsletter table when you add one. For now: log.\n    
    this.logger.log(`Newsletter subscription: ${dto.email}`);
    return { ok: true };
  }
}
