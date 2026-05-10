import { db } from "@/db";
import { players, teams } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import AddPlayerForm from "./add-player-form";

export default async function PlayersPage() {
    // 1. Fetch Teams (for the dropdown) and Players (for the table)
    const allTeams = await db.select().from(teams);

    const allPlayers = await db
        .select({
            id: players.id,
            name: players.name,
            handicap: players.handicap,
            teamName: teams.name,
        })
        .from(players)
        .leftJoin(teams, eq(players.teamId, teams.id));

    // 2. The Server Action to handle form submission
    async function createPlayer(formData: FormData) {
        "use server";
        const name = formData.get("name") as string;
        const teamIdString = formData.get("teamId");
        const handicap = Number(formData.get("handicap")) || 0;

        // Convert teamId to number or null if "Free Agent" is selected
        const teamId = teamIdString ? Number(teamIdString) : null;

        if (!name) return;

        await db.insert(players).values({
            name,
            teamId,
            handicap,
        });

        // This refreshes the page data instantly
        revalidatePath("/admin/players");
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Manage Players</h1>
            </div>

            {/* 3. The Input Form Section */}
            <section className="mb-10">
                <h2 className="text-lg font-semibold mb-4 text-slate-700">Add New Player</h2>
                <AddPlayerForm teams={allTeams} action={createPlayer} />
            </section>

            {/* 4. The Data Table Section */}
            <section>
                <h2 className="text-lg font-semibold mb-4 text-slate-700">Active Players</h2>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Player Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Team</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Handicap</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {allPlayers.map((player) => (
                                <tr key={player.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 font-semibold text-slate-900">{player.name}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                            {player.teamName || "Free Agent"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`font-mono ${player.handicap === 0 ? "text-green-600 font-bold" : "text-slate-600"}`}>
                                            {player.handicap}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-slate-400 hover:text-blue-600 font-medium transition-colors mr-4">Edit</button>
                                        <button className="text-slate-400 hover:text-red-600 font-medium transition-colors">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {allPlayers.length === 0 && (
                        <div className="p-10 text-center text-slate-500">
                            No players found. Use the form above to add your first player.
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}