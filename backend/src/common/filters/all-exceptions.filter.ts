import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '#prisma-client';

function isClientError(e: unknown): e is { status: number } {
  const status = (e as { status?: unknown } | null)?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}

/** Tratamento centralizado: padroniza o corpo de erro e mapeia erros do Prisma. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Erro interno do servidor';
    let code: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') message = body;
      else {
        const b = body as { message?: string | string[]; code?: string };
        message = b.message ?? exception.message;
        code = b.code;
      }
    } else if (isClientError(exception)) {
      // Erros do parser do corpo (payload grande, JSON malformado etc.).
      status = exception.status;
      message =
        status === 413 ? 'Requisição muito grande' : 'Requisição inválida';
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'Registro duplicado';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Registro não encontrado';
      } else if (exception.code === 'P2003') {
        status = HttpStatus.CONFLICT;
        message = 'Registro vinculado a outros dados';
      }
    }

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json({
      statusCode: status,
      message,
      ...(code && { code }),
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
