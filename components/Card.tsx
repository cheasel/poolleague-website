import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "indigo" | "orange" | "pink" | "slate";
  children: React.ReactNode;
  glow?: boolean;
}

export default function Card({ variant = "slate", children, glow = true, className = "", ...props }: CardProps) {
  const borderStyles = {
    indigo: "hover:border-indigo-500/40",
    orange: "hover:border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.02)]",
    pink: "hover:border-pink-500/40",
    slate: "hover:border-slate-700/60"
  };

  const glowStyles = {
    indigo: "bg-indigo-500/10 group-hover:bg-indigo-500/20",
    orange: "bg-orange-500/10 group-hover:bg-orange-500/20",
    pink: "bg-pink-500/10 group-hover:bg-pink-500/20",
    slate: "bg-slate-500/5 group-hover:bg-slate-500/10"
  };

  return (
    <div
      className={`bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between transition-colors relative overflow-hidden group ${borderStyles[variant]} ${className}`}
      {...props}
    >
      {glow && (
        <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl transition-all ${glowStyles[variant]}`} />
      )}
      <div className="relative z-10 w-full h-full flex flex-col justify-between">
        {children}
      </div>
    </div>
  );
}
