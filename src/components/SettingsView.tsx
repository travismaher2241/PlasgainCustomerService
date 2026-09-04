import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  LogIn,
  User,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { apiGet } from "../utils/apiClient";
import { useApp } from "../context/AppContext";
import { initialsOf } from "../context/AppContext";
import { AdminAuditLogView } from "./AdminAuditLogView";

export const SettingsView: React.FC = () => {
  const {
    showToast,
    currentUser,
    updateCurrentUser,
    openLoginModal,
    auditLogs
  } = useApp();

  const [subTab, setSubTab] = useState<"general" | "audit">("general");

  // Profile Edit State (PART I: Summary by default with Edit toggle)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savedDraft, setDraftState] = useState(currentUser);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Diagnostics Toggle
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // AI Health Check
  const [aiHealth, setAiHealth] = useState<{
    state: "checking" | "reachable" | "unreachable" | "unconfigured";
    detail: string;
    model?: string;
  }>({ state: "checking", detail: "Checking AI service connectivity..." });

  const runAiDiagnostics = async () => {
    setAiHealth({ state: "checking", detail: "Checking AI service connectivity..." });
    try {
      const res: any = await apiGet("/api/health/ai");
      if (!res?.configured) {
        setAiHealth({
          state: "unconfigured",
          detail: "No GEMINI_API_KEY is configured on the server. AI features will use deterministic local fallbacks."
        });
      } else if (res?.reachable) {
        setAiHealth({
          state: "reachable",
          detail: res.state || "AI service is reachable and responsive.",
          model: res.model
        });
      } else {
        setAiHealth({
          state: "unreachable",
          detail: res?.detail || "AI service is currently unreachable.",
          model: res?.model
        });
      }
    } catch (err: any) {
      setAiHealth({
        state: "unreachable",
        detail: err?.message || "Could not reach server health endpoint."
      });
    }
  };

  useEffect(() => {
    runAiDiagnostics();
  }, []);

  useEffect(() => {
    setDraftState(currentUser);
  }, [currentUser]);

  const nameError = savedDraft.name.trim().length === 0 ? "Your name is required." : null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameError) return;
    updateCurrentUser({
      name: savedDraft.name.trim(),
      role: savedDraft.role.trim(),
      location: savedDraft.location.trim(),
      email: savedDraft.email.trim(),
      phone: (savedDraft.phone || "").trim()
    });
    setIsEditingProfile(false);
    setSavedAt(new Date().toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" }));
    showToast("Profile updated successfully", "success");
  };

  return (
    <div className="space-y-6 max-w-5xl pb-16 w-full min-w-0">
      {/* HEADER & SUBTABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-body">
            {subTab === "general" ? "Settings" : "Admin Audit Trail"}
          </h1>
          <p className="text-spec text-ink-dim mt-0.5">
            {subTab === "general"
              ? "User profile and workspace administration."
              : "Track all customer calls, record changes, stage moves, and user actions across the shared database."}
          </p>
        </div>

        <div className="flex items-center rounded-edge border border-line overflow-hidden text-spec font-bold bg-white self-start sm:self-auto shadow-2xs">
          <button
            type="button"
            onClick={() => setSubTab("general")}
            className={`px-3.5 py-1.5 cursor-pointer transition-colors ${
              subTab === "general" ? "bg-brand-deep text-white" : "text-ink-dim hover:text-body"
            }`}
          >
            General &amp; Profile
          </button>
          {currentUser.isAdmin && (
            <button
              type="button"
              onClick={() => setSubTab("audit")}
              className={`px-3.5 py-1.5 cursor-pointer transition-colors flex items-center gap-1.5 ${
                subTab === "audit" ? "bg-brand-deep text-white" : "text-ink-dim hover:text-body"
              }`}
            >
              <span>Admin Audit Trail</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                subTab === "audit" ? "bg-white text-brand-deep" : "bg-brand-wash text-brand-deep"
              }`}>
                {auditLogs.length}
              </span>
            </button>
          )}
        </div>
      </div>

      {subTab === "audit" && currentUser.isAdmin ? (
        <AdminAuditLogView />
      ) : (
        <>
          {/* 1. PROFILE SECTION (PART I: COMPACT SUMMARY WITH EDIT ACTION) */}
          <section className="bg-white p-5 rounded-panel border border-line shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-brand-deep" />
                <h2 className="text-base font-bold text-body">Profile</h2>
              </div>

          <div className="flex items-center gap-2">
            {!isEditingProfile ? (
              <button
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="px-3 py-1.5 text-spec font-bold text-brand-deep hover:bg-brand-wash rounded-edge border border-brand-edge transition-colors cursor-pointer"
              >
                Edit profile
              </button>
            ) : null}

            <button
              type="button"
              onClick={openLoginModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-spec font-bold text-ink-dim hover:text-body bg-paper hover:bg-raised border border-line rounded-edge transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Switch user</span>
            </button>
          </div>
        </div>

        {!isEditingProfile ? (
          /* PROFILE READ-ONLY SUMMARY (PART I) */
          <div className="space-y-3">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-edge bg-brand-deep text-white flex items-center justify-center text-base font-bold shrink-0">
                {initialsOf(currentUser.name)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-body truncate">
                    {currentUser.name.trim() || "Unnamed user"}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 rounded">
                    {currentUser.isAdmin ? "Administrator" : "Sales Team"}
                  </span>
                </div>
                <div className="text-xs text-ink-dim truncate mt-0.5">
                  {[currentUser.role, currentUser.location].filter(Boolean).join(" · ")}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-spec">
              <div className="p-3 bg-paper rounded-edge border border-line">
                <span className="text-xs text-ink-dim block">Email</span>
                <span className="font-semibold text-body block truncate mt-0.5">
                  {currentUser.email || "No email set"}
                </span>
              </div>
              <div className="p-3 bg-paper rounded-edge border border-line">
                <span className="text-xs text-ink-dim block">Phone</span>
                <span className="font-semibold text-body block truncate mt-0.5">
                  {currentUser.phone || "No direct phone set"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* PROFILE EDIT FORM (PART I) */
          <form onSubmit={handleSaveProfile} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-spec font-bold mb-1">Full Name *</label>
                <input
                  type="text"
                  value={savedDraft.name}
                  onChange={(e) => setDraftState({ ...savedDraft, name: e.target.value })}
                  className="w-full text-spec p-2 rounded-edge border border-line bg-white focus:outline-none focus:border-brand-deep"
                />
                {nameError && <p className="text-xs text-red-700 mt-1">{nameError}</p>}
              </div>

              <div>
                <label className="block text-spec font-bold mb-1">Role / Job Title</label>
                <input
                  type="text"
                  value={savedDraft.role}
                  onChange={(e) => setDraftState({ ...savedDraft, role: e.target.value })}
                  className="w-full text-spec p-2 rounded-edge border border-line bg-white focus:outline-none focus:border-brand-deep"
                />
              </div>

              <div>
                <label className="block text-spec font-bold mb-1">Email</label>
                <input
                  type="email"
                  value={savedDraft.email}
                  onChange={(e) => setDraftState({ ...savedDraft, email: e.target.value })}
                  className="w-full text-spec p-2 rounded-edge border border-line bg-white focus:outline-none focus:border-brand-deep"
                />
              </div>

              <div>
                <label className="block text-spec font-bold mb-1">Phone</label>
                <input
                  type="tel"
                  value={savedDraft.phone || ""}
                  onChange={(e) => setDraftState({ ...savedDraft, phone: e.target.value })}
                  placeholder="e.g. 0400 123 456"
                  className="w-full text-spec p-2 rounded-edge border border-line bg-white focus:outline-none focus:border-brand-deep"
                />
              </div>

              <div>
                <label className="block text-spec font-bold mb-1">Location</label>
                <input
                  type="text"
                  value={savedDraft.location}
                  onChange={(e) => setDraftState({ ...savedDraft, location: e.target.value })}
                  className="w-full text-spec p-2 rounded-edge border border-line bg-white focus:outline-none focus:border-brand-deep"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => {
                  setDraftState(currentUser);
                  setIsEditingProfile(false);
                }}
                className="px-3 py-1.5 border border-line rounded-edge text-spec font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge cursor-pointer shadow-xs"
              >
                Save profile
              </button>
            </div>
          </form>
        )}
      </section>

      {/* 2. ADMINISTRATION */}
      <section className="bg-white p-5 rounded-panel border border-line shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-deep" />
            <h2 className="text-base font-bold text-body">Administration</h2>
          </div>
        </div>

        {/* Collapsible Diagnostics */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="text-spec font-bold text-brand-deep hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{showDiagnostics ? "Hide system diagnostics" : "View technical diagnostics & logs"}</span>
            {showDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showDiagnostics && (
            <div className="p-3.5 bg-paper rounded-edge border border-line space-y-2 mt-3 text-xs font-mono animate-in fade-in duration-100">
              <div><strong>App Version:</strong> 2.0.0 (Production Release)</div>
              <div><strong>Active User ID:</strong> {currentUser.id || "local-default"}</div>
              <div><strong>AI Model Target:</strong> {aiHealth.model || "gemini-2.5-flash"}</div>
              <div><strong>Offline Storage Engine:</strong> IndexedDB / localStorage</div>
            </div>
          )}
        </div>
      </section>
    </>
  )}
</div>
  );
};
