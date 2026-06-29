import { Catch, ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Catch()
export class RpcExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, _host: ArgumentsHost) {
    if (exception instanceof RpcException) {
      const error = exception.getError();
      if (typeof error === 'string') return { status: 'error', message: error };
      if (typeof error === 'object' && error !== null && 'message' in error) {
        return { status: 'error', message: String((error as { message: unknown }).message) };
      }
      return { status: 'error', message: String(error) };
    }

    if (exception instanceof Error) {
      return { status: 'error', message: exception.message };
    }

    return { status: 'error', message: 'Internal server error' };
  }
}
