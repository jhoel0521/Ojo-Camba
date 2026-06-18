# Regla: Flujo Git

## Ramas
- `main` — producción
- `dev` — desarrollo, rama base para PRs
- `issue/ISSUE-XX-titulo` — rama por issue

## Commits
Formato: `tipo(scope): mensaje`
- `feat`: nueva funcionalidad
- `fix`: corrección de bug
- `refactor`: reestructuración sin cambiar comportamiento
- `docs`: documentación
- `chore`: tareas de build, deps, config
- `test`: agregar o modificar tests

Ejemplos:
```
feat(ms-auth): implementar registro de usuarios con JWT
fix(docker): corregir build de h3-pg
refactor(común): mover entidades a libs/common
docs(modelo): documentar tabla refresh_tokens
chore(deps): actualizar a NestJS 11 y Vite 6
```

## PRs
- Crear PR de `issue/*` → `dev`
- Incluir `Closes #X` en la descripción
- Merge con `--merge` (no squash, no rebase)
- Borrar rama después del merge

## Pre-commit
Ejecutar `pnpm pre-commit` antes de cada commit. Esto corre:
1. `pnpm format` — Prettier
2. `pnpm lint` — ESLint
3. `pnpm build` — Compilación de 10 servicios

El código no se commitea si `pre-commit` falla.
