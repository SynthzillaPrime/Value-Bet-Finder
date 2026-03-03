import React, { useState, useEffect, ReactNode } from "react";

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
}

export const PaginatedTable = <T,>({
  columns,
  data,
  pageSize = 10,
  keyFn,
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
    <div className="overflow-x-auto bg-slate-800/50 rounded-xl border border-slate-700/50">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="text-slate-400 border-b border-slate-700 text-[10px] uppercase tracking-wider">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`p-4 font-medium ${col.align === "right" ? "text-right" : ""}`}
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
        <div className="bg-slate-800/50 border-t border-slate-700/50 px-4 py-3 flex justify-between items-center">
          <span className="text-xs text-slate-500">
            Showing {Math.min(startIndex + 1, total)}-
            {Math.min(startIndex + pageSize, total)} of {total}
          </span>
          <div className="flex gap-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="text-xs text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
