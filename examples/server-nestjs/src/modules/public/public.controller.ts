import { Controller, Get } from '@nestjs/common';

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
}
