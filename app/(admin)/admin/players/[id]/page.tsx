import { db } from "@/src/db";
import { players, teams, divisions } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseStorage } from "@/src/lib/supabase-storage"; // 🎯 Import our storage helper
import Link from "next/link";
import Image from "next/image";
import { Save, ArrowLeft, UserCircle2, Camera } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditPlayerPage({ params }: PageProps) {
  const { id } = await params;
  const playerId = Number(id);

  const [player] = await db.select().from(players).where(eq(players.id, playerId));
  const allTeams = await db.select().from(teams).orderBy(asc(teams.name));
  const allDivisions = await db.select().from(divisions);

  if (!player) {
    return <div className="p-20 text-center font-black uppercase text-slate-400">Player not found.</div>;
  }

  const divMap = new Map(allDivisions.map(d => [d.id, d.name]));

  // --- SERVER ACTION ---
  async function updatePlayer(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const avatarFile = formData.get("avatarFile") as File;
    const teamIdVal = formData.get("teamId");
    const teamId = teamIdVal ? Number(teamIdVal) : null;

    let publicAvatarUrl = player.imageUrl; // Default back to the current database link if unchanged

    // Run the upload code only if a brand new file is provided
    if (avatarFile && avatarFile.size > 0) {
      const fileExtension = avatarFile.name.split('.').pop();
      const fileName = `player-${playerId}-${Date.now()}.${fileExtension}`;

      const { data, error } = await supabaseStorage.storage
        .from("player-avatars")
        .upload(fileName, avatarFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (!error && data) {
        const { data: linkData } = supabaseStorage.storage
          .from("player-avatars")
          .getPublicUrl(data.path);
          
        publicAvatarUrl = linkData.publicUrl;
      } else if (error) {
        console.error("Supabase Avatar Upload Error:", error.message);
      }
    }

    await db.update(players)
      .set({ 
        name, 
        teamId: teamId || null, 
        imageUrl: publicAvatarUrl 
      })
      .where(eq(players.id, playerId));

    revalidatePath("/admin/players");
    revalidatePath(`/players/${playerId}`); 
    revalidatePath("/players"); 
    redirect("/admin/players");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-10 pb-16 px-4 text-slate-200">
      <header className="flex items-center justify-between">
        <Link href="/admin/players" className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Competitor Registry
        </Link>
        <div className="bg-slate-900 border border-slate-800 text-slate-400 px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-inner">
          Entry ID: {playerId}
        </div>
      </header>

      <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-10 shadow-2xl border border-slate-900 relative overflow-hidden group hover:border-slate-800 transition-all">
        <div className="absolute top-0 right-0 w-64 h-full bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="flex items-center gap-5 mb-12 relative z-10">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-indigo-400 shadow-inner">
            <UserCircle2 className="w-7 h-7" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter italic leading-none">Update <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">Competitor</span></h1>
        </div>

        {/* 🎯 FIXED: Form now includes encType for files */}
        <form action={updatePlayer} encType="multipart/form-data" className="space-y-8 relative z-10">
          
          {/* Current Profile Picture Preview Element */}
          {player.imageUrl && (
            <div className="flex items-center gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800/60">
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-slate-900 border border-slate-800">
                <Image src={player.imageUrl} alt="Player avatar" fill className="object-cover" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Current Avatar Frame</div>
                <div className="text-xs font-bold text-indigo-400">Stored inside Cloud Matrix Storage</div>
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Full Player Name</label>
            <input 
              name="name" 
              defaultValue={player.name} 
              required 
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-white transition-all shadow-inner placeholder:text-slate-800"
            />
          </div>

          {/* 🎯 NEW: Replaced Text Link Input with a File Upload input */}
          <div className="space-y-2.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Competitor Identity Photo</label>
            <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-2xl p-2.5 group">
              <input 
                type="file"
                name="avatarFile" 
                accept="image/png, image/jpeg, image/webp" 
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
              <div className="flex items-center gap-3 px-2 py-1 text-slate-400">
                <Camera className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold">Upload new profile avatar file...</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Team Assignment</label>
            <select 
              name="teamId" 
              defaultValue={player.teamId || ""} 
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-white appearance-none transition-all shadow-inner"
            >
              <option value="">No Team (Free Agent)</option>
              {allTeams.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.divisionId ? divMap.get(t.divisionId) : "No Bracket"})
                </option>
              ))}
            </select>
          </div>

          <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-900/20 active:scale-95">
            <Save className="w-4 h-4 stroke-[2.5]" /> Save Competitor Profile
          </button>
        </form>
      </div>
    </div>
  );
}