import React, { useCallback, useEffect, useState } from "react";
import {
  ShieldCheck,
  Database,
  RefreshCw,
  CheckCircle2
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { SAMPLE_OPPORTUNITIES } from "../data/mockData";
import { apiGet } from "../utils/apiClient";
import { initialsOf, DEFAULT_USER_PROFILE } from "../context/AppContext";
import { Surface } from "./ui/Surface";

/** Live AI status, probed from the server rather than asserted. */
interface AIStatus {
  configured: boolean;
  reachable: boolean;
  state: string;
  detail: string;
  model?: string;
}

export const SettingsView: React.FC = () => {
  const { setOpportunities, documents, showToast, currentUser, updateCurrentUser, resetCurrentUser } =
    useApp();

  // Edits are held locally so a half-typed name never lands on saved records.
  const [draft] = useState(currentUser);
  const [savedDraft, setDraftState] = useState(currentUser);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setDraftState(currentUser);
  }, [currentUser]);

  const dirty =
    savedDraft.name !== currentUser.name ||
    savedDraft.role !== currentUser.role ||
    savedDraft.location !== currentUser.location ||
    savedDraft.email !== currentUser.email;

  const nameError = savedDraft.name.trim().length === 0 ? "Your name is required." : null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameError) return;
    updateCurrentUser({
      name: savedDraft.name.trim(),
      role: savedDraft.role.trim(),
      location: savedDraft.location.trim(),
      email: savedDraft.email.trim()
    });
    setSavedAt(new Date().toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" }));
    showToast("Profile updated", "success");
  };

  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [isProbing, setIsProbing] = useState(true);

  const probeAI = useCallback(async () => {
    setIsProbing(true);
    try {
      const data = await apiGet<AIStatus>("/api/health/ai");
      setAiStatus(data);
    } catch {
      setAiStatus({
        configured: false,
        reachable: false,
        state: "Offline",
        detail: "Could not connect to the Plasgain service."
      });
    } finally {
      setIsProbing(false);
    }
  }, []);

  useEffect(() => {
    probeAI();
  }, [probeAI]);

  const aiHealthy = Boolean(aiStatus?.configured && aiStatus?.reachable);

  const handleResetData = () => {
    localStorage.removeItem("plasgain_opportunities");
    localStorage.removeItem("plasgain_documents");
    localStorage.removeItem("plasgain_crm_accounts");
    localStorage.removeItem("plasgain_crm_contacts");
    localStorage.removeItem("plasgain_crm_leads");
    localStorage.removeItem("plasgain_crm_deals");
    localStorage.removeItem("plasgain_crm_activities");
    localStorage.removeItem("plasgain_crm_tasks");
    setOpportunities(SAMPLE_OPPORTUNITIES);
    showToast("Workspace data reset to default state", "info");
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-4 border-b border-line">
        <h1 className="text-xl font-bold tracking-tight text-body">Settings & Preferences</h1>
        <p className="text-meta text-ink-dim mt-0.5">
          User profile, catalogue references, quoting standards, and workspace data.
        </p>
      </div>

      {/* Your details */}
      <section aria-labelledby="profile-heading">
        <div className="flex items-baseline gap-3 mb-3">
          <h2 id="profile-heading" className="text-lead font-semibold text-ink">
            Your details
          </h2>
          <span className="u-data text-spec text-ink-faint uppercase tracking-[0.09em]">
            Stamped on records you create
          </span>
        </div>

        <Surface>
          <form onSubmit={handleSaveProfile} className="p-5 space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="u-data w-11 h-11 rounded-edge bg-brand-deep text-white flex items-center justify-center text-meta font-semibold shrink-0">
                {initialsOf(savedDraft.name)}
              </div>
              <div className="min-w-0">
                <div className="text-body font-semibold text-ink truncate">
                  {savedDraft.name.trim() || "Unnamed user"}
                </div>
                <div className="u-data text-spec text-ink-faint truncate">
                  {[savedDraft.role, savedDraft.location].filter((v) => v.trim()).join(" · ") ||
                    "No role or location set"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="profile-name" className="u-eyebrow text-ink-dim block mb-1.5">
                  Name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={savedDraft.name}
                  onChange={(e) => setDraftState({ ...savedDraft, name: e.target.value })}
                  aria-invalid={Boolean(nameError)}
                  aria-describedby={nameError ? "profile-name-error" : undefined}
                  className={`w-full text-body px-3 py-2 rounded-edge border bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-deep transition-colors ${
                    nameError ? "border-urgent" : "border-line"
                  }`}
                  placeholder="Your full name"
                />
                {nameError && (
                  <p id="profile-name-error" className="mt-1 text-spec text-urgent">
                    {nameError}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="profile-role" className="u-eyebrow text-ink-dim block mb-1.5">
                  Role
                </label>
                <input
                  id="profile-role"
                  type="text"
                  value={savedDraft.role}
                  onChange={(e) => setDraftState({ ...savedDraft, role: e.target.value })}
                  className="w-full text-body px-3 py-2 rounded-edge border border-line bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-deep transition-colors"
                  placeholder="e.g. Internal Sales"
                />
              </div>

              <div>
                <label htmlFor="profile-location" className="u-eyebrow text-ink-dim block mb-1.5">
                  Location
                </label>
                <input
                  id="profile-location"
                  type="text"
                  value={savedDraft.location}
                  onChange={(e) => setDraftState({ ...savedDraft, location: e.target.value })}
                  className="w-full text-body px-3 py-2 rounded-edge border border-line bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-deep transition-colors"
                  placeholder="e.g. Melbourne"
                />
              </div>

              <div>
                <label htmlFor="profile-email" className="u-eyebrow text-ink-dim block mb-1.5">
                  Email
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={savedDraft.email}
                  onChange={(e) => setDraftState({ ...savedDraft, email: e.target.value })}
                  className="w-full text-body px-3 py-2 rounded-edge border border-line bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-deep transition-colors"
                  placeholder="you@plasgain.com.au"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="submit"
                disabled={!dirty || Boolean(nameError)}
                className="px-3.5 py-2 rounded-edge text-meta font-semibold text-white bg-brand-deep border border-brand-deep hover:bg-brand hover:border-brand disabled:bg-line disabled:border-line disabled:text-ink-dim disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Save details
              </button>

              {dirty && (
                <button
                  type="button"
                  onClick={() => setDraftState(currentUser)}
                  className="px-3 py-2 rounded-edge text-meta font-medium text-ink-dim border border-line-strong hover:text-ink hover:border-ink-faint transition-colors cursor-pointer"
                >
                  Discard
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  resetCurrentUser();
                  setDraftState(DEFAULT_USER_PROFILE);
                  showToast("Profile reset to the sample user", "info");
                }}
                className="ml-auto text-spec text-ink-faint hover:text-ink underline underline-offset-2 cursor-pointer"
              >
                Reset to sample user
              </button>
            </div>

            <p className="text-spec text-ink-faint">
              {savedAt
                ? `Saved at ${savedAt}. Stored in this browser only.`
                : "Stored in this browser only — it is not sent anywhere."}
            </p>
          </form>
        </Surface>
      </section>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className={`p-4 rounded-panel border shadow-xs space-y-2 ${
            isProbing
              ? "bg-white border-line"
              : aiHealthy
              ? "bg-white border-line"
              : "bg-soon-wash border-soon"
          }`}
        >
          <div
            className={`flex items-center justify-between ${
              aiHealthy ? "text-brand-deep" : "text-soon"
            }`}
          >
            <span className="text-spec font-bold uppercase tracking-wider">AI Assistant</span>
            <button
              type="button"
              onClick={probeAI}
              title="Check assistant status"
              className="hover:opacity-70 transition-opacity cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="text-body font-bold">
            {isProbing ? "Checking…" : aiHealthy ? "Active & Connected" : "Offline / Unreachable"}
          </div>
          <p className="text-spec text-ink-dim">
            {isProbing
              ? "Connecting to assistant…"
              : aiHealthy
              ? "Plasgain Product & Compliance Assistant is ready"
              : "Assistant service is currently offline. Datasheets and tools remain available."}
          </p>
        </div>

        <div className="bg-white p-4 rounded-panel border border-line shadow-xs space-y-2">
          <div className="flex items-center justify-between text-brand-deep">
            <span className="text-spec font-bold uppercase tracking-wider">Product Catalogues</span>
            <Database className="w-4 h-4" />
          </div>
          <div className="text-body font-bold">{documents.length} Active Catalogues</div>
          <p className="text-spec text-ink-dim">Plasgain Product Sheets & AS/NZS Standards</p>
        </div>

        <div className="bg-white p-4 rounded-panel border border-line shadow-xs space-y-2">
          <div className="flex items-center justify-between text-brand-deep">
            <span className="text-spec font-bold uppercase tracking-wider">Compliance Standards</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-body font-bold">AS/NZS 1158 & 3000</div>
          <p className="text-spec text-ink-dim">Australian Public Lighting & Electrical Standards</p>
        </div>
      </div>

      {/* Quoting & Compliance Standards */}
      <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-line">
          <ShieldCheck className="w-4 h-4 text-brand-deep" />
          <h2 className="text-body font-bold">Quoting & Compliance Standards</h2>
        </div>

        <div className="space-y-2.5 text-meta">
          <div className="flex items-start gap-2.5 bg-raised p-3 rounded-edge border border-line">
            <CheckCircle2 className="w-4 h-4 text-brand-deep shrink-0 mt-0.5" />
            <div>
              <strong className="text-body">Datasheet Accuracy:</strong>
              <p className="text-ink-dim mt-0.5">
                Product specifications, lumen outputs, battery capacities, and warranty terms are verified against official Plasgain engineering documentation.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-raised p-3 rounded-edge border border-line">
            <CheckCircle2 className="w-4 h-4 text-brand-deep shrink-0 mt-0.5" />
            <div>
              <strong className="text-body">Quoting Readiness Check:</strong>
              <p className="text-ink-dim mt-0.5">
                Ensures essential Australian project parameters (sub-category, mounting height, solar zone, operating profile) are reviewed before quoting.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-raised p-3 rounded-edge border border-line">
            <CheckCircle2 className="w-4 h-4 text-brand-deep shrink-0 mt-0.5" />
            <div>
              <strong className="text-body">Engineering & Compliance Notice:</strong>
              <p className="text-ink-dim mt-0.5">
                Preliminary product selections provide rapid sales guidance; final certified AS/NZS compliance requires formal Dialux lighting calculations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Data */}
      <div className="bg-white rounded-panel border border-line p-5 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-meta font-bold">Reset Workspace Data</h3>
          <p className="text-spec text-ink-dim">
            Restores initial sample opportunities, customer accounts, and documents.
          </p>
        </div>
        <button
          onClick={handleResetData}
          className="text-meta font-medium px-3.5 py-2 rounded-edge bg-paper hover:bg-line transition-colors flex items-center gap-1.5 cursor-pointer border border-line"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Sample Data</span>
        </button>
      </div>
    </div>
  );
};
