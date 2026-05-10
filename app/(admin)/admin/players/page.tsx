import { db } from "@/db";
import { players, teams } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function PlayersPage() {
  // Fetch players and their associated team info
  const allPlayers = await db
    .select({
      id: players.id,
      name: players.name,
      handicap: players.handicap,
      teamName: teams.name,
    })
    .from(players)
    .leftJoin(teams, eq(players.teamId, teams.id));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Players</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + Add New Player
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Player Name</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Team</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Handicap</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {allPlayers.map((player) => (
              <tr key={player.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">{player.name}</td>
                <td className="px-6 py-4 text-slate-600">{player.teamName || "Unassigned"}</td>
                <td className="px-6 py-4 text-slate-600">{player.handicap}</td>
                <td className="px-6 py-4 text-right text-blue-600 hover:underline cursor-pointer">Edit</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}