import { of, throwError } from 'rxjs';
import { StatusService } from './status.service';

function makeClient(behavior: 'ok' | 'down') {
  return {
    send: jest.fn(() =>
      behavior === 'ok' ? of({ status: 'ok' }) : throwError(() => new Error('timeout')),
    ),
  };
}

describe('StatusService — agregacion de ping (ISSUE-20)', () => {
  it('reporta status global "ok" cuando los 4 microservicios responden', async () => {
    const service = new StatusService(
      makeClient('ok') as never,
      makeClient('ok') as never,
      makeClient('ok') as never,
      makeClient('ok') as never,
    );

    await (service as unknown as { pingAll: () => Promise<void> }).pingAll();
    const result = service.getStatus();

    expect(result.status).toBe('ok');
    expect(result.services.every((s) => s.status === 'ok')).toBe(true);
    expect(result.services).toHaveLength(4);
  });

  it('marca como "Interrupcion" (down) solo el microservicio caido, sin afectar a los demas', async () => {
    const service = new StatusService(
      makeClient('down') as never, // ms-auth caido
      makeClient('ok') as never,
      makeClient('ok') as never,
      makeClient('ok') as never,
    );

    await (service as unknown as { pingAll: () => Promise<void> }).pingAll();
    const result = service.getStatus();

    expect(result.status).toBe('degraded');
    const authStatus = result.services.find((s) => s.name === 'ms-auth');
    expect(authStatus?.status).toBe('down');
    expect(
      result.services.filter((s) => s.name !== 'ms-auth').every((s) => s.status === 'ok'),
    ).toBe(true);
  });

  it('incluye latencia solo para los servicios que respondieron', async () => {
    const service = new StatusService(
      makeClient('down') as never,
      makeClient('ok') as never,
      makeClient('ok') as never,
      makeClient('ok') as never,
    );

    await (service as unknown as { pingAll: () => Promise<void> }).pingAll();
    const result = service.getStatus();

    const authStatus = result.services.find((s) => s.name === 'ms-auth');
    const registerStatus = result.services.find((s) => s.name === 'ms-register');
    expect(authStatus?.latencyMs).toBeUndefined();
    expect(registerStatus?.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
