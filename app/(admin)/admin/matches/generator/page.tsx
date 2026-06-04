import { db } from "@/src/db";
import { teams, divisions, matches, seasons, teamRegistrations } from "@/src/db/schema";
import { eq, asc, desc, and, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, AlertTriangle } from "lucide-react";
import GeneratorForm from "./GeneratorForm";

export const dynamic = "force-dynamic";

interface GeneratorPageProps {
  searchParams: Promise<{
    error?: string;
    date?: string;
    home?: string;
    away?: string;
    divisionId?: string;
  }>;
}

export default async function MatchScheduleGeneratorPage({ searchParams }: GeneratorPageProps) {
  const params = await searchParams;
  const error = params.error;
  const errorDate = params.date;
  const clashingHome = params.home ? decodeURIComponent(params.home) : "";
  const clashingAway = params.away ? decodeURIComponent(params.away) : "";
  const selectedDivId = params.divisionId || "";

  // 1. Fetch seasons and divisions so the admin can choose which season and league tier bracket to schedule
  const allSeasons = await db.select().from(seasons).orderBy(desc(seasons.startDate));

  const allDivisionsRaw = await db
    .select({
      id: divisions.id,
      name: divisions.name,
      seasonId: divisions.seasonId,
      seasonStartDate: seasons.startDate,
    })
    .from(divisions)
    .leftJoin(seasons, eq(divisions.seasonId, seasons.id))
    .orderBy(asc(divisions.tier));

  const formatLocalDate = (dateObj: Date | null) => {
    if (!dateObj) return "";
    const d = new Date(dateObj);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const allDivisionsFormatted = allDivisionsRaw.map(d => ({
    id: d.id,
    name: d.name,
    seasonId: d.seasonId,
    seasonStartDate: formatLocalDate(d.seasonStartDate),
  }));

  // --- ROUND-ROBIN GENERATOR SERVER ACTION ---
  async function generateLeagueSchedule(formData: FormData) {
    "use server";

    const divisionId = Number(formData.get("divisionId"));
    const startDateStr = formData.get("startDate") as string;

    if (!divisionId || !startDateStr) return;

    // Rule 4: Verify if there are any completed matches in the selected division
    const completedMatches = await db
      .select({ id: matches.id })
      .from(matches)
      .where(
        and(
          eq(matches.divisionId, divisionId),
          eq(matches.status, "completed")
        )
      )
      .limit(1);

    if (completedMatches.length > 0) {
      redirect(`/admin/matches/generator?error=completed_matches&divisionId=${divisionId}`);
    }

    // Fetch division to map seasonId
    const [div] = await db.select().from(divisions).where(eq(divisions.id, divisionId));
    if (!div) return;
    const seasonId = div.seasonId;
    if (!seasonId) return;

    // 1. Pull all teams assigned to this specific division bracket with their home venue
    const divisionTeams = await db
      .select({ id: teams.id, name: teams.name, homeVenueId: teams.homeVenueId })
      .from(teamRegistrations)
      .innerJoin(teams, eq(teamRegistrations.teamId, teams.id))
      .where(
        and(
          eq(teamRegistrations.divisionId, divisionId),
          eq(teamRegistrations.seasonId, seasonId)
        )
      );

    if (divisionTeams.length < 2) return;

    // Rule 1: All teams in the division must have a venue assigned
    const hasMissingVenues = divisionTeams.some((team) => !team.homeVenueId);
    if (hasMissingVenues) {
      redirect(`/admin/matches/generator?error=missing_venues&divisionId=${divisionId}`);
    }

    // 2. Prepare teams array for the Circle Method Algorithm
    const list = [...divisionTeams];
    if (list.length % 2 !== 0) {
      list.push({ id: -1, name: "BYE", homeVenueId: -1 }); 
    }

    const numTeams = list.length;
    const roundsCount = numTeams - 1;
    const matchesPerRound = numTeams / 2;

    const generatedFixtures: Array<{
      homeTeamId: number;
      awayTeamId: number;
      date: Date;
      weekNumber: number;
    }> = [];

    // Base calendar anchor timestamp
    const baseTimelineMs = new Date(startDateStr).getTime();

    // Fetch existing matches in other divisions to check for Rule 2 (venue clashes)
    const existingMatchesWithVenue = await db
      .select({
        date: matches.date,
        homeVenueId: teams.homeVenueId,
      })
      .from(matches)
      .leftJoin(teams, eq(matches.homeTeamId, teams.id))
      .where(ne(matches.divisionId, divisionId));

    // Normalize date comparison key to YYYY-MM-DD
    const getCalendarDateKey = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Date String -> Set of booked homeVenueIds on that date
    const bookedVenuesByDate = new Map<string, Set<number>>();
    existingMatchesWithVenue.forEach((m) => {
      if (m.date && m.homeVenueId) {
        const dateKey = getCalendarDateKey(new Date(m.date));
        if (!bookedVenuesByDate.has(dateKey)) {
          bookedVenuesByDate.set(dateKey, new Set());
        }
        bookedVenuesByDate.get(dateKey)!.add(m.homeVenueId);
      }
    });

    const singleLegRounds = roundsCount;
    const totalRounds = singleLegRounds * 2;

    // Helper functions for checking/booking venue slots
    const isVenueBooked = (dateKey: string, venueId: number) => {
      const bookedSet = bookedVenuesByDate.get(dateKey);
      return bookedSet ? bookedSet.has(venueId) : false;
    };

    const bookVenue = (dateKey: string, venueId: number) => {
      if (!bookedVenuesByDate.has(dateKey)) {
        bookedVenuesByDate.set(dateKey, new Set());
      }
      bookedVenuesByDate.get(dateKey)!.add(venueId);
    };

    // 3. Circle Rotation Round-Robin Algorithm Execution with Venue Checking
    const homeCounts1: Record<number, number> = {};
    divisionTeams.forEach((t) => {
      homeCounts1[t.id] = 0;
    });

    for (let round = 0; round < singleLegRounds; round++) {
      const roundDate1 = new Date(baseTimelineMs + round * 7 * 24 * 60 * 60 * 1000);
      const dateKey1 = getCalendarDateKey(roundDate1);

      const round2 = round + singleLegRounds;
      const roundDate2 = new Date(baseTimelineMs + round2 * 7 * 24 * 60 * 60 * 1000);
      const dateKey2 = getCalendarDateKey(roundDate2);

      for (let matchIdx = 0; matchIdx < matchesPerRound; matchIdx++) {
        const homeIdx = (round + matchIdx) % (numTeams - 1);
        let awayIdx = (numTeams - 1 - matchIdx + round) % (numTeams - 1);

        // The last element stays locked in position while others rotate around it
        if (matchIdx === 0) {
          awayIdx = numTeams - 1;
        }

        const teamA = list[homeIdx];
        const teamB = list[awayIdx];

        // Skip fixtures involving the dummy BYE team
        if (teamA.id === -1 || teamB.id === -1) continue;

        // Alternate home/away advantages each round to maintain balance
        const defaultAIsHome = round % 2 === 0;

        // Greedy choice: assign home to the team with fewer home games in Leg 1 so far
        let aIsHome1 = defaultAIsHome;
        if (homeCounts1[teamA.id] < homeCounts1[teamB.id]) {
          aIsHome1 = true;
        } else if (homeCounts1[teamB.id] < homeCounts1[teamA.id]) {
          aIsHome1 = false;
        }

        let homeTeamId1 = aIsHome1 ? teamA.id : teamB.id;
        let awayTeamId1 = aIsHome1 ? teamB.id : teamA.id;

        // Leg 2 is the exact reverse of Leg 1 (venue mirrored)
        let homeTeamId2 = awayTeamId1;
        let awayTeamId2 = homeTeamId1;

        const homeTeamDetails1 = divisionTeams.find((t) => t.id === homeTeamId1);
        const awayTeamDetails1 = divisionTeams.find((t) => t.id === awayTeamId1);
        const homeTeamDetails2 = divisionTeams.find((t) => t.id === homeTeamId2);
        const awayTeamDetails2 = divisionTeams.find((t) => t.id === awayTeamId2);

        const venueId1 = homeTeamDetails1?.homeVenueId!;
        const venueId2 = homeTeamDetails2?.homeVenueId!;

        let finalHomeId1 = homeTeamId1;
        let finalAwayId1 = awayTeamId1;
        let finalHomeId2 = homeTeamId2;
        let finalAwayId2 = awayTeamId2;

        // Check if venue1 is booked on dateKey1, OR venue2 is booked on dateKey2
        const hasClash = isVenueBooked(dateKey1, venueId1) || isVenueBooked(dateKey2, venueId2);

        if (hasClash) {
          // Attempt to swap home/away for both matches to keep the home & away schedule intact
          finalHomeId1 = homeTeamId2;
          finalAwayId1 = awayTeamId2;
          finalHomeId2 = homeTeamId1;
          finalAwayId2 = awayTeamId1;

          const swappedVenueId1 = venueId2;
          const swappedVenueId2 = venueId1;

          const hasSwappedClash = isVenueBooked(dateKey1, swappedVenueId1) || isVenueBooked(dateKey2, swappedVenueId2);

          if (hasSwappedClash) {
            // Unresolvable venue clash on either of the leg dates
            const clashingHomeName = homeTeamDetails1?.name || "Unknown Team";
            const clashingAwayName = awayTeamDetails1?.name || "Unknown Team";
            redirect(
              `/admin/matches/generator?error=venue_clash&date=${dateKey1}&home=${encodeURIComponent(
                clashingHomeName
              )}&away=${encodeURIComponent(clashingAwayName)}&divisionId=${divisionId}`
            );
          } else {
            // Swapped configuration is conflict-free; book the swapped venues
            bookVenue(dateKey1, swappedVenueId1);
            bookVenue(dateKey2, swappedVenueId2);
          }
        } else {
          // Default configuration works; book the default venues
          bookVenue(dateKey1, venueId1);
          bookVenue(dateKey2, venueId2);
        }

        // Track the actual assigned Leg 1 home team to keep greedy counts correct
        homeCounts1[finalHomeId1]++;

        generatedFixtures.push({
          homeTeamId: finalHomeId1,
          awayTeamId: finalAwayId1,
          date: roundDate1,
          weekNumber: round + 1,
        });

        generatedFixtures.push({
          homeTeamId: finalHomeId2,
          awayTeamId: finalAwayId2,
          date: roundDate2,
          weekNumber: round2 + 1,
        });
      }
    }

    // 4. Plant fixtures into database using a single transaction to ensure safety
    if (generatedFixtures.length > 0) {
      await db.transaction(async (tx) => {
        // Rule 3: Delete old matches in this division first
        await tx.delete(matches).where(eq(matches.divisionId, divisionId));

        // Insert newly generated round-robin matches
        await tx.insert(matches).values(
          generatedFixtures.map((fix) => ({
            seasonId: seasonId,
            divisionId: divisionId, 
            homeTeamId: fix.homeTeamId,
            awayTeamId: fix.awayTeamId,
            weekNumber: fix.weekNumber,
            date: fix.date,
            status: "scheduled" as const,
            homeScore: 0,
            awayScore: 0,
          }))
        );
      });
    }

    // Clear caches and redirect cleanly back to the division dashboard
    revalidatePath("/admin/matches");
    redirect(`/admin/matches?division=${divisionId}`);
  }

  return (
    <div className="space-y-10 max-w-3xl mx-auto pb-16 px-4 pt-4 text-slate-200">
      <header className="space-y-6">
        <Link href="/admin/matches" className="inline-flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-all">
          <ArrowLeft className="w-4 h-4" /> Cancel and Back to Fixtures
        </Link>

        {/* Validation Errors Banner */}
        {error && (
          <div className="p-5 bg-red-950/20 border border-red-900/40 rounded-2xl flex gap-4 text-red-400 shadow-inner">
            <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5 opacity-80" />
            <div className="text-[10px] font-black uppercase tracking-widest space-y-1.5">
              <p className="text-red-400">Generation Blocked</p>
              <p className="text-red-400/80 normal-case font-bold leading-relaxed">
                {error === "completed_matches" && (
                  "Cannot generate matches: This division already has completed matches. You can only edit or add matches manually."
                )}
                {error === "missing_venues" && (
                  "Cannot generate matches: Some teams in this division do not have a home venue assigned. All teams must have a venue before generating matches."
                )}
                {error === "venue_clash" && (
                  `Cannot generate matches: A venue conflict was detected on ${errorDate} between "${clashingHome}" and "${clashingAway}" that cannot be resolved automatically by role-swapping.`
                )}
              </p>
            </div>
          </div>
        )}
      </header>

      <section className="bg-slate-900/40 backdrop-blur-md p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-900 space-y-8 relative overflow-hidden group hover:border-slate-800 transition-all">
        <div className="absolute top-0 right-0 w-80 h-full bg-indigo-600/5 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-indigo-400 mb-6 shadow-inner">
            <Sparkles className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter italic leading-none">Schedule <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">Engine</span></h1>
          <p className="text-slate-500 font-medium text-xs mt-2 max-w-xl leading-relaxed">
            Generate a full round-robin tournament calendar. The algorithm perfectly balances home/away rotations, enforces venue restrictions, and handles odd-numbered splits automatically.
          </p>
        </div>

        {/* Warning Callout Card */}
        <div className="p-5 bg-amber-950/20 border border-amber-900/40 rounded-2xl flex gap-4 text-amber-500 relative z-10 shadow-inner">
          <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5 opacity-80" />
          <div className="text-[10px] font-black uppercase tracking-widest space-y-1.5">
            <p className="text-amber-400">Operational Notice</p>
            <p className="text-amber-500/60 normal-case font-bold leading-relaxed">
              Executing this schedule generation deletes any existing matches in this division first and inserts the newly generated calendar immediately.
            </p>
          </div>
        </div>

        {/* Configurations Setup Form Panel */}
        <GeneratorForm 
          divisions={allDivisionsFormatted}
          seasons={allSeasons}
          selectedDivId={selectedDivId}
          action={generateLeagueSchedule}
        />
      </section>
    </div>
  );
}