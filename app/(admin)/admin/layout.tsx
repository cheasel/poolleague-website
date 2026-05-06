export default function AdminLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <div className="flex min-h-screen">
        {/* Simple Sidebar */}
        <nav className="w-64 bg-slate-900 text-white p-6">
          <h1 className="text-xl font-bold mb-8">League Admin</h1>
          <ul className="space-y-4">
            <li><a href="/admin" className="hover:text-blue-400">Dashboard</a></li>
            <li><a href="/admin/teams" className="hover:text-blue-400">Manage Teams</a></li>
            <li><a href="/admin/players" className="hover:text-blue-400">Manage Players</a></li>
          </ul>
        </nav>
  
        {/* Main Content */}
        <main className="flex-1 bg-slate-50 p-10">
          {children}
        </main>
      </div>
    );
  }