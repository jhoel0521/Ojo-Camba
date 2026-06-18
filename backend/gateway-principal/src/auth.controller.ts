import { Controller, Post, Get, Body, Param, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { TCP_PATTERNS } from '@ojo-camba/common';
import { sendRpc } from './rpc.helper';

@Controller('auth')
export class AuthController {
  constructor(@Inject('MS_AUTH') private readonly client: ClientProxy) {}

  @Post('register')
  register(@Body() dto: { nombre: string; email: string; password: string }) {
    return sendRpc(this.client.send(TCP_PATTERNS.AUTH.REGISTER, dto));
  }

  @Post('login')
  login(@Body() dto: { email: string; password: string }) {
    return sendRpc(this.client.send(TCP_PATTERNS.AUTH.LOGIN, dto));
  }

  @Post('refresh')
  refresh(@Body() dto: { refresh_token: string }) {
    return sendRpc(this.client.send(TCP_PATTERNS.AUTH.REFRESH, dto));
  }

  @Post('logout')
  logout(@Body() dto: { user_id: number }) {
    return sendRpc(this.client.send(TCP_PATTERNS.AUTH.LOGOUT, dto));
  }

  @Post('validate')
  validate(@Body() dto: { token: string }) {
    return sendRpc(this.client.send(TCP_PATTERNS.AUTH.VALIDATE_TOKEN, dto));
  }

  @Get('profile/:id')
  profile(@Param('id') id: string) {
    return sendRpc(this.client.send(TCP_PATTERNS.AUTH.GET_PROFILE, { user_id: parseInt(id, 10) }));
  }
}
