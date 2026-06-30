import { db } from "@/src/db";
import { seasons, divisions, matches, teamRegistrations, teams } from "@/src/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { Trophy, Award, ArrowRight, Sparkles, Inbox } from "lucide-react";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "League History | Lanna Pool Club",
  description: "Explore past seasons, archival standings, and champions of the Lanna Pool Club league.",
};

interface TeamStanding {
  id: number;
  name: string;
  logoUrl: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  framesWon: number;
  framesLost: number;
  frameDifference: number;
  points: number;
}

interface DivisionHistory {
  id: number;
  name: string;
  tier: number;
  champion: TeamStanding | null;
  runnerUp: TeamStanding | null;
  totalTeams: number;
  completedMatchesCount: number;
}

interface SeasonHistory {
  id: number;
  name: string;
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
  divisions: DivisionHistory[];
}

const getCachedHistoryData = unstable_cache(
  async (): Promise<SeasonHistory[]> => {
    // 1. Fetch past/inactive seasons chronologically (newest first)
    const allSeasons = await db
      .select()
      .from(seasons)
      .where(eq(seasons.isActive, false))
      .orderBy(desc(seasons.startDate));

    if (allSeasons.length === 0) return [];

    // 2. Fetch all divisions
    const allDivisions = await db.select().from(divisions).orderBy(divisions.tier);

    // 3. Fetch all team registrations with team names and logos
    const allRegistrations = await db
      .select({
        teamId: teamRegistrations.teamId,
        seasonId: teamRegistrations.seasonId,
        divisionId: teamRegistrations.divisionId,
        teamName: teams.name,
        teamLogo: teams.logoUrl,
      })
      .from(teamRegistrations)
      .innerJoin(teams, eq(teamRegistrations.teamId, teams.id));

    // 4. Fetch completed matches
    const completedMatches = await db
      .select({
        id: matches.id,
        seasonId: matches.seasonId,
        divisionId: matches.divisionId,
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
      })
      .from(matches)
      .where(eq(matches.status, "completed"));

    // 5. Aggregate standings per season & division in-memory
    const result: SeasonHistory[] = allSeasons.map((season) => {
      const seasonDivisions = allDivisions.filter((d) => d.seasonId === season.id);

      const divisionHistories: DivisionHistory[] = seasonDivisions.map((div) => {
        const divRegs = allRegistrations.filter(
          (r) => r.seasonId === season.id && r.divisionId === div.id
        );

        const divMatches = completedMatches.filter(
          (m) => m.seasonId === season.id && m.divisionId === div.id
        );

        const standingsMap: Record<number, TeamStanding> = {};
        divRegs.forEach((reg) => {
          standingsMap[reg.teamId] = {
            id: reg.teamId,
            name: reg.teamName,
            logoUrl: reg.teamLogo,
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            framesWon: 0,
            framesLost: 0,
            frameDifference: 0,
            points: 0,
          };
        });

        divMatches.forEach((match) => {
          const home = standingsMap[match.homeTeamId!];
          const away = standingsMap[match.awayTeamId!];
          if (!home || !away) return; // Guard against out-of-scope registrations

          const hScore = match.homeScore !== null ? Number(match.homeScore) : 0;
          const aScore = match.awayScore !== null ? Number(match.awayScore) : 0;

          home.played += 1;
          away.played += 1;
          home.framesWon += hScore;
          home.framesLost += aScore;
          away.framesWon += aScore;
          away.framesLost += hScore;

          if (hScore > aScore) {
            home.wins += 1;
            away.losses += 1;
            home.points += 2;
          } else if (aScore > hScore) {
            away.wins += 1;
            home.losses += 1;
            away.points += 2;
          } else {
            home.draws += 1;
            away.draws += 1;
            home.points += 1;
            away.points += 1;
          }
        });

        const sortedStandings = Object.values(standingsMap)
          .map((team) => {
            team.frameDifference = team.framesWon - team.framesLost;
            return team;
          })
          .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.frameDifference !== a.frameDifference) return b.frameDifference - a.frameDifference;
            return b.framesWon - a.framesWon;
          });

        const champion = sortedStandings[0] || null;
        const runnerUp = sortedStandings[1] || null;

        return {
          id: div.id,
          name: div.name,
          tier: div.tier,
          champion,
          runnerUp,
          totalTeams: divRegs.length,
          completedMatchesCount: divMatches.length,
        };
      });

      return {
        id: season.id,
        name: season.name,
        isActive: season.isActive,
        startDate: season.startDate ? new Date(season.startDate) : null,
        endDate: season.endDate ? new Date(season.endDate) : null,
        divisions: divisionHistories,
      };
    });

    return result;
  },
  ["history-page-data"],
  { revalidate: 60, tags: ["seasons", "divisions", "matches", "teams", "teamRegistrations"] }
);

const formatDate = (date: Date | null) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

async function HistoryContent() {
  const historyData = await getCachedHistoryData();

  if (historyData.length === 0) {
    return (
      <div className="relative z-10 flex flex-col items-center justify-center py-20 px-4 border border-dashed border-slate-800 rounded-3xl bg-slate-900/10">
        <div className="p-4 rounded-full bg-slate-900 border border-slate-800 mb-4 text-slate-500">
          <Inbox className="w-8 h-8" />
        </div>
        <h3 className="text-base font-black uppercase tracking-tight text-slate-300">No History Available</h3>
        <p className="text-xs text-slate-500 text-center max-w-xs mt-1">
          League archive data will appear here once seasons and divisions are established.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {historyData.map((season) => {
        const startStr = formatDate(season.startDate);
        const endStr = formatDate(season.endDate);
        const seasonDates = startStr && endStr ? `${startStr} — ${endStr}` : startStr || "";

        return (
          <div key={season.id} className="relative z-10 space-y-6">
            {/* Season header bar */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-900 pb-4 gap-4">
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-slate-100 uppercase tracking-tight italic flex items-center gap-2">
                  {season.name}
                </h2>
                {seasonDates && (
                  <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {seasonDates}
                  </p>
                )}
              </div>
              <div>
                {season.isActive ? (
                  <Badge variant="emerald">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Current Season
                  </Badge>
                ) : (
                  <Badge variant="slate">Archived</Badge>
                )}
              </div>
            </div>

            {/* Divisions list */}
            {season.divisions.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium py-4">No divisions configured for this season.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {season.divisions.map((div) => (
                  <Card key={div.id} variant={season.isActive ? "indigo" : "slate"}>
                    <div className="w-full flex flex-col justify-between h-full">
                      {/* Division Header */}
                      <div className="flex items-start justify-between border-b border-slate-850/80 pb-4 mb-4">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 block">
                            Tier {div.tier} Division
                          </span>
                          <h3 className="text-base font-black text-slate-100 uppercase tracking-tight mt-0.5">
                            {div.name}
                          </h3>
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider bg-slate-950/60 border border-slate-850 px-2 py-1 rounded-xl">
                          {div.totalTeams} Teams
                        </span>
                      </div>

                      {/* Standings/Winners Grid */}
                      <div className="space-y-3.5 my-1.5">
                        {/* Champion Box */}
                        {div.champion ? (
                          <div className="bg-slate-950/40 border border-slate-850/40 rounded-2xl p-4 flex items-center justify-between hover:border-amber-500/20 transition-all duration-200">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 shadow-lg shadow-amber-950/20">
                                <Trophy className="w-4.5 h-4.5 text-slate-950 fill-slate-950" />
                              </div>
                              <div>
                                <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 block leading-none mb-0.5">
                                  {season.isActive ? "Current Leader" : "Champion"}
                                </span>
                                <h4 className="font-black text-slate-200 uppercase tracking-tight text-xs sm:text-sm truncate max-w-[160px] sm:max-w-[200px]">
                                  {div.champion.name}
                                </h4>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="block font-mono font-black text-amber-400 text-xs">{div.champion.points} Pts</span>
                              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                {div.champion.wins}W - {div.champion.draws}D - {div.champion.losses}L
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-950/20 border border-slate-900/60 border-dashed rounded-2xl p-8 text-center text-xs font-bold text-slate-500">
                            No standings compiled yet.
                          </div>
                        )}

                        {/* Runner-Up Box */}
                        {div.runnerUp && (
                          <div className="bg-slate-950/20 border border-slate-900/40 rounded-2xl p-4 flex items-center justify-between hover:border-slate-800 transition-all duration-200">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center shrink-0 border border-slate-800 text-slate-400">
                                <Award className="w-4.5 h-4.5" />
                              </div>
                              <div>
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block leading-none mb-0.5">
                                  Runner-Up
                                </span>
                                <h4 className="font-black text-slate-350 uppercase tracking-tight text-xs sm:text-sm truncate max-w-[160px] sm:max-w-[200px]">
                                  {div.runnerUp.name}
                                </h4>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="block font-mono font-bold text-slate-400 text-xs">{div.runnerUp.points} Pts</span>
                              <span className="block text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                                {div.runnerUp.wins}W - {div.runnerUp.draws}D - {div.runnerUp.losses}L
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* View standings CTA */}
                      <div className="mt-5 pt-3.5 border-t border-slate-850/60">
                        <Link
                          href={`/standings?seasonId=${season.id}&divisionId=${div.id}`}
                          className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850/70 hover:border-slate-850 hover:text-indigo-400 text-slate-350 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                        >
                          View Full Standings <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-slate-950 pb-16 text-slate-100 relative">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-pink-500/5 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* HERO HEADER */}
      <div className="relative overflow-hidden bg-slate-950/60 border-b border-slate-900/60 z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-20 relative z-10 space-y-4">
          <Badge variant="indigo">
            <Sparkles className="w-3 h-3 text-indigo-400" /> Hall of Champions
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-100 uppercase tracking-tighter italic leading-none">
            League <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">History</span>
          </h1>
          <p className="text-slate-400 font-medium text-xs max-w-xl">
            A chronological archive of past seasons, division leaders, and historical standings from Lanna Pool Club.
          </p>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="max-w-6xl mx-auto px-4 py-12 relative z-10">
        <Suspense
          fallback={
            <div className="text-slate-400 text-center py-12 font-bold uppercase tracking-wider text-xs">
              Loading league archives...
            </div>
          }
        >
          <HistoryContent />
        </Suspense>
      </div>
    </div>
  );
}
