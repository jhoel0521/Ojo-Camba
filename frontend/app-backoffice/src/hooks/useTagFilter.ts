import { useState, useCallback } from 'react';

export type TagColor = 'info' | 'success' | 'warning' | 'danger' | 'gray';

export interface TagEntry {
  label: string;
  color: TagColor;
}

export function useTagFilter<T extends string>(_catalog: readonly T[]) {
  const [include, setInclude] = useState<Set<T>>(new Set());
  const [exclude, setExclude] = useState<Set<T>>(new Set());

  const toggleInclude = useCallback((label: T) => {
    setInclude((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
    setExclude((prev) => {
      const next = new Set(prev);
      next.delete(label);
      return next;
    });
  }, []);

  const toggleExclude = useCallback((label: T) => {
    setExclude((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
    setInclude((prev) => {
      const next = new Set(prev);
      next.delete(label);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setInclude(new Set());
    setExclude(new Set());
  }, []);

  const applyFilter = useCallback(
    <I extends { tags: { label: string }[] }>(items: I[]): I[] => {
      return items.filter((item) => {
        const labels = item.tags.map((t) => t.label);
        if (include.size > 0 && !labels.some((l) => include.has(l as T))) return false;
        if (exclude.size > 0 && labels.some((l) => exclude.has(l as T))) return false;
        return true;
      });
    },
    [include, exclude],
  );

  const isActive = include.size > 0 || exclude.size > 0;

  return { include, exclude, toggleInclude, toggleExclude, clearAll, applyFilter, isActive };
}
