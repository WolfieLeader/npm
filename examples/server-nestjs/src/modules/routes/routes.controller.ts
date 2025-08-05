import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { getClientIp } from 'get-client-ip';
import { getCookie, setCookie } from 'modern-cookies';

@Controller('')
export class RoutesController {
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

  @Get('cookie')
  getCookies(@Req() req: Request) {
    const cookie1 = getCookie(req, 'cookie1');
    const cookie2 = getCookie(req, 'cookie2');
    const cookie3 = getCookie(req, 'cookie3');
    return { cookie1, cookie2, cookie3 };
  }

  @Get('set-cookie')
  setCookie(@Res() res: Response) {
    setCookie(res, 'cookie1', 'SomeValue123', { httpOnly: true, maxAge: 60 }, true);
    res.status(200).json({ message: 'Cookie set' });
  }

  @Get('set-cookies')
  setCookies(@Res() res: Response) {
    setCookie(res, 'cookie2', 'anotherValue', { httpOnly: true, maxAge: 60 });
    setCookie(res, 'cookie3', 'yetAnotherValue', { httpOnly: true, maxAge: 60 });
    res.status(200).json({ message: 'Another cookie set' });
  }

  @Get('delete-cookie')
  deleteCookie(@Res() res: Response) {
    setCookie(res, 'cookie1', '', { httpOnly: true, maxAge: -1 });
    setCookie(res, 'cookie2', '', { httpOnly: true, maxAge: -1 });
    res.status(200).json({ message: 'Cookie cleared' });
  }
}
