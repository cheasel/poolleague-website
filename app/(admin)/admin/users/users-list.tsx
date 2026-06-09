'use client';

import { useState, useTransition } from "react";
import { Search, Shield, ShieldCheck, Loader2, AlertCircle, CheckCircle2, UserPlus, Trash2 } from "lucide-react";
import { updateUserRoleAction, createUserAction, deleteUserAction } from "./actions";

interface UserProfile {
  id: string;
  email: string;
  role: "admin" | "captain" | "viewer";
  createdAt: Date;
}

interface UsersListProps {
  users: UserProfile[];
  currentUserId: string;
}

export default function UsersList({ users, currentUserId }: UsersListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Create User Form state
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "captain" | "viewer">("viewer");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (userId: string, newRole: "admin" | "captain" | "viewer") => {
    setUpdatingId(userId);
    setSuccessMsg(null);
    setErrorMsg(null);

    startTransition(async () => {
      try {
        const res = await updateUserRoleAction(userId, newRole);
        if (res.success) {
          setSuccessMsg(`User role updated to ${newRole} successfully.`);
          setTimeout(() => setSuccessMsg(null), 3000);
        }
      } catch (err) {
        console.error("Failed to update user role:", err);
        setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
      } finally {
        setUpdatingId(null);
      }
    });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    setUpdatingId("creating");

    startTransition(async () => {
      try {
        const res = await createUserAction(newEmail, newPassword, newRole);
        if (res.success) {
          setSuccessMsg(`New user ${newEmail} created successfully.`);
          setNewEmail("");
          setNewPassword("");
          setNewRole("viewer");
          setIsFormOpen(false);
          setTimeout(() => setSuccessMsg(null), 3000);
        }
      } catch (err) {
        console.error("Failed to create user:", err);
        setErrorMsg(err instanceof Error ? err.message : "Failed to create user account.");
      } finally {
        setUpdatingId(null);
      }
    });
  };

  const handleDeleteUser = (userId: string, email: string) => {
    setSuccessMsg(null);
    setErrorMsg(null);

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete user account: "${email}"?\n\nThis will remove their Supabase Auth login credentials and their database profile. This action cannot be undone.`
    );
    if (!confirmed) return;

    setUpdatingId(userId);

    startTransition(async () => {
      try {
        const res = await deleteUserAction(userId);
        if (res.success) {
          setSuccessMsg(`User account ${email} deleted successfully.`);
          setTimeout(() => setSuccessMsg(null), 3000);
        }
      } catch (err) {
        console.error("Failed to delete user:", err);
        setErrorMsg(err instanceof Error ? err.message : "Failed to delete user account.");
      } finally {
        setUpdatingId(null);
      }
    });
  };

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateVal: Date) => {
    return new Date(dateVal).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-slate-100 pb-16">
      
      {/* Header section */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-900">
        <div className="flex items-center gap-4.5">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shadow-inner">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-100 uppercase tracking-tighter italic leading-none">Users Manager</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1.5">Configure access privileges and manage security group assignments</p>
          </div>
        </div>

        {/* Toggle Form Button */}
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center gap-1.5 transition-all shadow-md cursor-pointer select-none"
        >
          <UserPlus className="w-3.5 h-3.5" />
          {isFormOpen ? "Close Panel" : "Register User"}
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="flex items-center gap-3 bg-emerald-950/30 border border-emerald-900/30 rounded-xl px-4 py-3 text-emerald-400 font-bold text-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-3 bg-rose-950/30 border border-rose-900/30 rounded-xl px-4 py-3 text-rose-400 font-bold text-xs animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form Panel: Create New User */}
      {isFormOpen && (
        <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl border border-slate-800 shadow-xl overflow-hidden p-6 animate-in slide-in-from-top duration-200 relative">
          <div className="absolute top-0 right-0 w-64 h-full bg-indigo-600/5 blur-[80px] rounded-full pointer-events-none" />
          
          <h2 className="text-sm font-black text-slate-100 uppercase tracking-tight flex items-center gap-2 mb-5">
            <UserPlus className="w-4 h-4 text-indigo-400" /> Create New User Account
          </h2>

          <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end relative z-10">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
              <input
                type="email"
                placeholder="user@example.com"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl outline-none font-bold text-slate-100 text-xs focus:border-indigo-500 transition-all placeholder:text-slate-700"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl outline-none font-bold text-slate-100 text-xs focus:border-indigo-500 transition-all placeholder:text-slate-750"
              />
            </div>

            {/* Role Select & Submit Button */}
            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Security Access Role</label>
                <div className="relative">
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as "admin" | "captain" | "viewer")}
                    className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl outline-none font-bold text-slate-100 appearance-none text-xs pr-10 cursor-pointer"
                  >
                    <option value="viewer">Viewer (Read-Only)</option>
                    <option value="captain">Captain (Roster / Scorecard)</option>
                    <option value="admin">Administrator (Full Access)</option>
                  </select>
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] text-slate-500">▼</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={updatingId === "creating" && isPending}
                className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50 select-none"
              >
                {updatingId === "creating" && isPending ? (
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                ) : (
                  "Create Account"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input 
          type="text" 
          placeholder="Search users by email address..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none font-bold text-slate-100 placeholder:text-slate-500 text-xs transition-all shadow-inner"
        />
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl border border-slate-900 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-850 bg-slate-950/40">
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500">User Email</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Account Created</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Security Access Level</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const isUpdating = updatingId === user.id && isPending;
                  const isSelf = user.id === currentUserId;

                  return (
                    <tr key={user.id} className="border-b border-slate-850/60 hover:bg-slate-900/10 transition-colors group">
                      {/* Email */}
                      <td className="p-5 font-black text-slate-100 text-xs uppercase tracking-tight group-hover:text-indigo-400 transition-colors">
                        <div className="flex items-center gap-2">
                          <span>{user.email}</span>
                          {isSelf && (
                            <span className="text-[7px] font-black uppercase tracking-widest bg-indigo-950/50 text-indigo-400 border border-indigo-900/30 px-1.5 py-0.5 rounded">
                              Current User
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Created Date */}
                      <td className="p-5 text-[11px] text-slate-400 font-bold uppercase tracking-tight">
                        {formatDate(user.createdAt)}
                      </td>

                      {/* Role selection dropdown */}
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <select
                              value={user.role}
                              disabled={isUpdating || isSelf}
                              onChange={(e) => handleRoleChange(user.id, e.target.value as "admin" | "captain" | "viewer")}
                              className={`bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs font-bold text-slate-200 rounded-lg py-1.5 pl-3 pr-8 outline-none appearance-none cursor-pointer transition-all shadow-sm ${
                                isSelf ? "opacity-50 cursor-not-allowed" : ""
                              }`}
                            >
                              <option value="viewer">Viewer (Read-Only)</option>
                              <option value="captain">Captain (Roster / Scorecard)</option>
                              <option value="admin">Administrator (Full Access)</option>
                            </select>
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] text-slate-500">▼</span>
                          </div>

                          {/* Action Loader/Identity indicator */}
                          <div className="w-5 h-5 flex items-center justify-center shrink-0" title={user.role === "admin" ? "Full Administrator Access" : undefined}>
                            {isUpdating && updatingId === user.id ? (
                              <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                            ) : user.role === "admin" ? (
                              <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-5 text-right">
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          disabled={isSelf || isUpdating}
                          className="p-2 bg-slate-950 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-900/30 text-slate-500 hover:text-rose-400 rounded-lg transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed select-none cursor-pointer"
                          title={isSelf ? "You cannot delete your own account" : "Permanently Delete User Account"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-16 text-xs font-bold text-slate-600 uppercase italic">
                    No registered user accounts found matching your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-[9px] font-bold text-slate-600 uppercase tracking-wide text-center pt-2">
        Showing {filteredUsers.length} of {users.length} registered profiles database entries
      </div>
    </div>
  );
}
