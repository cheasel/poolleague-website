import React from "react";

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  headers: string[];
  children: React.ReactNode;
}

export function Table({ headers, children, className = "", ...props }: TableProps) {
  return (
    <div className="overflow-hidden border border-slate-900 rounded-2xl bg-slate-950/20 w-full">
      <table className={`w-full text-left border-collapse text-xs ${className}`} {...props}>
        <thead>
          <tr className="bg-slate-900/60 text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-800">
            {headers.map((header, idx) => (
              <th key={idx} className={`px-5 py-3 ${idx === 0 ? "w-16 text-center" : ""}`}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/40 text-slate-350 font-medium">
          {children}
        </tbody>
      </table>
    </div>
  );
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

export function TableRow({ children, className = "", ...props }: TableRowProps) {
  return (
    <tr className={`hover:bg-slate-900/30 transition-colors group/row ${className}`} {...props}>
      {children}
    </tr>
  );
}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode;
  rank?: number;
}

export function TableCell({ children, rank, className = "", ...props }: TableCellProps) {
  if (rank !== undefined) {
    return (
      <td className={`px-5 py-3 text-center font-mono font-black text-slate-500 text-[11px] ${className}`} {...props}>
        {rank === 1 ? (
          <span className="inline-flex text-amber-400 text-sm">🥇</span>
        ) : rank === 2 ? (
          <span className="inline-flex text-slate-300 text-sm">🥈</span>
        ) : rank === 3 ? (
          <span className="inline-flex text-amber-600 text-sm">🥉</span>
        ) : (
          rank
        )}
      </td>
    );
  }

  return (
    <td className={`px-5 py-3 ${className}`} {...props}>
      {children}
    </td>
  );
}
