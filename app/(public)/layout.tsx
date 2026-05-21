import PublicNavbar from "@/components/public-navbar";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 🎯 CHANGED: Set background wrapper to dark slate-950
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30 selection:text-white">
      <PublicNavbar />
      <main>
        {children}
      </main>
      
      {/* 🎯 CHANGED: Darkened footer styles to seamlessly blend with the canvas */}
      <footer className="py-12 border-t border-slate-900 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em]">
            © 2026 Pool League Analytics System
          </p>
        </div>
      </footer>
    </div>
  );
}