export const CATEGORIA_NAMES: Record<number, string> = {
  1: 'Bache',
  2: 'Luminaria',
  3: 'Residuos',
  4: 'Alcantarillado',
  5: 'Trafico',
  6: 'Otro',
};

export function categoriaName(id: number | null): string {
  if (id == null) return 'Sin categoria';
  return CATEGORIA_NAMES[id] ?? 'Otro';
}
