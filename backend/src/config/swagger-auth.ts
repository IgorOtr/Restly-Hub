import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Autenticação HTTP Basic para a documentação da API (Swagger). */
export function swaggerBasicAuth(user: string, password: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const [scheme, encoded] = (req.headers.authorization ?? '').split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = Buffer.from(encoded, 'base64').toString();
      const sep = decoded.indexOf(':');
      if (
        sep > 0 &&
        safeEqual(decoded.slice(0, sep), user) &&
        safeEqual(decoded.slice(sep + 1), password)
      )
        return next();
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="Restly API docs"');
    res.status(401).send('Autenticação necessária');
  };
}
