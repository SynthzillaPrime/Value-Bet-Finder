import { useState, useEffect, ReactNode } from "react";

interface Column<T> {
  label: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  keyFn: (row: T) => string;
  onHeaderClick?: (label: string) => void;
}

export const PaginatedTable = <T,>({
  columns,
  data,
  pageSize = 10,
  keyFn,
  onHeaderClick,
}: Props<T>) => {
  const [page, setPage] = useState(1);

  // Reset page to 1 whenever data length changes
  useEffect(() => {
    setPage(1);
  }, [data.length]);

  const total = data.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedData = data.slice(startIndex, startIndex + pageSize);

  return (
    <div className="w-full overflow-x-auto bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden backdrop-blur-sm font-sans">
      <table
        className="w-full text-left border-collapse font-sans"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <thead>
          <tr className="bg-slate-800/50 text-slate-500 border-b border-slate-800/50 text-[10px] uppercase tracking-wider font-bold">
            {columns.map((col, idx) => (
              <th
                key={idx}
                onClick={() => onHeaderClick?.(col.label)}
                className={`px-4 py-3 ${col.align === "right" ? "text-right" : ""} ${
                  onHeaderClick ? "cursor-pointer hover:text-slate-300" : ""
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-sm text-slate-300">
          {paginatedData.map((row) => (
            <tr
              key={keyFn(row)}
              className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
            >
              {columns.map((col, idx) => (
                <td
                  key={idx}
                  className={`p-4 ${col.align === "right" ? "text-right" : ""}`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {total > pageSize && (
        <div className="bg-slate-800/20 border-t border-slate-800 px-4 py-3 flex justify-between items-center font-sans">
          <div className="text-xs text-slate-500">
            Showing{" "}
            <span className="font-bold text-slate-300">
              {Math.min(startIndex + 1, total)}-
              {Math.min(startIndex + pageSize, total)}
            </span>{" "}
            of <span className="font-bold text-slate-300">{total}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
