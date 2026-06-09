'use client';

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Filter, Save, Undo, AlertTriangle, AlertCircle, ArrowLeft, Sliders, GripVertical } from "lucide-react";
import Link from "next/link";

interface SeasonRow {
  id: number;
  name: string;
}

interface DivisionRow {
  id: number;
  name: string;
  seasonId: number | null;
}

interface MatchweekItem {
  weekNumber: number;
  originalWeek: number;
  date: string; // YYYY-MM-DD
  matchups: string[];
  completedMatches: number;
  totalMatches: number;
}

interface MatchweekManagerFormProps {
  seasons: SeasonRow[];
  divisions: DivisionRow[];
  initialWeekData: MatchweekItem[];
  seasonIdParam: string;
  divisionIdParam: string;
  saveAction: (
    divisionId: number,
    adjustments: Array<{ originalWeek: number; newWeek: number; newDate: string }>
  ) => Promise<void>;
  isReadOnly?: boolean;
}

export default function MatchweekManagerForm({
  seasons,
  divisions,
  initialWeekData,
  seasonIdParam,
  divisionIdParam,
  saveAction,
  isReadOnly = false,
}: MatchweekManagerFormProps) {
  const router = useRouter();
  const defaultSeasonId = seasonIdParam && seasonIdParam !== "all"
    ? seasonIdParam
    : (seasons[0]?.id.toString() || "");

  const [selectedSeasonId, setSelectedSeasonId] = useState(defaultSeasonId);
  const [selectedDivisionId, setSelectedDivisionId] = useState(divisionIdParam || "");
  const [weeks, setWeeks] = useState<MatchweekItem[]>(initialWeekData);
  const [isPending, startTransition] = useTransition();
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state if initialWeekData changes (e.g. after a save or division change)
  useEffect(() => {
    setWeeks(initialWeekData);
    setSaveSuccess(false);
  }, [initialWeekData]);

  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [weeksNeedingDateReview, setWeeksNeedingDateReview] = useState<Set<number>>(new Set());

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (isReadOnly) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    const sourceIndexStr = e.dataTransfer.getData("text/plain");
    const sourceIndex = parseInt(sourceIndexStr, 10);
    
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

    const updatedWeeks = [...weeks];
    const [draggedItem] = updatedWeeks.splice(sourceIndex, 1);
    updatedWeeks.splice(targetIndex, 0, draggedItem);

    // Auto re-index all weeks 1-indexed to keep uniqueness and preserve sequence
    const reindexedWeeks = updatedWeeks.map((item, idx) => ({
      ...item,
      weekNumber: idx + 1,
    }));

    setWeeks(reindexedWeeks);

    // Highlight re-ordered weeks to prompt the admin to review/change their dates
    const newReviewSet = new Set(weeksNeedingDateReview);
    reindexedWeeks.forEach((item, idx) => {
      const originalIdx = initialWeekData.findIndex(w => w.originalWeek === item.originalWeek);
      if (originalIdx !== idx) {
        newReviewSet.add(item.originalWeek);
      }
    });
    setWeeksNeedingDateReview(newReviewSet);
  };

  const handleSeasonChange = (seasonId: string) => {
    setSelectedSeasonId(seasonId);
    setSelectedDivisionId("");
    router.push(`/admin/matches/weeks?seasonId=${seasonId}`);
  };

  const handleDivisionChange = (divisionId: string) => {
    setSelectedDivisionId(divisionId);
    router.push(`/admin/matches/weeks?seasonId=${selectedSeasonId}&divisionId=${divisionId}`);
  };

  const filteredDivisionsList = divisions.filter(
    (d) => selectedSeasonId === "all" || d.seasonId?.toString() === selectedSeasonId
  );

  const handleWeekNumberChange = (index: number, newWeekNum: number) => {
    const updated = [...weeks];
    updated[index] = { ...updated[index], weekNumber: newWeekNum };
    setWeeks(updated);
  };

  const handleDateChange = (index: number, newDateStr: string) => {
    const updated = [...weeks];
    updated[index] = { ...updated[index], date: newDateStr };
    setWeeks(updated);

    // Clear review highlight when date is modified by the admin
    const newReviewSet = new Set(weeksNeedingDateReview);
    newReviewSet.delete(updated[index].originalWeek);
    setWeeksNeedingDateReview(newReviewSet);
  };

  const handleReset = () => {
    setWeeks(initialWeekData);
    setWeeksNeedingDateReview(new Set());
  };

  // Validation checks
  const weekNumbers = weeks.map(w => w.weekNumber);
  const duplicateWeeks = weekNumbers.filter((item, index) => weekNumbers.indexOf(item) !== index);
  const hasDuplicates = duplicateWeeks.length > 0;
  
  const hasInvalidWeeks = weeks.some(w => isNaN(w.weekNumber) || w.weekNumber <= 0);

  const isSaveDisabled = hasDuplicates || hasInvalidWeeks || isPending || weeks.length === 0;

  const handleSave = () => {
    if (isSaveDisabled || !selectedDivisionId) return;

    setSaveSuccess(false);
    startTransition(async () => {
      try {
        const adjustments = weeks.map((w) => ({
          originalWeek: w.originalWeek,
          newWeek: Number(w.weekNumber),
          newDate: w.date,
        }));
        await saveAction(Number(selectedDivisionId), adjustments);
        setSaveSuccess(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        alert(message);
      }
    });
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 px-4 pt-4 text-slate-200">
      <header className="space-y-6">
        <Link href="/admin/matches" className="inline-flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-all">
          <ArrowLeft className="w-4 h-4" /> Back to Fixtures
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter italic leading-none flex items-center gap-3">
              <Sliders className="w-8 h-8 text-indigo-400 stroke-[2.5]" />
              Matchweek <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">Manager</span>
            </h1>
            <p className="text-slate-500 font-medium text-xs mt-2 max-w-xl leading-relaxed">
              Rearrange, rename, or update the scheduled dates of league matchweeks. Modified dates will cascade immediately to all scheduled fixtures in the week.
            </p>
          </div>
        </div>
      </header>

      {/* FILTER BOX */}
      <section className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-900/60 shadow-xl space-y-4">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-indigo-400" /> Choose League Bracket
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 ml-1">Filter By Season</label>
            <select
              value={selectedSeasonId}
              onChange={(e) => handleSeasonChange(e.target.value)}
              className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none font-bold text-white text-xs uppercase tracking-wider appearance-none transition-all cursor-pointer shadow-inner"
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id.toString()}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 ml-1">Select Division</label>
            <select
              value={selectedDivisionId}
              onChange={(e) => handleDivisionChange(e.target.value)}
              className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none font-bold text-white text-xs uppercase tracking-wider appearance-none transition-all cursor-pointer shadow-inner"
            >
              <option value="">Choose Division...</option>
              {filteredDivisionsList.map((d) => (
                <option key={d.id} value={d.id.toString()}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {selectedDivisionId && (
        <section className="bg-slate-900/30 backdrop-blur-md rounded-[2.5rem] shadow-2xl border border-slate-900/60 p-6 md:p-8 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-full bg-indigo-600/5 blur-[100px] rounded-full pointer-events-none"></div>

          {/* Validation Errors & Success Cards */}
          {weeksNeedingDateReview.size > 0 && (
            <div className="p-4 bg-amber-950/20 border border-amber-900/40 rounded-2xl flex gap-3 text-amber-500 shadow-inner">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 opacity-80" />
              <div className="text-[10px] font-black uppercase tracking-widest space-y-1">
                <p>Dates May Require Updates</p>
                <p className="text-amber-500/80 normal-case font-bold leading-relaxed">
                  Some matchweeks have been re-ordered. Please check their scheduled dates to ensure they remain in correct chronological order.
                </p>
              </div>
            </div>
          )}

          {hasDuplicates && (
            <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-2xl flex gap-3 text-red-400 shadow-inner">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 opacity-80" />
              <div className="text-[10px] font-black uppercase tracking-widest space-y-1">
                <p>Duplicate Weeks Detected</p>
                <p className="text-red-400/80 normal-case font-bold leading-relaxed">
                  Multiple rows are assigned to the same week number ({duplicateWeeks.join(", ")}). Each week number must be unique.
                </p>
              </div>
            </div>
          )}

          {hasInvalidWeeks && (
            <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-2xl flex gap-3 text-red-400 shadow-inner">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 opacity-80" />
              <div className="text-[10px] font-black uppercase tracking-widest space-y-1">
                <p>Invalid Week Numbers</p>
                <p className="text-red-400/80 normal-case font-bold leading-relaxed">
                  Week numbers must be valid positive integers greater than zero.
                </p>
              </div>
            </div>
          )}

          {saveSuccess && (
            <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-2xl flex gap-3 text-emerald-400 shadow-inner">
              <Save className="w-5 h-5 shrink-0 mt-0.5 opacity-80" />
              <div className="text-[10px] font-black uppercase tracking-widest space-y-1">
                <p>Adjustments Saved</p>
                <p className="text-emerald-400/80 normal-case font-bold leading-relaxed">
                  Matchweek dates and re-order updates have been successfully written to the database.
                </p>
              </div>
            </div>
          )}

          {weeks.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs font-bold uppercase tracking-[0.2em] italic border border-dashed border-slate-900 rounded-[2rem] bg-slate-950/10">
              No matchweeks generated for this division yet. Go to Match Generator to populate.
            </div>
          ) : (
            <div className="space-y-6">
              {/* TABLE CONTAINER */}
              <div className="overflow-x-auto rounded-2xl border border-slate-900/80 bg-slate-950/40">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900/80 bg-slate-950/80 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {!isReadOnly && <th className="p-4 w-12 text-center"></th>}
                      <th className="p-4 w-28 text-center">Week Number</th>
                      <th className="p-4 w-48">Scheduled Date</th>
                      <th className="p-4">Week Matches Preview</th>
                      <th className="p-4 w-52 text-right">Status Indicator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/40">
                    {weeks.map((week, idx) => {
                      const hasCompletedGames = week.completedMatches > 0;
                      return (
                        <tr 
                          key={week.originalWeek}
                          draggable={!isReadOnly && !isPending}
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragOver={(e) => !isReadOnly && handleDragOver(e, idx)}
                          onDragLeave={handleDragLeave}
                          onDragEnd={handleDragLeave}
                          onDrop={(e) => !isReadOnly && handleDrop(e, idx)}
                          className={`transition-all duration-200 ${
                            isPending ? "opacity-50 pointer-events-none" : ""
                          } ${
                            dragOverIndex === idx 
                              ? "border-t-2 border-t-indigo-500 bg-indigo-950/20" 
                              : "hover:bg-slate-900/20"
                          }`}
                        >
                          {!isReadOnly && (
                            <td className="p-4 text-center cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 transition-colors">
                              <GripVertical className="w-4 h-4 mx-auto" />
                            </td>
                          )}
                          <td className="p-4 text-center">
                            <input
                              type="number"
                              min="1"
                              value={week.weekNumber}
                              disabled={isReadOnly}
                              onChange={(e) => handleWeekNumberChange(idx, parseInt(e.target.value) || 0)}
                              className="w-16 p-2 bg-slate-950 border border-slate-800 rounded-lg text-center font-bold text-white text-xs focus:border-indigo-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="p-4">
                            <input
                              type="date"
                              value={week.date}
                              disabled={isReadOnly}
                              onChange={(e) => handleDateChange(idx, e.target.value)}
                              className={`w-full p-2 bg-slate-950 border rounded-lg font-bold text-white text-xs uppercase tracking-wider outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                                weeksNeedingDateReview.has(week.originalWeek)
                                  ? "border-amber-500/80 shadow-md shadow-amber-950/20 focus:border-amber-400 focus:ring-amber-500/20"
                                  : "border-slate-800 focus:border-indigo-500"
                              }`}
                            />
                            {weeksNeedingDateReview.has(week.originalWeek) && (
                              <div className="flex items-center gap-1 mt-1.5 text-amber-500 text-[9px] font-black uppercase tracking-wider animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                                Review Date
                              </div>
                            )}
                          </td>
                          <td className="p-4 max-w-md">
                            <div className="text-[11px] font-bold text-slate-400 leading-relaxed line-clamp-2">
                              {week.matchups.join("  •  ") || <span className="text-slate-600 italic">No fixtures</span>}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            {week.completedMatches === week.totalMatches ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-950/20 border border-red-900/30 text-red-400 font-mono text-[9px] uppercase font-black tracking-wider rounded-lg">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                All Completed ({week.completedMatches}/{week.totalMatches})
                              </span>
                            ) : hasCompletedGames ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/20 border border-amber-900/30 text-amber-500 font-mono text-[9px] uppercase font-black tracking-wider rounded-lg">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                Partial ({week.completedMatches}/{week.totalMatches})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/10 border border-emerald-900/20 text-emerald-400 font-mono text-[9px] uppercase font-black tracking-wider rounded-lg">
                                Scheduled ({week.totalMatches})
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* SAVE / RESET ACTIONS */}
              {!isReadOnly && (
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={isPending}
                    className="px-4 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Undo className="w-4 h-4" /> Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaveDisabled}
                    className={`px-6 py-3 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
                      isSaveDisabled
                        ? "bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/40"
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    {isPending ? "Saving changes..." : "Save Adjustments"}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {!selectedDivisionId && (
        <section className="py-20 text-center text-slate-500 font-bold text-xs uppercase tracking-[0.2em] border border-dashed border-slate-900 rounded-[2.5rem] bg-slate-900/10">
          Select a league division tier above to manage and re-adjust its matchweeks.
        </section>
      )}
    </div>
  );
}
