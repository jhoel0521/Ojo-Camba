# Seeder histórico de demostración

El seeder histórico genera reportes, grupos de obra y actualizaciones de bitácora día por día. El comando de seis años usa 2.190 días y finaliza en la fecha de ejecución.

## Alcance y seguridad

El seeder accede directamente a PostgreSQL y elimina los datos de `actualizaciones_caso`, `grupos_reportes`, `reportes` y `dispositivos` antes de generar el historial. Úsalo únicamente en una base local, de prueba o de demostración. No lo ejecutes sobre la base de datos operativa de usuarios reales.

El seeder actual genera datos de demostración. No sustituye al simulador transaccional del issue que debe recorrer los casos de uso autenticados mediante los microservicios.

## Ejecución local

1. Inicia la infraestructura local:

   ```bash
   pnpm docker:up
   ```

2. Aplica las migraciones si la base no está preparada:

   ```bash
   pnpm db:migrate
   ```

3. Crea los usuarios demo y el historial de seis años:

   ```bash
   pnpm db:seed:historical
   ```

El comando siembra usuarios y roles mediante `ms-auth`, luego ejecuta `ms-register` con `--days 2190`. La salida final informa los reportes, grupos, actualizaciones y casos asignados generados.

Para una ventana distinta, ejecuta directamente el seeder. Acepta de 1 a 3.650 días:

```bash
pnpm --filter @ojo-camba/ms-register seed -- --days 365
```

## Entorno demo en Coolify

En Coolify, abre el terminal del contenedor `ms-register` y ejecuta el artefacto ya compilado:

```bash
node dist/seed.js --days 2190
```

Antes, la base demo debe tener las migraciones aplicadas y las cuentas demo creadas desde el contenedor `ms-auth`:

```bash
node dist/seed.js
```

El comando de `ms-register` elimina los reportes, grupos, actualizaciones y dispositivos de esa base antes de crear el historial. Para otra ventana histórica, reemplaza `2190` por un entero entre 1 y 3.650.

No ejecutes el seeder sobre datos ciudadanos reales. Para una carga histórica real se requiere el simulador de negocio con aislamiento, checkpoints y validaciones definidos en el issue.
