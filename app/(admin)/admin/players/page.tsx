import { db } from "@/src/db";
import { players, teams, seasons, teamMemberships, teamRegistrations, matchGames } from "@/src/db/schema";
import { eq, asc, and, desc, sql, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { revalidatePath } from "next/cache";
import { Plus } from "lucide-react";
import PlayersList from "./players-list";
import AddPlayerForm from "./add-player-form";
import { syncMemberships } from "@/src/utils/sync-memberships";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    seasonId?: string;
  }>;
}

export default async function AdminPlayersPage({ searchParams }: PageProps) {
  // Ensure team memberships are synchronized
  await syncMemberships();

  const params = await searchParams;

  // 1. Fetch all seasons to support dropdown
  const allSeasons = await db.select().from(seasons).orderBy(desc(seasons.startDate));
  const selectedSeasonId = params.seasonId ? Number(params.seasonId) : (allSeasons[0]?.id || null);

  // Find previous season relative to selectedSeasonId
  const selectedIdx = allSeasons.findIndex(s => s.id === selectedSeasonId);
  const previousSeasonId = selectedIdx !== -1 && selectedIdx + 1 < allSeasons.length
    ? allSeasons[selectedIdx + 1].id
    : null;

  // Set up aliases for joining current vs previous season memberships and teams
  const currentMemberships = alias(teamMemberships, "currentMemberships");
  const currentTeams = alias(teams, "currentTeams");
  const previousMemberships = alias(teamMemberships, "previousMemberships");
  const previousTeams = alias(teams, "previousTeams");

  // 2. Fetch players joined with teamMemberships for the selected season and previous season
  const allPlayers = await db
    .select({
      id: players.id,
      name: players.name,
      imageUrl: players.imageUrl,
      teamName: currentTeams.name,
      teamId: currentMemberships.teamId,
      teamLogoUrl: currentTeams.logoUrl,
      prevTeamName: previousTeams.name,
      prevTeamId: previousMemberships.teamId,
    })
    .from(players)
    .leftJoin(
      currentMemberships,
      and(
        eq(players.id, currentMemberships.playerId),
        selectedSeasonId ? eq(currentMemberships.seasonId, selectedSeasonId) : sql`1=0`
      )
    )
    .leftJoin(currentTeams, eq(currentMemberships.teamId, currentTeams.id))
    .leftJoin(
      previousMemberships,
      and(
        eq(players.id, previousMemberships.playerId),
        previousSeasonId ? eq(previousMemberships.seasonId, previousSeasonId) : sql`1=0`
      )
    )
    .leftJoin(previousTeams, eq(previousMemberships.teamId, previousTeams.id))
    .orderBy(asc(players.name));

  const allTeams = await db.select().from(teams).orderBy(asc(teams.name));

  // 3. Server Action to add players (supports comma-separated names)
  async function addPlayer(formData: FormData) {
    "use server";
    const nameInput = formData.get("name") as string;
    const teamIdVal = formData.get("teamId");
    const teamId = teamIdVal ? Number(teamIdVal) : null;
    const seasonIdVal = formData.get("seasonId");
    const seasonId = seasonIdVal ? Number(seasonIdVal) : null;

    if (!nameInput) return;

    // Split input names by comma for bulk creation support
    const names = nameInput
      .split(",")
      .map(n => n.trim())
      .filter(n => n.length > 0);

    if (names.length === 0) return;

    await db.transaction(async (tx) => {
      // Find divisionId if a team and season are specified
      let divisionId: number | null = null;
      if (teamId && seasonId) {
        const [reg] = await tx
          .select()
          .from(teamRegistrations)
          .where(
            and(
              eq(teamRegistrations.teamId, teamId),
              eq(teamRegistrations.seasonId, seasonId)
            )
          );
        divisionId = reg?.divisionId || null;
      }

      for (const name of names) {
        // Create player record
        const [insertedPlayer] = await tx
          .insert(players)
          .values({
            name,
          })
          .returning();

        // If team and season are specified, insert season membership
        if (insertedPlayer && teamId && seasonId) {
          await tx.insert(teamMemberships).values({
            playerId: insertedPlayer.id,
            teamId,
            seasonId,
            divisionId,
          });
        }
      }
    });

    revalidatePath("/admin/players");
    revalidatePath("/players");
  }

  // 4. Server Action to delete a player
  async function deletePlayer(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));

    await db.transaction(async (tx) => {
      // 1. Wipe team memberships
      await tx.delete(teamMemberships).where(eq(teamMemberships.playerId, id));
      // 2. Nullify player references in matchGames
      await tx.update(matchGames).set({ player1Id: null }).where(eq(matchGames.player1Id, id));
      await tx.update(matchGames).set({ player1PartnerId: null }).where(eq(matchGames.player1PartnerId, id));
      await tx.update(matchGames).set({ player2Id: null }).where(eq(matchGames.player2Id, id));
      await tx.update(matchGames).set({ player2PartnerId: null }).where(eq(matchGames.player2PartnerId, id));
      // 3. Delete player
      await tx.delete(players).where(eq(players.id, id));
    });

    revalidatePath("/admin/players");
    revalidatePath("/players");
  }

  // 5. Server Action to change a player's team inline
  async function changePlayerTeam(formData: FormData) {
    "use server";
    const playerId = Number(formData.get("playerId"));
    const teamIdVal = formData.get("teamId");
    const teamId = teamIdVal ? Number(teamIdVal) : null;
    const seasonIdVal = formData.get("seasonId");
    const seasonId = seasonIdVal ? Number(seasonIdVal) : null;

    if (!playerId || !seasonId) return;

    await db.transaction(async (tx) => {
      // Wipe old membership for this season
      await tx
        .delete(teamMemberships)
        .where(
          and(
            eq(teamMemberships.playerId, playerId),
            eq(teamMemberships.seasonId, seasonId)
          )
        );

      // Create new membership if team is selected
      if (teamId) {
        const [reg] = await tx
          .select()
          .from(teamRegistrations)
          .where(
            and(
              eq(teamRegistrations.teamId, teamId),
              eq(teamRegistrations.seasonId, seasonId)
            )
          );

        await tx.insert(teamMemberships).values({
          playerId,
          teamId,
          seasonId,
          divisionId: reg?.divisionId || null,
        });
      }
    });

    revalidatePath("/admin/players");
    revalidatePath("/players");
  }

  // 6. Server Action to bulk assign multiple players to a team
  async function bulkAssignPlayers(formData: FormData) {
    "use server";
    const playerIdsStr = formData.get("playerIds") as string;
    const teamIdVal = formData.get("teamId");
    const teamId = teamIdVal ? Number(teamIdVal) : null;
    const seasonIdVal = formData.get("seasonId");
    const seasonId = seasonIdVal ? Number(seasonIdVal) : null;

    if (!playerIdsStr || !seasonId) return;

    const playerIds = playerIdsStr.split(",").map(Number).filter(Boolean);
    if (playerIds.length === 0) return;

    await db.transaction(async (tx) => {
      // Wipe old membership for these players for this season
      await tx
        .delete(teamMemberships)
        .where(
          and(
            inArray(teamMemberships.playerId, playerIds),
            eq(teamMemberships.seasonId, seasonId)
          )
        );

      // Create new memberships if team is selected
      if (teamId) {
        const [reg] = await tx
          .select()
          .from(teamRegistrations)
          .where(
            and(
              eq(teamRegistrations.teamId, teamId),
              eq(teamRegistrations.seasonId, seasonId)
            )
          );

        const newMemberships = playerIds.map(pId => ({
          playerId: pId,
          teamId,
          seasonId,
          divisionId: reg?.divisionId || null,
        }));

        await tx.insert(teamMemberships).values(newMemberships);
      }
    });

    revalidatePath("/admin/players");
    revalidatePath("/players");
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-slate-200">
      <div className="max-w-4xl mx-auto space-y-10">
        <header className="border-b border-slate-900 pb-8">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 block mb-1">Database Operations</span>
          <h1 className="text-4xl font-black text-slate-100 uppercase tracking-tighter italic">Player <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">Registry</span></h1>
          <p className="text-slate-500 font-medium text-xs mt-1">Manage league competitors and their team affiliations.</p>
        </header>

        {/* Add Player Form (Preserves team select state) */}
        <AddPlayerForm 
          teams={allTeams}
          seasonId={selectedSeasonId}
          addPlayerAction={addPlayer}
        />

        {/* Players List with Client-Side Interactive Filtering */}
        <PlayersList 
          initialPlayers={allPlayers}
          teams={allTeams}
          seasons={allSeasons.map(s => ({ id: s.id, name: s.name }))}
          selectedSeasonId={selectedSeasonId || undefined}
          deletePlayerAction={deletePlayer}
          changePlayerTeamAction={changePlayerTeam}
          bulkAssignPlayersAction={bulkAssignPlayers}
        />
      </div>
    </div>
  );
}

