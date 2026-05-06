import { db } from "@/db"; // Check if your path alias is @/ or ../../
import { teams, venues } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function deleteTeam(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  await db.delete(teams).where(eq(teams.id, id));
  revalidatePath("/admin/teams");
}

export default async function TeamsPage() {
  // Fetch teams and join with venues to see where they play
  const allTeams = await db.select({
    id: teams.id,
    name: teams.name,
    venueName: venues.name,
  })
  .from(teams)
  .leftJoin(venues, eq(teams.homeVenueId, venues.id));
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Teams</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          + Add New Team
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Home Venue</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {allTeams.map((team) => (
              <tr key={team.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{team.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{team.venueName || "No Venue"}</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-blue-600 hover:underline">Edit</button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-3">
                    <button className="text-blue-600 hover:text-blue-900">Edit</button>
                    <form action={deleteTeam}>
                      <input type="hidden" name="id" value={team.id} />
                      <button type="submit" className="text-red-600 hover:text-red-900">Delete</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}