# Seeder histórico de demostración

`src/simulador-historico/` es el único seeder de reportes y Casos de Obra.
Reemplaza al antiguo `src/seed.ts`, que insertaba datos directamente y truncaba
el historial existente.

## Orden local

1. Detener los servicios que usen la base.
2. `pnpm db:fresh`
3. `pnpm db:migrate`
4. `pnpm db:seed:auth` — crea Ciudadano, Backoffice, Técnico, Coordinador e IT.
5. Iniciar el backend (`pnpm dev`).
6. Ejecutar `pnpm db:seed:historico -- --seed feria-2026 ...`.

El paso 4 es obligatorio antes del histórico, porque este usa las sesiones y
permisos reales de esos actores. No se ejecuta ningún seeder de reportes después:
el histórico ya crea y procesa los reportes mediante las APIs del sistema.

## Entorno del simulador

Crear `.env.simulador` desde `.env.simulador.example`; contiene únicamente:

```env
SIMULADOR_API_URL=http://localhost:3000
SIMULADOR_DATABASE_URL=postgresql://.../ojo_camba_demo
```
