import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { createModuleLogger } from '../lib/logger.js';

const log = createModuleLogger('error-handler');

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  log.error({ err: error, traceId: request.traceId }, 'Unhandled error');

  const statusCode = error.statusCode || 500;
  reply.status(statusCode).send({
    error: {
      code: statusCode === 429 ? 'RATE_LIMITED' : 'INTERNAL_ERROR',
      message: error.message || 'Internal server error',
    },
  });
}
