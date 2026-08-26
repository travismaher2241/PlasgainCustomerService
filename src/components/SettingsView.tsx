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

/** Live AI status, probed from the server rather than asserted. */
interface AIStatus {
  configured: boolean;
  reachable: boolean;
  state: string;
  detail: string;
  model?: string;
}

export const SettingsView: React.FC = () => {
  const { setOpportunities, documents, showToast } = useApp();
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
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Settings & AI Copilot Diagnostics</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          System status, model configuration, knowledge base indexing, and compliance rules.
        </p>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className={`p-4 rounded-xl border shadow-xs space-y-2 ${
            isProbing
              ? "bg-white border-slate-200"
              : aiHealthy
              ? "bg-white border-slate-200"
              : "bg-amber-50 border-amber-300"
          }`}
        >
          <div
            className={`flex items-center justify-between ${
              aiHealthy ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider">AI Reasoning Engine</span>
            <button
              type="button"
              onClick={probeAI}
              title="Re-check AI status"
              className="hover:opacity-70 transition-opacity"
            >
              <Cpu className="w-4 h-4" />
            </button>
          </div>
          <div className="text-sm font-bold text-slate-900">
            {isProbing ? "Checking…" : aiStatus?.state || "Unknown"}
          </div>
          <p className="text-[11px] text-slate-500">
            {isProbing
              ? "Contacting the model…"
              : aiStatus?.detail || "No status reported."}
          </p>
          {!isProbing && aiHealthy && aiStatus?.model && (
            <p className="text-[11px] text-slate-400">Model: {aiStatus.model}</p>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[10px] font-bold uppercase tracking-wider">Knowledge Base</span>
            <Database className="w-4 h-4" />
          </div>
          <div className="text-sm font-bold text-slate-900">{documents.length} Indexed Docs</div>
          <p className="text-[11px] text-slate-500">Plasgain Product Sheets & AS/NZS Standards</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[10px] font-bold uppercase tracking-wider">API Key Security</span>
            <Lock className="w-4 h-4" />
          </div>
          <div className="text-sm font-bold text-slate-900">Protected Backend Route</div>
          <p className="text-[11px] text-slate-500">Keys hidden from browser network tab</p>
        </div>
      </div>

      {/* Guardrails Configuration */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <h2 className="text-sm font-bold text-slate-900">Active Copilot Guardrails & Rules</h2>
        </div>

        <div className="space-y-2.5 text-xs text-slate-700">
          <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900">Strict Knowledge Grounding:</strong>
              <p className="text-slate-600 mt-0.5">
                AI responses cite exact datasheet titles, sections, and pages. Never invents unsupported lumens, battery capacity, or warranty periods.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900">Quoting Feasibility & Readiness Scoring:</strong>
              <p className="text-slate-600 mt-0.5">
                Automatically checks for essential Australian parameters (sub-category, mounting height, solar zone, operating profile) before quoting.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900">Engineering Distinction Notice:</strong>
              <p className="text-slate-600 mt-0.5">
                All product matches are framed as preliminary sales fits for quotation; customer is advised that final AS/NZS compliance requires formal Dialux calculation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Demo Data */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-900">Reset Local Demonstration State</h3>
          <p className="text-[11px] text-slate-500">
            Restores initial sample opportunities, customer records, and documents.
          </p>
        </div>
        <button
          onClick={handleResetData}
          className="text-xs font-medium px-3.5 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Sample Data</span>
        </button>
      </div>
    </div>
  );
};
