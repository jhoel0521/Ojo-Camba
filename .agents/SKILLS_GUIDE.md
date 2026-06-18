# Guía de Skills Instaladas — Ojo Camba

## Skills PROPIAS del proyecto (`.agents/skills/`)

| Skill | Cuándo usarla |
|-------|---------------|
| **anillos-design-system** | **SIEMPRE** al crear UI. Define colores, tipografía, componentes, mobile-first. La skill más importante. |
| **app-reporte** | Al trabajar en `frontend/app-reporte/`. Reglas de cámara, GPS, PWA offline. |
| **project-conventions** | **SIEMPRE** al hacer cambios. Flujo git, estructura de archivos, patrones de código. |

## Skills de opencode (sistema)

| Skill | Cuándo usarla |
|-------|---------------|
| **nestjs-best-practices** | Al implementar microservicios NestJS. Contiene reglas de arquitectura, DI, seguridad, tests. |
| **react-best-practices** | Al crear componentes React. Reglas de renderizado, rerender, bundle, async, server components. |
| **react-hook-form** | Al crear formularios con react-hook-form + zod. Patrones de validación, arrays, performance. |
| **zod** | Al definir schemas de validación. Composición, refinements, types, performance. |
| **tailwind-css-patterns** | Al aplicar estilos con Tailwind. Layout, responsive, animaciones, accesibilidad. |
| **vite** | Al configurar Vite. Plugins, build, SSR, environment API. |
| **composition-patterns** | Al diseñar APIs de componentes. Compound components, render props, variants. |
| **nodejs-backend-patterns** | Al diseñar servicios backend Node.js. Patrones avanzados. |
| **frontend-design** | Al crear diseños de página completos. Layout, jerarquía visual, composición. |
| **accessibility** | Al implementar componentes. WCAG, ARIA, keyboard navigation. |
| **seo** | Al trabajar en meta tags, structured data, optimización de búsqueda. |
| **typescript-advanced-types** | Al necesitar tipos avanzados de TypeScript. |

## Prioridad de uso

1. **Siempre activas**: `anillos-design-system`, `project-conventions`
2. **Por dominio**: `app-reporte` (para ese frontend)
3. **Por tecnología**: `nestjs-best-practices`, `react-best-practices`, `tailwind-css-patterns`
4. **Por tarea**: `react-hook-form` (formularios), `zod` (validación), `vite` (config)
5. **Ocasionales**: `accessibility`, `seo`, `composition-patterns`, `frontend-design`, `typescript-advanced-types`
