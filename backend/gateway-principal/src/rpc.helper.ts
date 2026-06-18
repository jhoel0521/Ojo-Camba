import {
  InternalServerErrorException,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { firstValueFrom, Observable } from 'rxjs';

interface RpcResponse {
  status?: string;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

export async function sendRpc<T>(source: Observable<T>): Promise<T> {
  const result = (await firstValueFrom(source)) as unknown as RpcResponse;

  if (result && typeof result === 'object' && result.status === 'error') {
    const msg = result.message ?? 'Error interno';
    if (msg.includes('ya esta registrado') || msg.includes('ya existe'))
      throw new ConflictException(msg);
    if (
      msg.includes('Credenciales invalidas') ||
      msg.includes('invalido') ||
      msg.includes('Invalido') ||
      msg.includes('revocado') ||
      msg.includes('expirado')
    )
      throw new UnauthorizedException(msg);
    if (msg.includes('no encontrado') || msg.includes('No encontrado') || msg.includes('existe'))
      throw new NotFoundException(msg);
    if (
      msg.includes('deben') ||
      msg.includes('mismo hexagono') ||
      msg.includes('al menos') ||
      msg.includes('no existen') ||
      msg.includes('invalido')
    )
      throw new BadRequestException(msg);
    throw new InternalServerErrorException(msg);
  }

  return result as T;
}
