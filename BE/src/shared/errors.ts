import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
  }
}

export function notFound(message = 'Không tìm thấy dữ liệu') {
  return new AppError('NOT_FOUND', message, 404);
}

export function forbidden(message = 'Bạn không có quyền thực hiện thao tác này') {
  return new AppError('FORBIDDEN', message, 403);
}

export function conflict(code: string, message: string) {
  return new AppError(code, message, 409);
}

export function setErrorHandler(error: FastifyError, _request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message, statusCode: error.statusCode }
    });
  }

  const statusCode = error.statusCode ?? 500;
  const code = statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST';
  return reply.status(statusCode).send({
    error: {
      code,
      message: statusCode >= 500 ? 'Đã xảy ra lỗi hệ thống' : error.message,
      statusCode
    }
  });
}
