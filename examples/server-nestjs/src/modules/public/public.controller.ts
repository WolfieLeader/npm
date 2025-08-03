import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { getClientIp } from 'get-client-ip';

@Controller('')
export class PublicController {
  @Get('')
  getHello(): { message: string } {
    return { message: 'Hello World' };
  }

  @Get('health')
  getHealth(): string {
    return 'OK';
  }

  @Get('ip')
  getIp(@Req() req: Request) {
    const ip = getClientIp(req);
    return { ip };
  }
}
