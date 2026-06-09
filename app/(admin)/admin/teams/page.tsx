import { db } from "@/src/db";
import { teams, divisions, seasons, venues, teamRegistrations, teamMemberships, matches } from "@/src/db/schema";
import { eq, asc, desc, count, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Plus, Trash2, MapPin, Eye } from "lucide-react";
import Link from 'next/link';
import Image from 'next/image';
import SeasonSelector from "./SeasonSelector";
import { syncTeamRegistrations } from "@/src/utils/sync-team-registrations";
import { assertWritePrivilege, getIsReadOnly } from "@/src/utils/auth-guards";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    seasonId?: string;
  }>;
}

export default async function AdminTeamsPage({ searchParams }: PageProps) {
  // Ensure team division registrations are synchronized
  await syncTeamRegistrations();
  const isReadOnly = await getIsReadOnly();

  const params = await searchParams;

  // 1. Fetch all seasons to support dropdown
  const allSeasons = await db.select().from(seasons).orderBy(desc(seasons.startDate));
  const selectedSeasonId = params.seasonId ? Number(params.seasonId) : (allSeasons[0]?.id || null);

  // 2. Fetch all teams registered for the selected season
  // 2. Fetch all required teams dashboard lists in parallel
  const [
    allTeams,
    systemTeams,
    allDivisions,
    allVenuesRaw,
    venueCounts,
    playerCounts
  ] = await Promise.all([
    // Query A: Teams registered for selected season
    db
      .select({
        id: teams.id,
        name: teams.name,
        logoUrl: teams.logoUrl,
        divisionName: divisions.name,
        seasonName: seasons.name,
        homeVenueName: venues.name,
      })
      .from(teams)
      .leftJoin(teamRegistrations, eq(teams.id, teamRegistrations.teamId))
      .leftJoin(divisions, eq(teamRegistrations.divisionId, divisions.id))
      .leftJoin(seasons, eq(teamRegistrations.seasonId, seasons.id))
      .leftJoin(venues, eq(teams.homeVenueId, venues.id))
      .where(selectedSeasonId ? eq(teamRegistrations.seasonId, selectedSeasonId) : undefined)
      .orderBy(asc(teams.name)),
    // Query B: All teams in the system
    db.select().from(teams).orderBy(asc(teams.name)),
    // Query C: Divisions for selected season
    db
      .select({
        id: divisions.id,
        name: divisions.name,
        seasonName: seasons.name,
      })
      .from(divisions)
      .leftJoin(seasons, eq(divisions.seasonId, seasons.id))
      .where(selectedSeasonId ? eq(divisions.seasonId, selectedSeasonId) : undefined)
      .orderBy(asc(divisions.name)),
    // Query D: All venues
    db
      .select()
      .from(venues)
      .orderBy(asc(venues.name)),
    // Query E: Venue team counts
    db
      .select({
        homeVenueId: teams.homeVenueId,
        value: count(),
      })
      .from(teams)
      .groupBy(teams.homeVenueId),
    // Query F: Team player counts for selected season
    db
      .select({
        teamId: teamMemberships.teamId,
        value: count(),
      })
      .from(teamMemberships)
      .where(selectedSeasonId ? eq(teamMemberships.seasonId, selectedSeasonId) : undefined)
      .groupBy(teamMemberships.teamId)
  ]);

  const venueCountsMap = venueCounts.reduce((acc, v) => {
    if (v.homeVenueId) acc[v.homeVenueId] = v.value;
    return acc;
  }, {} as Record<number, number>);

  const venuesList = allVenuesRaw.map((v) => ({
    id: v.id,
    name: v.name,
    isFull: (venueCountsMap[v.id] || 0) >= 2,
  }));

  const playerCountsMap = playerCounts.reduce((acc, p) => {
    if (p.teamId) acc[p.teamId] = p.value;
    return acc;
  }, {} as Record<number, number>);

  // 5. Server Action to register/add a team
  async function addTeam(formData: FormData) {
    "use server";
    await assertWritePrivilege();
    const existingTeamIdVal = formData.get("existingTeamId");
    const existingTeamId = existingTeamIdVal ? Number(existingTeamIdVal) : null;
    const name = formData.get("name") as string;
    const divisionId = Number(formData.get("divisionId"));
    const venueIdInput = formData.get("homeVenueId");
    const homeVenueId = venueIdInput ? Number(venueIdInput) : null;

    if (!divisionId) return;

    // Fetch division to map season
    const [div] = await db.select().from(divisions).where(eq(divisions.id, divisionId));
    if (!div) return;
    const seasonId = div.seasonId;
    if (!seasonId) return;

    let targetTeamId = existingTeamId;

    await db.transaction(async (tx) => {
      if (!targetTeamId) {
        // Register brand new team globally
        if (!name || name.trim() === "") return;

        // Validate venue capacity limit
        if (homeVenueId) {
          const [tenantCount] = await tx
            .select({ value: count() })
            .from(teams)
            .where(eq(teams.homeVenueId, homeVenueId));
          if (tenantCount && tenantCount.value >= 2) {
            console.warn("⚠️ Aborted team creation: Selected Venue already has 2 home teams.");
            return;
          }
        }

        const [newTeam] = await tx
          .insert(teams)
          .values({
            name: name.trim(),
            homeVenueId,
          })
          .returning();

        if (newTeam) {
          targetTeamId = newTeam.id;
        }
      } else {
        // Associate existing team
        if (homeVenueId !== null) {
          await tx.update(teams).set({ homeVenueId }).where(eq(teams.id, targetTeamId));
        }
      }

      if (targetTeamId) {
        // Save division registration for this season
        await tx
          .delete(teamRegistrations)
          .where(
            and(
              eq(teamRegistrations.teamId, targetTeamId),
              eq(teamRegistrations.seasonId, seasonId)
            )
          );

        await tx.insert(teamRegistrations).values({
          teamId: targetTeamId,
          seasonId,
          divisionId,
        });
      }
    });

    revalidatePath("/admin/teams");
    revalidatePath("/standings");
  }

  // 6. Server Action to delete a team
  async function deleteTeam(formData: FormData) {
    "use server";
    await assertWritePrivilege();
    const id = Number(formData.get("id"));

    await db.transaction(async (tx) => {
      await tx.delete(teamMemberships).where(eq(teamMemberships.teamId, id));
      await tx.delete(teamRegistrations).where(eq(teamRegistrations.teamId, id));
      await tx.update(matches).set({ homeTeamId: null }).where(eq(matches.homeTeamId, id));
      await tx.update(matches).set({ awayTeamId: null }).where(eq(matches.awayTeamId, id));
      await tx.delete(teams).where(eq(teams.id, id));
    });

    revalidatePath("/admin/teams");
    revalidatePath("/admin/players");
    revalidatePath("/standings");
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-slate-200">
      <div className="max-w-4xl mx-auto space-y-10">
        <header className="border-b border-slate-900 pb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 block mb-1">Database Operations</span>
            <h1 className="text-4xl font-black text-slate-100 uppercase tracking-tighter italic">Team <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">Management</span></h1>
            <p className="text-slate-500 font-medium text-xs mt-1">Register new teams, assign home arenas, and configure division brackets.</p>
          </div>
          <div className="shrink-0">
            <SeasonSelector seasons={allSeasons} selectedSeasonId={selectedSeasonId} />
          </div>
        </header>

        {/* Add Team Form */}
        {!isReadOnly && (
          <div className="bg-slate-900/40 rounded-[2.5rem] p-8 shadow-2xl border border-slate-900">
            <form action={addTeam} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-3 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">New Team Name</label>
              <input 
                name="name" 
                placeholder="Enter Team Name..." 
                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-slate-100 placeholder:text-slate-800 transition-all shadow-inner text-xs"
              />
            </div>

            <div className="md:col-span-3 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Or Existing Team</label>
              <select 
                name="existingTeamId" 
                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-slate-100 appearance-none transition-all shadow-inner text-xs cursor-pointer"
              >
                <option value="">-- New Team --</option>
                {systemTeams.map((team) => (
                  <option key={team.id} value={team.id} className="bg-slate-950 text-slate-200">
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Assign Division</label>
              <select 
                name="divisionId" 
                required 
                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-slate-100 appearance-none transition-all shadow-inner text-xs cursor-pointer"
              >
                <option value="">Select Division</option>
                {allDivisions.map((div) => (
                  <option key={div.id} value={div.id} className="bg-slate-950 text-slate-200">
                    {div.name} ({div.seasonName})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Home Venue (Optional)</label>
              <select 
                name="homeVenueId" 
                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-slate-100 appearance-none transition-all shadow-inner text-xs cursor-pointer"
              >
                <option value="">No Home Venue</option>
                {venuesList.map((venue) => (
                  <option 
                    key={venue.id} 
                    value={venue.id} 
                    disabled={venue.isFull} 
                    className={venue.isFull ? "text-slate-700 bg-slate-950" : "bg-slate-950 text-slate-200"}
                  >
                    {venue.name} {venue.isFull ? "(Full)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-indigo-900/20 active:scale-95 cursor-pointer">
                <Plus className="w-4 h-4" /> Register
              </button>
            </div>
            </form>
          </div>
        )}

        {/* Teams List */}
        <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-900 shadow-2xl overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-800 bg-slate-900/60 flex justify-between items-center">
            <h2 className="font-black text-slate-100 uppercase tracking-tight text-sm">Active Rosters</h2>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{allTeams.length} Total Teams</span>
          </div>
          
          <div className="divide-y divide-slate-800/60">
            {allTeams.map((team) => {
              const pCount = playerCountsMap[team.id] || 0;
              return (
                <div key={team.id} className="p-6 md:px-8 flex justify-between items-center hover:bg-slate-900/40 transition-colors group">
                  <div className="flex items-center gap-6">
                    {/* Logo/Initials Container */}
                    {team.logoUrl ? (
                      <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-900 p-0.5 flex items-center justify-center shrink-0 shadow-inner group-hover:border-indigo-500/30 transition-colors">
                        <Image
                          src={team.logoUrl}
                          alt={team.name}
                          width={44}
                          height={44}
                          className="object-contain max-w-full max-h-full rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-indigo-950/40 border border-indigo-900/20 flex items-center justify-center font-black text-xs text-indigo-400 shrink-0 shadow-inner group-hover:border-indigo-500/30 transition-colors">
                        {team.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-black text-slate-100 uppercase tracking-tight group-hover:text-indigo-400 transition-colors">{team.name}</h3>
                        
                        {/* Roster Size Badge */}
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md shadow-sm border ${
                          pCount === 0 
                            ? "bg-rose-950/40 text-rose-400 border-rose-900/20 animate-pulse font-extrabold" 
                            : "bg-slate-950 text-slate-400 border-slate-850"
                        }`}>
                          {pCount} {pCount === 1 ? "Competitor" : "Competitors"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{team.seasonName}</span>
                        <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-950/30 px-2 py-0.5 rounded-md border border-indigo-900/30 shadow-sm">
                          {team.divisionName}
                        </span>
                        
                        {/* Home Venue Badge */}
                        <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {team.homeVenueName ? (
                            <span className="font-black text-slate-300">{team.homeVenueName}</span>
                          ) : (
                            <span className="italic text-rose-500/80 font-black">No Arena</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link 
                      href={`/admin/teams/${team.id}`}
                      className="p-2 text-slate-600 hover:text-indigo-400 transition-colors"
                      title={isReadOnly ? "View Details" : "Edit Team"}
                    >
                      {isReadOnly ? (
                        <Eye className="w-5 h-5 text-indigo-400" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                      )}
                    </Link>

                    {!isReadOnly && (
                      <form action={deleteTeam} onSubmit={(e) => {
                        if (!confirm("Are you sure you want to delete this team? All memberships and registrations will be deleted.")) {
                          e.preventDefault();
                        }
                      }}>
                        <input type="hidden" name="id" value={team.id} />
                        <button className="p-2 text-slate-800 hover:text-red-500 transition-colors cursor-pointer">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}

            {allTeams.length === 0 && (
              <div className="p-20 text-center text-slate-850 font-black uppercase tracking-[0.2em] italic text-xs">
                No teams registered inside the system ledger.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}