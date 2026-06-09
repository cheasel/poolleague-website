import { db } from "@/src/db";
import { seasons, divisions, matches } from "@/src/db/schema";
import { eq, asc, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import MatchweekManagerForm from "./MatchweekManagerForm";
import { updateSeasonEndDate } from "@/src/utils/season-utils";
import { assertWritePrivilege, getIsReadOnly } from "@/src/utils/auth-guards";

export const dynamic = "force-dynamic";

interface WeeksPageProps {
  searchParams: Promise<{
    seasonId?: string;
    divisionId?: string;
  }>;
}

interface WeekItem {
  weekNumber: number;
  originalWeek: number;
  date: string;
  matchups: string[];
  completedMatches: number;
  totalMatches: number;
}

export default async function MatchweeksPage({ searchParams }: WeeksPageProps) {
  const params = await searchParams;
  const isReadOnly = await getIsReadOnly();

  // 1. Fetch seasons & divisions concurrently to optimize setup loading times
  const [allSeasons, allDivisions] = await Promise.all([
    db.select().from(seasons).orderBy(desc(seasons.startDate)),
    db.select().from(divisions).orderBy(asc(divisions.name))
  ]);

  const latestSeasonId = allSeasons[0]?.id.toString() || "";
  const seasonIdParam = params.seasonId && params.seasonId !== "all" ? params.seasonId : latestSeasonId;
  const divisionIdParam = params.divisionId || "";

  let weekData: WeekItem[] = [];

  // 2. Fetch matches for the division if selected
  if (divisionIdParam) {
    const rawMatches = await db.query.matches.findMany({
      where: eq(matches.divisionId, Number(divisionIdParam)),
      with: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: asc(matches.weekNumber),
    });

    const weeksMap = new Map<number, WeekItem>();

    const formatLocalDate = (dateObj: Date | null) => {
      if (!dateObj) return "";
      const d = new Date(dateObj);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    rawMatches.forEach((m) => {
      const weekNum = m.weekNumber;
      if (!weeksMap.has(weekNum)) {
        weeksMap.set(weekNum, {
          weekNumber: weekNum,
          originalWeek: weekNum,
          date: formatLocalDate(m.date),
          matchups: [],
          completedMatches: 0,
          totalMatches: 0,
        });
      }

      const item = weeksMap.get(weekNum)!;
      item.totalMatches += 1;
      if (m.status === "completed") {
        item.completedMatches += 1;
      }
      
      if (m.homeTeam && m.awayTeam) {
        item.matchups.push(`${m.homeTeam.name} vs ${m.awayTeam.name}`);
      }
    });

    weekData = Array.from(weeksMap.values()).sort((a, b) => a.weekNumber - b.weekNumber);
  }

  // --- SAVE ADJUSTMENTS SERVER ACTION ---
  async function saveMatchweeksAction(
    divisionId: number,
    adjustments: Array<{ originalWeek: number; newWeek: number; newDate: string }>
  ) {
    "use server";
    await assertWritePrivilege();

    if (!divisionId || !adjustments || adjustments.length === 0) return;

    // Validate uniqueness of new week numbers
    const newWeeksList = adjustments.map(a => a.newWeek);
    const hasDupes = newWeeksList.some((w, idx) => newWeeksList.indexOf(w) !== idx);
    if (hasDupes) {
      throw new Error("Cannot save adjustments: Week numbers must be unique.");
    }

    await db.transaction(async (tx) => {
      // Step 1: Temporarily shift matches to negative week numbers to prevent intermediate duplicate conflicts
      for (const adj of adjustments) {
        await tx
          .update(matches)
          .set({ weekNumber: -(adj.originalWeek + 1000) })
          .where(
            and(
              eq(matches.divisionId, divisionId),
              eq(matches.weekNumber, adj.originalWeek)
            )
          );
      }

      // Step 2: Set final week numbers and dates
      for (const adj of adjustments) {
        const newDate = adj.newDate ? new Date(`${adj.newDate}T20:00:00`) : null;
        await tx
          .update(matches)
          .set({
            weekNumber: adj.newWeek,
            date: newDate,
          })
          .where(
            and(
              eq(matches.divisionId, divisionId),
              eq(matches.weekNumber, -(adj.originalWeek + 1000))
            )
          );
      }

      // Update the season's endDate
      const [div] = await tx
        .select({ seasonId: divisions.seasonId })
        .from(divisions)
        .where(eq(divisions.id, divisionId));
      if (div?.seasonId) {
        await updateSeasonEndDate(div.seasonId, tx);
      }
    });

    revalidatePath("/admin/matches");
    revalidatePath("/admin/matches/weeks");
  }

  return (
    <MatchweekManagerForm
      seasons={allSeasons}
      divisions={allDivisions}
      initialWeekData={weekData}
      seasonIdParam={seasonIdParam}
      divisionIdParam={divisionIdParam}
      saveAction={saveMatchweeksAction}
      isReadOnly={isReadOnly}
    />
  );
}
