import { db } from "@/src/db";
import { teams, divisions, seasons } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseStorage } from "@/src/lib/supabase-storage"; // 🎯 Import our storage helper
import Link from "next/link";
import Image from "next/image";
import { Save, ArrowLeft, Users, ImageIcon } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditTeamPage({ params }: PageProps) {
  const { id } = await params;
  const teamId = Number(id);

  // 1. Fetch the team and all available divisions
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  const allDivisions = await db
    .select({
      id: divisions.id,
      name: divisions.name,
      seasonName: seasons.name,
    })
    .from(divisions)
    .leftJoin(seasons, eq(divisions.seasonId, seasons.id))
    .orderBy(asc(divisions.name));

  if (!team) return <div className="p-20 text-center font-black uppercase text-slate-400">Team not found.</div>;

  // 2. Server Action to update the team with storage pipeline
  async function updateTeam(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const divisionId = Number(formData.get("divisionId"));
    const logoFile = formData.get("logo") as File;

    let publicLogoUrl = team.logoUrl; // Default back to the current database link if unchanged

    // Run the upload code only if a brand new file is provided
    if (logoFile && logoFile.size > 0) {
      const fileExtension = logoFile.name.split('.').pop();
      const fileName = `team-${teamId}-${Date.now()}.${fileExtension}`;

      const { data, error } = await supabaseStorage.storage
        .from("team-logos")
        .upload(fileName, logoFile, {
          cacheControl: "3600",
          upsert: true, // Overwrites if the exact same file path gets generated
        });

      if (!error && data) {
        const { data: linkData } = supabaseStorage.storage
          .from("team-logos")
          .getPublicUrl(data.path);
        
        publicLogoUrl = linkData.publicUrl;
      } else if (error) {
        console.error("Supabase Logo Upload Error:", error.message);
      }
    }

    await db.update(teams)
      .set({ name, divisionId, logoUrl: publicLogoUrl })
      .where(eq(teams.id, teamId));

    revalidatePath("/admin/teams");
    revalidatePath("/standings");
    redirect("/admin/teams");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-10 pb-16 px-4 text-slate-200">
      <header className="flex items-center justify-between">
        <Link href="/admin/teams" className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Team Registry
        </Link>
        <div className="bg-slate-900 border border-slate-800 text-slate-400 px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-inner">
          Entry ID: {teamId}
        </div>
      </header>

      <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-10 shadow-2xl border border-slate-900 relative overflow-hidden group hover:border-slate-800 transition-all">
        <div className="absolute top-0 right-0 w-64 h-full bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="flex items-center gap-5 mb-12 relative z-10">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-indigo-400 shadow-inner">
            <Users className="w-7 h-7" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter italic leading-none">Update <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">Club Squad</span></h1>
        </div>

        {/* 🎯 FIXED: Form now includes encType for files */}
        <form action={updateTeam} encType="multipart/form-data" className="space-y-8 relative z-10">
          
          {/* Current Logo Preview Component */}
          {team.logoUrl && (
            <div className="flex items-center gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800/60">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
                <Image src={team.logoUrl} alt="Team logo" fill className="object-cover" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Active Emblem Asset</div>
                <div className="text-xs font-bold text-indigo-400 truncate max-w-sm">Stored in Supabase Cloud</div>
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Team Designation Name</label>
            <input 
              name="name" 
              defaultValue={team.name} 
              required 
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-white transition-all shadow-inner placeholder:text-slate-800"
            />
          </div>

          {/* 🎯 NEW: Interactive File Input Field */}
          <div className="space-y-2.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Update Logo Graphic (.png / .jpg)</label>
            <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-2xl p-2.5 group">
              <input 
                type="file"
                name="logo" 
                accept="image/png, image/jpeg, image/webp" 
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
              <div className="flex items-center gap-3 px-2 py-1 text-slate-400">
                <ImageIcon className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold">Choose new file to replace logo image...</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Assigned Division Bracket</label>
            <select 
              name="divisionId" 
              defaultValue={team.divisionId || ""} 
              required 
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-white appearance-none transition-all shadow-inner"
            >
              <option value="">Select Division Bracket...</option>
              {allDivisions.map((div) => (
                <option key={div.id} value={div.id}>
                  {div.name} ({div.seasonName})
                </option>
              ))}
            </select>
          </div>

          <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-900/20 active:scale-95">
            <Save className="w-4 h-4 stroke-[2.5]" /> Commit Squad Parameters
          </button>
        </form>
      </div>
    </div>
  );
}