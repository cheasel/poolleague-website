import PublicNavbar from "@/components/public-navbar";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNavbar />
      <main>
        {children}
      </main>
      
      {/* Optional: Simple Footer */}
      <footer className="py-12 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">
            © 2026 Pool League Analytics System
          </p>
        </div>
      </footer>
    </div>
  );
}