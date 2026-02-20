import path from "node:path";
import { Controller, Get, Param, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { generateCerts } from "generate-certs";
import { getClientIp } from "get-client-ip";
import { getCookie, setCookie } from "modern-cookies";

@Controller()
export class AppController {
  @Get("/")
  getRoot() {
    return "OK";
  }

  @Get("/ip")
  getIp(@Req() req: Request) {
    const ip = getClientIp(req as unknown as Parameters<typeof getClientIp>[0]);
    return { ip };
  }

  @Get("/cookie")
  setCookieRoute(@Req() _req: Request, @Res({ passthrough: true }) res: Response) {
    setCookie(res as unknown as Parameters<typeof setCookie>[0], "demo", "hello-nestjs", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 86400,
      path: "/",
    });
    return { message: "Cookie 'demo' set" };
  }

  @Get("/cookie/:name")
  getCookieRoute(@Req() req: Request, @Param("name") name: string) {
    const value = getCookie(req as unknown as Parameters<typeof getCookie>[0], name);
    return { name, value: value ?? null };
  }

  @Get("/certs")
  getCerts() {
    const certs = generateCerts({
      certsPath: path.resolve(__dirname, "..", "certs"),
    });
    return {
      message: "Certificates generated",
      certLength: certs.cert.length,
      keyLength: certs.key.length,
    };
  }
}
