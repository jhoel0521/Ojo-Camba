import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

function pages(current: number, total: number): (number | '…')[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, '…', total];
  if (current >= total - 2) return [1, '…', total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
}

export default function Pagination({ page, total, limit, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="mt-5 pt-4 border-t border-arcilla space-y-3">
      <p className="text-xs text-arena text-center">
        {total === 0
          ? 'Sin resultados'
          : `${from}–${to} de ${total} resultado${total !== 1 ? 's' : ''}`}
      </p>

      <div className="flex items-center justify-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-caoba hover:text-tierra hover:bg-yeso disabled:opacity-30 disabled:cursor-default transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pages(page, totalPages).map((p, i) =>
          p === '…' ? (
            <span key={`e-${i}`} className="w-9 text-center text-xs text-arena select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={`w-9 h-9 rounded-xl text-xs font-semibold transition-colors ${
                p === page
                  ? 'bg-tierra text-perla shadow-sm'
                  : 'text-caoba hover:text-tierra hover:bg-yeso'
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Página siguiente"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-caoba hover:text-tierra hover:bg-yeso disabled:opacity-30 disabled:cursor-default transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
