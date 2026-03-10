import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

declare module 'fastify' {
  interface FastifyRequest {
    traceId: string;
  }
}

export function traceMiddleware(request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) {
  request.traceId = (request.headers['x-trace-id'] as string) || uuidv4();
  reply.header('x-trace-id', request.traceId);
  done();
}
