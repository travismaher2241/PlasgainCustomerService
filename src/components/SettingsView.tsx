import React, { useCallback, useEffect, useState } from "react";
import {
  SlidersHorizontal,
  ShieldCheck,
  Cpu,
  Database,
  RefreshCw,
  CheckCircle2,
  Lock,
  Layers,
  FileText
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { SAMPLE_OPPORTUNITIES, SAMPLE_DOCUMENTS } from "../data/mockData";
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
  const [draft, setDraft] = useState(currentUser);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setDraft(currentUser);
  }, [currentUser]);

  const dirty =
    draft.name !== currentUser.name ||
    draft.role !== currentUser.role ||
    draft.location !== currentUser.location ||
    draft.email !== currentUser.email;

  const nameError = draft.name.trim().length === 0 ? "Your name is required." : null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameError) return;
    updateCurrentUser({
      name: draft.name.trim(),
      role: draft.role.trim(),
      location: draft.location.trim(),
      email: draft.email.trim()
    });
    setSavedAt(new Date().toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" }));
    showToast("Profile updated", "success");
  };
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [isProbing, setIsProbing] = useState(true);

  // This panel is a diagnostics screen: it must report what the server actually
  // says, not a hardcoded "Active & Grounded".
  const probeAI = useCallback(async () => {
    setIsProbing(true);
    try {
      const data = await apiGet<AIStatus>("/api/health/ai");
      setAiStatus(data);
    } catch {
      setAiStatus({
        configured: false,
        reachable: false,
        state: "Unknown",
        detail: "Could not reach the Plasgain server to check AI status."
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
    showToast("Demonstration workspace & CRM reset to default state", "info");
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-4 border-b border-line">
        <h1 className="text-xl font-bold tracking-tight text-body">Settings & AI Copilot Diagnostics</h1>
        <p className="text-meta text-ink-dim mt-0.5">
          System status, model configuration, knowledge base indexing, and compliance rules.
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
                {initialsOf(draft.name)}
              </div>
              <div className="min-w-0">
                <div className="text-body font-semibold text-ink truncate">
                  {draft.name.trim() || "Unnamed user"}
                </div>
                <div className="u-data text-spec text-ink-faint truncate">
                  {[draft.role, draft.location].filter((v) => v.trim()).join(" · ") ||
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
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
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
                  value={draft.role}
                  onChange={(e) => setDraft({ ...draft, role: e.target.value })}
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
                  value={draft.location}
                  onChange={(e) => setDraft({ ...draft, location: e.target.value })}
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
                  value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
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
                  onClick={() => setDraft(currentUser)}
                  className="px-3 py-2 rounded-edge text-meta font-medium text-ink-dim border border-line-strong hover:text-ink hover:border-ink-faint transition-colors cursor-pointer"
                >
                  Discard
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  resetCurrentUser();
                  setDraft(DEFAULT_USER_PROFILE);
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
            <span className="text-spec font-bold uppercase tracking-wider">AI Reasoning Engine</span>
            <button
              type="button"
              onClick={probeAI}
              title="Re-check AI status"
              className="hover:opacity-70 transition-opacity"
            >
              <Cpu className="w-4 h-4" />
            </button>
          </div>
          <div className="text-body font-bold">
            {isProbing ? "Checking…" : aiStatus?.state || "Unknown"}
          </div>
          <p className="text-spec text-ink-dim">
            {isProbing
              ? "Contacting the model…"
              : aiStatus?.detail || "No status reported."}
          </p>
          {!isProbing && aiHealthy && aiStatus?.model && (
            <p className="text-spec text-ink-faint">Model: {aiStatus.model}</p>
          )}
        </div>

        <div className="bg-white p-4 rounded-panel border border-line shadow-xs space-y-2">
          <div className="flex items-center justify-between text-brand-deep">
            <span className="text-spec font-bold uppercase tracking-wider">Knowledge Base</span>
            <Database className="w-4 h-4" />
          </div>
          <div className="text-body font-bold">{documents.length} Indexed Docs</div>
          <p className="text-spec text-ink-dim">Plasgain Product Sheets & AS/NZS Standards</p>
        </div>

        <div className="bg-white p-4 rounded-panel border border-line shadow-xs space-y-2">
          <div className="flex items-center justify-between text-brand-deep">
            <span className="text-spec font-bold uppercase tracking-wider">API Key Security</span>
            <Lock className="w-4 h-4" />
          </div>
          <div className="text-body font-bold">Protected Backend Route</div>
          <p className="text-spec text-ink-dim">Keys hidden from browser network tab</p>
        </div>
      </div>

      {/* Guardrails Configuration */}
      <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-line">
          <ShieldCheck className="w-4 h-4 text-brand-deep" />
          <h2 className="text-body font-bold">Active Copilot Guardrails & Rules</h2>
        </div>

        <div className="space-y-2.5 text-meta">
          <div className="flex items-start gap-2.5 bg-raised p-3 rounded-edge border border-line">
            <CheckCircle2 className="w-4 h-4 text-brand-deep shrink-0 mt-0.5" />
            <div>
              <strong className="text-body">Strict Knowledge Grounding:</strong>
              <p className="text-ink-dim mt-0.5">
                AI responses cite exact datasheet titles, sections, and pages. Never invents unsupported lumens, battery capacity, or warranty periods.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-raised p-3 rounded-edge border border-line">
            <CheckCircle2 className="w-4 h-4 text-brand-deep shrink-0 mt-0.5" />
            <div>
              <strong className="text-body">Quoting Feasibility & Readiness Scoring:</strong>
              <p className="text-ink-dim mt-0.5">
                Automatically checks for essential Australian parameters (sub-category, mounting height, solar zone, operating profile) before quoting.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-raised p-3 rounded-edge border border-line">
            <CheckCircle2 className="w-4 h-4 text-brand-deep shrink-0 mt-0.5" />
            <div>
              <strong className="text-body">Engineering Distinction Notice:</strong>
              <p className="text-ink-dim mt-0.5">
                All product matches are framed as preliminary sales fits for quotation; customer is advised that final AS/NZS compliance requires formal Dialux calculation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Demo Data */}
      <div className="bg-white rounded-panel border border-line p-5 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-meta font-bold">Reset Local Demonstration State</h3>
          <p className="text-spec text-ink-dim">
            Restores initial sample opportunities, customer records, and documents.
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
