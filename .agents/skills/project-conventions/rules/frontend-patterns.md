# Regla: Patrones Frontend (React + Vite + Tailwind)

## Estructura de app
```
frontend/app-{nombre}/
├── src/
│   ├── main.tsx          # Entry point, importa index.css
│   ├── App.tsx           # Componente raíz
│   ├── index.css         # @import "tailwindcss" + @theme
│   ├── components/       # Componentes reutilizables
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utilidades, schemas zod, API client
│   └── vite-env.d.ts     # Tipos de Vite
├── public/
│   └── icons/            # PWA icons
├── index.html
├── package.json
├── vite.config.ts        # Tailwind + React + PWA plugins
└── tsconfig.json
```

## Stack estándar
| Categoría | Librería | Uso |
|-----------|----------|-----|
| Framework | React 18 | UI |
| Build | Vite 6 | Dev server + build |
| CSS | Tailwind v4 | Sistema de diseño |
| Íconos | lucide-react | SVG icons |
| Formularios | react-hook-form + zod | Manejo y validación |
| Estado | zustand | Estado global |
| PWA | vite-plugin-pwa | Service worker + manifest |
| HTTP | fetch nativo | Llamadas al gateway |

## Sistema de diseño
- **SIEMPRE** seguir las reglas de `anillos-design-system`
- Colores: paleta Santa Cruz (catedral, tierra, ladrillo, etc.)
- Tipografía: Piraí Sans (Montserrat fallback)
- Radios: 36px tarjetas, pill botones
- Mobile-first: diseñar para 375-428px primero

## Reglas de componentes
- Componentes funcionales con TypeScript
- Props tipadas con interfaces
- **NO usar** defaultProps (obsoleto), usar destructuring con defaults
- **NO usar** React.FC, usar function declaration con return type implícito
- Estados de carga: mostrar skeleton o spinner
- Estados de error: mostrar mensaje descriptivo
- Estados vacíos: mostrar ilustración + CTA

## API calls
```typescript
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
```

## Formularios
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({ /* ... */ });
type FormData = z.infer<typeof schema>;

const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
});
```
