import { X } from 'lucide-react';

interface TagFilterBarProps {
  title: string;
  catalog: readonly string[];
  include: Set<string>;
  exclude: Set<string>;
  onToggleInclude: (label: string) => void;
  onToggleExclude: (label: string) => void;
}

function TagFilterBar({
  title,
  catalog,
  include,
  exclude,
  onToggleInclude,
  onToggleExclude,
}: TagFilterBarProps) {
  return (
    <div>
      <p className="text-[10px] text-arena uppercase tracking-wide font-medium mb-1.5">{title}</p>

      <div className="flex flex-wrap gap-2">
        {catalog.map((tag) => {
          const isIncluded = include.has(tag);
          const isExcluded = exclude.has(tag);

          let classes =
            'inline-flex items-center gap-1 rounded-pill min-h-[44px] min-w-[44px] px-3 ' +
            'text-xs font-medium border cursor-pointer select-none transition-colors ' +
            'justify-center';

          if (isIncluded) {
            classes += ' bg-sol-camba text-perla border-sol-camba';
          } else if (isExcluded) {
            classes += ' bg-red-50 text-red-600 border-red-200 line-through';
          } else {
            classes += ' border-arcilla text-caoba bg-perla hover:bg-arcilla/40';
          }

          return (
            <button
              key={tag}
              type="button"
              className={classes}
              onClick={() => onToggleInclude(tag)}
              onContextMenu={(e) => {
                e.preventDefault();
                onToggleExclude(tag);
              }}
              aria-pressed={isIncluded ? 'true' : isExcluded ? 'mixed' : 'false'}
              title={`Clic: incluir · Clic derecho: excluir — ${tag}`}
            >
              {isExcluded && <X size={12} aria-hidden="true" />}
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default TagFilterBar;
