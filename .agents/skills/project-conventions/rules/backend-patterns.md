# Regla: Patrones Backend (NestJS)

## Estructura de microservicio
```
backend/ms-{nombre}/
├── src/
│   ├── main.ts              # Bootstrap TCP
│   ├── app.module.ts        # TypeOrmModule.forRoot() + ConfigModule
│   ├── {domain}.module.ts   # TypeOrmModule.forFeature([...])
│   ├── {domain}.controller.ts  # @MessagePattern handlers
│   ├── {domain}.service.ts     # Lógica de negocio + onModuleInit
│   ├── entities/            # Entidades TypeORM (o en libs/common)
│   └── dto/                 # class-validator DTOs
├── test/
│   └── e2e.test.js          # Tests end-to-end TCP
├── package.json
├── .env                      # Local (en .gitignore)
├── .env.example              # Template (se commitea)
├── tsconfig.json
└── nest-cli.json
```

## Patrones TCP
- Definidos en `libs/common/src/patterns/tcp-patterns.ts`
- Formato: `DOMINIO.ACCION` (ej: `auth.login`, `register.create_report`)
- Usar `as const` para type safety

## TypeORM
- `synchronize: true` en MVP (crea tablas automáticamente)
- `autoLoadEntities: true` para no listar manualmente
- Usar `reflect-metadata` 0.2.x
- Entidades compartidas van en `libs/common/src/entities/`

## Validación
- DTOs con `class-validator` + `class-transformer`
- En TCP microservicios, NestJS valida automáticamente con `@Payload()`
- En gateways HTTP, agregar `ValidationPipe` al bootstrap

## Seed de datos
- Usar `onModuleInit()` en el service para datos iniciales
- Verificar existencia antes de insertar (`findOne` + `save` condicional)
- Ejemplos: roles (ms-auth), categorías (ms-register)

## Tests
- Formato: Node.js script con `ClientProxyFactory` + `firstValueFrom`
- Cada caso de uso tiene al menos un test
- Tests en `test/e2e.test.js`
