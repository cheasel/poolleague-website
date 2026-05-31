import { db } from "@/src/db";
import { seasons, divisions, teams, players, matches, teamMemberships, teamRegistrations } from "@/src/db/schema";
import { sql, eq, count, and, desc } from "drizzle-orm";
import Link from "next/link";
import { syncMemberships } from "@/src/utils/sync-memberships";
import { syncTeamRegistrations } from "@/src/utils/sync-team-registrations";
import { 
  Trophy, 
  Layers, 
  Users, 
  UserSquare2, 
  Activity, 
  ArrowRight,
  ShieldAlert,
  CalendarPlus,
  UserPlus,
  Home,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Sparkles
} from "lucide-react";

export const dynamic = "force-dynamic";

interface ActivityItem {
  type: 'match' | 'team' | 'player';
  id: number;
  title: string;
  detail: string;
  timestamp: Date | null;
}

export default async function AdminDashboardPage() {
  // Ensure database state is synchronized
  await syncMemberships();
  await syncTeamRegistrations();

  // Execute queries sequentially to prevent client-side pipelining deadlocks on Supavisor (max: 1 connection pool)
  const [seasonCount] = await db.select({ count: count() }).from(seasons);
  const [divisionCount] = await db.select({ count: count() }).from(divisions);
  const [teamCount] = await db.select({ count: count() }).from(teams);
  const [playerCount] = await db.select({ count: count() }).from(players);
  const [activeSeason] = await db.select().from(seasons).where(eq(seasons.isActive, true)).limit(1);
  const [scheduledMatches] = await db.select({ count: count() }).from(matches).where(eq(matches.status, "scheduled"));

  // Fetch active or latest season for season-specific health checks
  let currentSeason = activeSeason;
  if (!currentSeason) {
    const [latestSeason] = await db.select().from(seasons).orderBy(desc(seasons.startDate)).limit(1);
    currentSeason = latestSeason;
  }

  // Count players who do not have a team membership in the current season
  const unassignedPlayersCountResult = currentSeason
    ? await db
        .select({ count: count() })
        .from(players)
        .where(
          sql`NOT EXISTS (
            SELECT 1 FROM ${teamMemberships}
            WHERE ${teamMemberships.playerId} = ${players.id}
              AND ${teamMemberships.seasonId} = ${currentSeason.id}
          )`
        )
    : [{ count: 0 }];
  const unassignedPlayers = unassignedPlayersCountResult[0] || { count: 0 };

  // Count teams that are not registered in the current season
  const unassignedTeamsCountResult = currentSeason
    ? await db
        .select({ count: count() })
        .from(teams)
        .where(
          sql`NOT EXISTS (
            SELECT 1 FROM ${teamRegistrations}
            WHERE ${teamRegistrations.teamId} = ${teams.id}
              AND ${teamRegistrations.seasonId} = ${currentSeason.id}
          )`
        )
    : [{ count: 0 }];
  const unassignedTeams = unassignedTeamsCountResult[0] || { count: 0 };

  // Count active teams in the current season with zero player memberships
  const teamsWithoutPlayersCountResult = currentSeason
    ? await db
        .select({ count: count() })
        .from(teamRegistrations)
        .where(
          and(
            eq(teamRegistrations.seasonId, currentSeason.id),
            sql`NOT EXISTS (
              SELECT 1 FROM ${teamMemberships}
              WHERE ${teamMemberships.teamId} = ${teamRegistrations.teamId}
                AND ${teamMemberships.seasonId} = ${currentSeason.id}
            )`
          )
        )
    : [{ count: 0 }];
  const teamsWithoutPlayers = teamsWithoutPlayersCountResult[0] || { count: 0 };

  const doubleBookedResult = await db.execute(sql`
    SELECT COUNT(DISTINCT m1.id) as count
    FROM matches m1
    JOIN matches m2 ON date(m1.date) = date(m2.date) AND m1.id < m2.id
    JOIN teams t1 ON m1.home_team_id = t1.id
    JOIN teams t2 ON m2.home_team_id = t2.id
    WHERE t1.home_venue_id = t2.home_venue_id 
      AND m1.status = 'scheduled' 
      AND m2.status = 'scheduled'
      AND m1.date IS NOT NULL
      AND m2.date IS NOT NULL
  `);

  const doubleBookedVenuesCount = Number(doubleBookedResult[0]?.count || 0);

  // 4. Calculate Active Season Progress
  let matchProgress = { completed: 0, total: 0, percentage: 0 };
  if (activeSeason) {
    const [totalMatches] = await db
      .select({ count: count() })
      .from(matches)
      .where(eq(matches.seasonId, activeSeason.id));
    const [completedMatches] = await db
      .select({ count: count() })
      .from(matches)
      .where(and(eq(matches.seasonId, activeSeason.id), eq(matches.status, "completed")));
    
    const total = totalMatches?.count || 0;
    const completed = completedMatches?.count || 0;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    matchProgress = { completed, total, percentage };
  }

  // 5. Query Recent System Activity feeds sequentially (prevent pipelining deadlock on max: 1 pool)
  const recentMatches = await db
    .select({
      id: matches.id,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      date: matches.date,
      homeTeamName: sql<string>`t1.name`,
      awayTeamName: sql<string>`t2.name`,
    })
    .from(matches)
    .leftJoin(sql`teams t1`, eq(matches.homeTeamId, sql`t1.id`))
    .leftJoin(sql`teams t2`, eq(matches.awayTeamId, sql`t2.id`))
    .where(eq(matches.status, "completed"))
    .orderBy(desc(matches.date), desc(matches.id))
    .limit(3);

  const recentTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
      createdAt: teams.createdAt,
    })
    .from(teams)
    .orderBy(desc(teams.createdAt), desc(teams.id))
    .limit(3);

  const recentPlayers = await db
    .select({
      id: players.id,
      name: players.name,
      teamName: teams.name,
    })
    .from(players)
    .leftJoin(
      teamMemberships,
      and(
        eq(players.id, teamMemberships.playerId),
        currentSeason ? eq(teamMemberships.seasonId, currentSeason.id) : sql`1=0`
      )
    )
    .leftJoin(teams, eq(teamMemberships.teamId, teams.id))
    .orderBy(desc(players.id))
    .limit(3);

  // Combine into a single chronological feed
  const activities: ActivityItem[] = [];

  recentMatches.forEach(m => {
    activities.push({
      type: 'match',
      id: m.id,
      title: "Scorecard Closed",
      detail: `${m.homeTeamName} ${m.homeScore} - ${m.awayScore} ${m.awayTeamName}`,
      timestamp: m.date ? new Date(m.date) : null,
    });
  });

  recentTeams.forEach(t => {
    activities.push({
      type: 'team',
      id: t.id,
      title: "New Team Registered",
      detail: `Club "${t.name}" added to the roster registry`,
      timestamp: t.createdAt ? new Date(t.createdAt) : null,
    });
  });

  recentPlayers.forEach(p => {
    activities.push({
      type: 'player',
      id: p.id,
      title: "Competitor Registered",
      detail: `Player "${p.name}" registered ${p.teamName ? `for ${p.teamName}` : 'as Independent'}`,
      timestamp: null
    });
  });

  const sortedActivities = activities.sort((a, b) => {
    if (a.timestamp && b.timestamp) return b.timestamp.getTime() - a.timestamp.getTime();
    if (a.timestamp) return -1;
    if (b.timestamp) return 1;
    return b.id - a.id;
  }).slice(0, 5);

  // 6. Navigation Control Items
  const controlCards = [
    {
      title: "Seasons",
      count: seasonCount?.count || 0,
      href: "/admin/seasons",
      icon: Trophy,
      color: "text-amber-400 bg-amber-950/30 border-amber-900/40",
      description: "Manage timelines, archive historic sessions, and declare champions."
    },
    {
      title: "Divisions",
      count: divisionCount?.count || 0,
      href: "/admin/divisions",
      icon: Layers,
      color: "text-indigo-400 bg-indigo-950/30 border-indigo-900/40",
      description: "Establish league tiers, define tier order ranks, and structure brackets."
    },
    {
      title: "Teams",
      count: teamCount?.count || 0,
      href: "/admin/teams",
      icon: Users,
      color: "text-emerald-400 bg-emerald-950/30 border-emerald-900/40",
      description: "Roster league clubs, assign brackets, and review aggregate points."
    },
    {
      title: "Players",
      count: playerCount?.count || 0,
      href: "/admin/players",
      icon: UserSquare2,
      color: "text-purple-400 bg-purple-950/30 border-purple-900/40",
      description: "Register players, execute team assignments, and clear flags."
    },
  ];

  // Quick Action Panel configurations
  const quickActions = [
    { name: "Match Generator", href: "/admin/matches/generator", icon: CalendarPlus, desc: "Auto-create fixtures", color: "hover:border-rose-500/50 hover:shadow-rose-950/20" },
    { name: "Register Player", href: "/admin/players", icon: UserPlus, desc: "Fast roster addition", color: "hover:border-indigo-500/50 hover:shadow-indigo-950/20" },
    { name: "Add Team Squad", href: "/admin/teams", icon: Users, desc: "Register club squad", color: "hover:border-emerald-500/50 hover:shadow-emerald-950/20" },
    { name: "Manage Venues", href: "/admin/venues", icon: Home, desc: "Establish venue hubs", color: "hover:border-amber-500/50 hover:shadow-amber-950/20" },
  ];

  return (
    <div className="space-y-10 pb-12">
      {/* Command Center Jumbotron Header Banner */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 border border-slate-800 text-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-indigo-600/10 blur-[120px] rounded-full"></div>
        <div className="relative z-10 space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 fill-indigo-400/20" /> System Command Center
          </span>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic leading-none">
            League Management Hub
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm font-medium">Secure administrative toolset for structural relational changes.</p>
        </div>

        {/* Operational Status Ticker Segment */}
        <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 flex items-center gap-4 min-w-[240px] relative z-10">
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

      {/* QUICK ACTIONS ROW PANEL */}
      <section className="space-y-4">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block px-1">
          Quick Access Shortcuts
        </span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link 
                key={action.name} 
                href={action.href}
                className={`bg-slate-900/30 border border-slate-900 p-5 rounded-2xl flex flex-col items-start gap-3 transition-all hover:-translate-y-0.5 hover:bg-slate-900/50 shadow-md ${action.color}`}
              >
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-850 text-indigo-400 shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-white text-[12px] uppercase tracking-tight">{action.name}</h4>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5 leading-none">{action.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* TWO COLUMN SYSTEM DASHBOARD LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: MAIN WORKSPACE (8 COLUMNS) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Core Control Cards Matrix Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {controlCards.map((card) => {
              const IconComponent = card.icon;
              return (
                <div 
                  key={card.title} 
                  className="bg-slate-900/40 rounded-[2rem] border border-slate-900 shadow-xl hover:border-slate-800 transition-all p-6 flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className={`p-3.5 rounded-xl border ${card.color}`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Total Count</span>
                        <span className="text-2xl font-black text-white tabular-nums leading-none">{card.count}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h2 className="text-[15px] font-black text-white uppercase tracking-tight">{card.title}</h2>
                      <p className="text-slate-500 text-[11px] leading-relaxed font-medium">{card.description}</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-900/60 flex items-center justify-between">
                    <Link 
                      href={card.href} 
                      className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors group/link"
                    >
                      Configure Management <ArrowRight className="w-3 h-3 group-hover/link:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RECENT ACTIVITIES TIMELINE */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-[2rem] p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3 mb-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h3 className="font-black text-white uppercase text-xs tracking-tight">Recent System Activities</h3>
            </div>

            <div className="relative border-l border-slate-850 ml-3.5 pl-5 space-y-6">
              {sortedActivities.map((act) => {
                let badgeStyle = "bg-indigo-950/40 text-indigo-400 border-indigo-900/20";
                if (act.type === 'team') badgeStyle = "bg-emerald-950/40 text-emerald-400 border-emerald-900/20";
                if (act.type === 'player') badgeStyle = "bg-purple-950/40 text-purple-400 border-purple-900/20";

                return (
                  <div key={`${act.type}-${act.id}`} className="relative group/timeline">
                    {/* Timeline Node Point */}
                    <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-slate-950 border border-slate-800 group-hover/timeline:border-indigo-500 transition-colors flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-800 group-hover/timeline:bg-indigo-400 transition-colors" />
                    </span>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${badgeStyle}`}>
                          {act.title}
                        </span>
                        {act.timestamp && (
                          <span className="text-[9px] font-bold text-slate-500">
                            {act.timestamp.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} at {act.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-350 text-[12px] font-black uppercase tracking-tight">
                        {act.detail}
                      </p>
                    </div>
                  </div>
                );
              })}

              {sortedActivities.length === 0 && (
                <p className="text-xs font-bold text-slate-600 italic py-4">No recent database operations detected.</p>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: ANALYTICS & HEALTH PANEL (4 COLUMNS) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* ACTIVE SEASON PROGRESS */}
          <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-[2rem] shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Season Progress</h3>
            </div>

            {activeSeason ? (
              <div className="space-y-5">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Completed Matches</span>
                    <span className="text-2xl font-black text-white font-mono tabular-nums leading-none">
                      {matchProgress.completed} <span className="text-xs text-slate-600">/ {matchProgress.total}</span>
                    </span>
                  </div>
                  <span className="font-mono font-black text-emerald-400 text-lg bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded-lg">
                    {matchProgress.percentage}%
                  </span>
                </div>

                {/* Progress bar container */}
                <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-900 p-0.5">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500 shadow-md shadow-emerald-500/20"
                    style={{ width: `${matchProgress.percentage}%` }}
                  />
                </div>

                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-relaxed">
                  Calculated against all scheduled and completed match entries assigned to {activeSeason.name}.
                </div>
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-600 italic py-2">No active split to track progress.</p>
            )}
          </div>

          {/* SYSTEM HEALTH AUDIT CHECKLIST */}
          <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-[2rem] shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">System Health Checklist</h3>
            </div>

            <div className="space-y-4">
              
              {/* Check 1: Scheduled Matches */}
              <div className="flex items-start gap-3">
                {(scheduledMatches?.count || 0) === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-[11px] font-black text-white uppercase tracking-tight">Pending Fixtures</h4>
                  <p className="text-[10px] text-slate-500 font-bold leading-none mt-0.5">
                    {(scheduledMatches?.count || 0) === 0 ? "All scores entered" : `${scheduledMatches.count} matches waiting for scorecards`}
                  </p>
                </div>
              </div>

              {/* Check 2: Unassigned Players */}
              <div className="flex items-start gap-3">
                {(unassignedPlayers?.count || 0) === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-[11px] font-black text-white uppercase tracking-tight">Independent Players</h4>
                  <p className="text-[10px] text-slate-500 font-bold leading-none mt-0.5">
                    {(unassignedPlayers?.count || 0) === 0 ? "All players assigned to squads" : `${unassignedPlayers.count} players without team assignment`}
                  </p>
                </div>
              </div>

              {/* Check 3: Unassigned Teams */}
              <div className="flex items-start gap-3">
                {(unassignedTeams?.count || 0) === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-[11px] font-black text-white uppercase tracking-tight">Unassigned Teams</h4>
                  <p className="text-[10px] text-slate-500 font-bold leading-none mt-0.5">
                    {(unassignedTeams?.count || 0) === 0 ? "All squads in division brackets" : `${unassignedTeams.count} teams without division assignment`}
                  </p>
                </div>
              </div>

              {/* Check 4: Empty Rosters */}
              <div className="flex items-start gap-3">
                {(teamsWithoutPlayers?.count || 0) === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-[11px] font-black text-white uppercase tracking-tight">Empty Squad Rosters</h4>
                  <p className="text-[10px] text-slate-500 font-bold leading-none mt-0.5">
                    {(teamsWithoutPlayers?.count || 0) === 0 ? "All teams have registered players" : `${teamsWithoutPlayers.count} squads with 0 player rosters`}
                  </p>
                </div>
              </div>

              {/* Check 5: Double Booked Venues */}
              <div className="flex items-start gap-3">
                {doubleBookedVenuesCount === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 animate-bounce" />
                )}
                <div>
                  <h4 className="text-[11px] font-black text-white uppercase tracking-tight">Double-Booked Venues</h4>
                  <p className="text-[10px] text-slate-500 font-bold leading-none mt-0.5">
                    {doubleBookedVenuesCount === 0 ? "No venue double-bookings" : `${doubleBookedVenuesCount} matches conflict on same date/venue`}
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}