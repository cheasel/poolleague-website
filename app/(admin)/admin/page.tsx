import { db } from "@/src/db";
import { seasons, divisions, teams, players, matches } from "@/src/db/schema";
import { sql, eq, count } from "drizzle-orm";
import Link from "next/link";
import { 
  Trophy, 
  Layers, 
  Users, 
  UserSquare2, 
  Activity, 
  ArrowRight,
  ShieldAlert
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // 1. Fetch High-Level Metrics concurrently
  const [seasonCount] = await db.select({ count: count() }).from(seasons);
  const [divisionCount] = await db.select({ count: count() }).from(divisions);
  const [teamCount] = await db.select({ count: count() }).from(teams);
  const [playerCount] = await db.select({ count: count() }).from(players);
  
  // 2. Fetch system configuration properties for status validation
  const [activeSeason] = await db.select().from(seasons).where(eq(seasons.isActive, true)).limit(1);
  
  // FIXED: Changed "pending" to "scheduled" to match your explicit schema enum type
  const [scheduledMatches] = await db
    .select({ count: count() })
    .from(matches)
    .where(eq(matches.status, "scheduled"));

  const [unassignedPlayers] = await db
    .select({ count: count() }).from(players)
    .where(sql`${players.teamId} IS NULL`);

  // 3. Define navigation architecture layout grid items
  const controlCards = [
    {
      title: "Seasons",
      count: seasonCount?.count || 0,
      href: "/admin/seasons",
      icon: Trophy,
      color: "text-amber-500 bg-amber-50 border-amber-100",
      description: "Manage timelines, archive historic sessions, and declare champions."
    },
    {
      title: "Divisions",
      count: divisionCount?.count || 0,
      href: "/admin/divisions",
      icon: Layers,
      color: "text-blue-500 bg-blue-50 border-blue-100",
      description: "Establish league tiers, define tier order ranks, and structure brackets."
    },
    {
      title: "Teams",
      count: teamCount?.count || 0,
      href: "/admin/teams",
      icon: Users,
      color: "text-emerald-500 bg-emerald-50 border-emerald-100",
      description: "Roster league clubs, assign brackets, and review aggregate points."
    },
    {
      title: "Players",
      count: playerCount?.count || 0,
      href: "/admin/players",
      icon: UserSquare2,
      color: "text-indigo-500 bg-indigo-50 border-indigo-100",
      description: "Register players, execute team assignments, and clear flags."
    },
  ];

  return (
    <div className="space-y-10 pb-12">
      {/* Command Center Jumbotron Header Banner */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 border border-slate-800 text-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-indigo-600/10 blur-[120px] rounded-full"></div>
        <div className="relative z-10 space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">System Dashboard</span>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic leading-none">
            League Management Hub
          </h1>
          <p className="text-slate-400 text-sm font-medium">Secure administrative toolset for structural relational changes.</p>
        </div>

        {/* Operational Status Ticker Segment */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 min-w-[240px] relative z-10">
          <div className="bg-green-500/10 p-2.5 rounded-xl border border-green-500/20 animate-pulse">
            <Activity className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Active Status Context</span>
            <span className="text-xs font-black text-white uppercase truncate block max-w-[160px]">
              {activeSeason ? activeSeason.name : "No Active Season Set"}
            </span>
          </div>
        </div>
      </header>

      {/* Relational System Action Items Alert Ledger */}
      {((scheduledMatches?.count || 0) > 0 || (unassignedPlayers?.count || 0) > 0) && (
        <div className="bg-rose-950/20 border border-rose-900/40 rounded-3xl p-6 flex flex-col md:flex-row md:items-center gap-6 justify-between shadow-xl">
          <div className="flex items-center gap-4">
            <div className="bg-rose-950/40 p-3 rounded-xl border border-rose-900/50">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h3 className="font-black text-rose-200 uppercase text-xs tracking-tight">Data Action Items Remaining</h3>
              <p className="text-rose-500/60 text-[11px] font-medium mt-0.5">
                System health metrics detect active elements requiring operational entry closures.
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {(scheduledMatches?.count || 0) > 0 && (
              <span className="bg-slate-950 px-4 py-2 rounded-xl border border-rose-900/40 text-[10px] font-black uppercase text-rose-400 shadow-inner tabular-nums">
                Scheduled Fixtures: {scheduledMatches.count}
              </span>
            )}
            {(unassignedPlayers?.count || 0) > 0 && (
              <span className="bg-slate-950 px-4 py-2 rounded-xl border border-rose-900/40 text-[10px] font-black uppercase text-rose-400 shadow-inner tabular-nums">
                Unassigned Players: {unassignedPlayers.count}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Core Control Cards Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {controlCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <div 
              key={card.title} 
              className="bg-slate-900/40 rounded-[2.5rem] border border-slate-900 shadow-xl hover:border-slate-800 transition-all p-8 flex flex-col justify-between group"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className={`p-4 rounded-2xl border ${card.color.replace('bg-', 'bg-opacity-10 bg-').replace('border-', 'border-opacity-20 border-')}`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Total Count</span>
                    <span className="text-3xl font-black text-white tabular-nums leading-none">{card.count}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">{card.title}</h2>
                  <p className="text-slate-500 text-xs leading-relaxed font-medium">{card.description}</p>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-900 flex items-center justify-between">
                <Link 
                  href={card.href} 
                  className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors group/link"
                >
                  Configure Management <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}