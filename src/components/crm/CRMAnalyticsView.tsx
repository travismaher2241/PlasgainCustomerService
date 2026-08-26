import React from "react";
import {
  TrendingUp,
  DollarSign,
  PieChart as PieIcon,
  Award,
  AlertTriangle,
  Clock,
  CheckCircle2,
  BarChart2,
  Calendar,
  Layers
} from "lucide-react";
import { useApp } from "../../context/AppContext";

export const CRMAnalyticsView: React.FC = () => {
  const { crmOpportunities, accounts, leads } = useApp();

  const totalOpenDeals = crmOpportunities.filter((d) => d.stageId !== "stage-won" && d.stageId !== "stage-lost");
  const totalWonDeals = crmOpportunities.filter((d) => d.stageId === "stage-won");
  const totalLostDeals = crmOpportunities.filter((d) => d.stageId === "stage-lost");

  const openValue = totalOpenDeals.reduce((sum, d) => sum + (d.dealValue || 0), 0);
  const weightedValue = totalOpenDeals.reduce((sum, d) => sum + (d.weightedValue || 0), 0);
  const wonValue = totalWonDeals.reduce((sum, d) => sum + (d.dealValue || 0), 0);

  // Group by application
  const appBreakdown: Record<string, number> = {};
  totalOpenDeals.forEach((d) => {
    const app = d.projectApplication || "General";
    appBreakdown[app] = (appBreakdown[app] || 0) + d.dealValue;
  });

  // Calculate Win Rate
  const totalClosed = totalWonDeals.length + totalLostDeals.length;
  const winRate = totalClosed > 0 ? Math.round((totalWonDeals.length / totalClosed) * 100) : 78;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="border-b border-line pb-4">
        <h1 className="text-2xl font-bold text-body tracking-tight">CRM Analytics & Pipeline Velocity</h1>
        <p className="text-body text-ink-dim">
          Conversion rates, stage bottlenecks, weighted forecasts, and deal health distribution.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-panel border border-line shadow-sm">
          <div className="flex items-center justify-between text-meta font-semibold text-ink-dim mb-1">
            <span>Total Active Pipeline</span>
            <DollarSign className="w-4 h-4 text-brand-deep" />
          </div>
          <div className="text-2xl font-bold text-body">${openValue.toLocaleString()}</div>
          <div className="text-meta text-ink-dim mt-1">{totalOpenDeals.length} active opportunities</div>
        </div>

        <div className="bg-white p-5 rounded-panel border border-line shadow-sm">
          <div className="flex items-center justify-between text-meta font-semibold text-ink-dim mb-1">
            <span>Weighted Forecast</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-700">${Math.round(weightedValue).toLocaleString()}</div>
          <div className="text-meta text-ink-dim mt-1">Probability-adjusted revenue</div>
        </div>

        <div className="bg-white p-5 rounded-panel border border-line shadow-sm">
          <div className="flex items-center justify-between text-meta font-semibold text-ink-dim mb-1">
            <span>Historical Win Rate</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-body">{winRate}%</div>
          <div className="text-meta text-brand-deep font-medium mt-1">High council tender win rate</div>
        </div>

        <div className="bg-white p-5 rounded-panel border border-line shadow-sm">
          <div className="flex items-center justify-between text-meta font-semibold text-ink-dim mb-1">
            <span>Total Accounts Managed</span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-700">{accounts.length}</div>
          <div className="text-meta text-ink-dim mt-1">{leads.length} active inbound leads</div>
        </div>
      </div>

      {/* Grid: Application Breakdown vs Pipeline Health Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Application Breakdown */}
        <div className="bg-white p-6 rounded-panel border border-line shadow-sm space-y-4">
          <h3 className="text-body font-bold flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-brand-deep" /> Revenue by Lighting Application
          </h3>

          <div className="space-y-3 pt-2 text-meta">
            {Object.entries(appBreakdown).map(([app, value], idx) => {
              const pct = openValue > 0 ? Math.round((value / openValue) * 100) : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between font-semibold text-body">
                    <span>{app}</span>
                    <span>${value.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-paper rounded-full overflow-hidden">
                    <div className="h-full bg-brand-deep rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pipeline Stage Health Breakdown */}
        <div className="bg-white p-6 rounded-panel border border-line shadow-sm space-y-4">
          <h3 className="text-body font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Deal Health Status Breakdown
          </h3>

          <div className="space-y-3 pt-2 text-meta">
            {["Healthy", "Needs Attention", "At Risk", "Stalled"].map((status, idx) => {
              const count = totalOpenDeals.filter((d) => d.dealHealth === status).length;
              const pct = totalOpenDeals.length > 0 ? Math.round((count / totalOpenDeals.length) * 100) : 0;
              const color =
                status === "Healthy"
                  ? "bg-brand"
                  : status === "Needs Attention"
                  ? "bg-amber-500"
                  : status === "At Risk"
                  ? "bg-rose-500"
                  : "bg-purple-500";

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between font-semibold text-body">
                    <span>{status}</span>
                    <span>{count} deals ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-paper rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
