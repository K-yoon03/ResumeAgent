// src/hooks/usePaginatedSearch.js
import { useState, useMemo } from "react";

export function usePaginatedSearch(items, pageSize = 10, searchFn) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    return items.filter(item => searchFn(item, query.toLowerCase()));
  }, [items, query]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleQuery = (q) => {
    setQuery(q);
    setPage(1); // 검색 시 첫 페이지로
  };

  const Pagination = () => {
    if (totalPages <= 1) return null;

    const delta = 2;
    const range = [];
    const left = Math.max(1, page - delta);
    const right = Math.min(totalPages, page + delta);

    if (left > 1) { range.push(1); if (left > 2) range.push("..."); }
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages) { if (right < totalPages - 1) range.push("..."); range.push(totalPages); }

    return (
      <div className="flex items-center justify-center gap-2 mt-6">
        <button
          disabled={page === 1}
          onClick={() => setPage(p => p - 1)}
          className="px-2 py-1 rounded border border-border text-sm disabled:opacity-40 hover:bg-muted transition-colors"
        >‹</button>
        {range.map((p, idx) =>
          p === "..." ? (
            <span key={`e${idx}`} className="text-muted-foreground text-sm px-1">...</span>
          ) : (
            <button key={p}
              onClick={() => setPage(p)}
              className={`min-w-[32px] px-2 py-1 rounded border text-sm transition-colors ${
                p === page
                  ? "bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white border-0"
                  : "border-border hover:bg-muted"
              }`}
            >{p}</button>
          )
        )}
        <button
          disabled={page === totalPages}
          onClick={() => setPage(p => p + 1)}
          className="px-2 py-1 rounded border border-border text-sm disabled:opacity-40 hover:bg-muted transition-colors"
        >›</button>
      </div>
    );
  };

  return { paged, filtered, query, handleQuery, page, totalPages, Pagination };
}