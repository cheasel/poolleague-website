import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "indigo" | "orange" | "pink" | "emerald" | "slate";
  children: React.ReactNode;
}

export default function Badge({ variant = "indigo", children, className = "", ...props }: BadgeProps) {
  const styles = {
    indigo: "bg-indigo-950/50 border border-indigo-900/60 text-indigo-400 shadow-sm shadow-indigo-950/40",
    orange: "bg-orange-950/40 border border-orange-900/40 text-orange-400",
    pink: "bg-pink-950/40 border border-pink-900/40 text-pink-400",
    emerald: "bg-emerald-950/40 border border-emerald-900/40 text-emerald-400",
    slate: "bg-slate-900 border border-slate-800 text-slate-350"
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider select-none ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
