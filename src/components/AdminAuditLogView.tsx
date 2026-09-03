import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  Search,
  Filter,
  Phone,
  Plus,
  PenLine,
  Trash2,
  TrendingUp,
  Clock,
  User,
  Building2,
  Briefcase,
  FileText,
  Calendar,
  Download,
  RefreshCw,
  Layers,
  ArrowRight
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { AuditActionType, AuditEntityType, AuditLogRecord } from "../types/crm";

export const AdminAuditLogView: React.FC = () => {
  const { auditLogs, teamMembers, refreshSharedData, currentUser, showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [selectedEntity, setSelectedEntity] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshSharedData();
    setIsRefreshing(false);
    showToast("Audit log refreshed from shared database", "info");
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (selectedUser !== "all") {
        if (log.userId !== selectedUser && log.userName.toLowerCase() !== selectedUser.toLowerCase()) {
          return false;
        }
      }

      if (selectedAction !== "all" && log.action !== selectedAction) {
        return false;
      }

      if (selectedEntity !== "all" && log.entityType !== selectedEntity) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          log.entityName.toLowerCase().includes(q) ||
          log.userName.toLowerCase().includes(q) ||
          log.details.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.entityType.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [auditLogs, selectedUser, selectedAction, selectedEntity, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = auditLogs.length;
    const calls = auditLogs.filter((l) => l.action === "CALL_LOGGED" || l.details.toLowerCase().includes("call")).length;
    const creates = auditLogs.filter((l) => l.action === "CREATE").length;
    const updates = auditLogs.filter((l) => l.action === "UPDATE" || l.action === "STAGE_CHANGE").length;
    const uniqueUsers = new Set(auditLogs.map((l) => l.userName)).size;

    return { total, calls, creates, updates, uniqueUsers };
  }, [auditLogs]);

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) {
      showToast("No audit records to export", "warning");
      return;
    }

    const headers = ["Timestamp", "User", "User Role", "Action", "Entity Type", "Entity Name", "Details"];
    const rows = filteredLogs.map((l) => [
      l.timestamp,
      `"${l.userName.replace(/"/g, '""')}"`,
      `"${l.userRole.replace(/"/g, '""')}"`,
      l.action,
      l.entityType,
      `"${l.entityName.replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `plasgain_audit_log_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Audit log exported to CSV", "success");
  };

  const getActionBadge = (action: AuditActionType) => {
    switch (action) {
      case "CALL_LOGGED":
        return (
          <span className="px-2 py-0.5 text-xs font-bold rounded bg-sky-50 text-sky-800 border border-sky-200 inline-flex items-center gap-1">
            <Phone className="w-3 h-3" />
            Call Logged
          </span>
        );
      case "CREATE":
        return (
          <span className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
            <Plus className="w-3 h-3" />
            Created
          </span>
        );
      case "UPDATE":
        return (
          <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
            <PenLine className="w-3 h-3" />
            Updated
          </span>
        );
      case "DELETE":
        return (
          <span className="px-2 py-0.5 text-xs font-bold rounded bg-rose-50 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
            <Trash2 className="w-3 h-3" />
            Deleted
          </span>
        );
      case "STAGE_CHANGE":
        return (
          <span className="px-2 py-0.5 text-xs font-bold rounded bg-purple-50 text-purple-800 border border-purple-200 inline-flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Stage Moved
          </span>
        );
      case "CONVERT":
        return (
          <span className="px-2 py-0.5 text-xs font-bold rounded bg-indigo-50 text-indigo-800 border border-indigo-200 inline-flex items-center gap-1">
            <ArrowRight className="w-3 h-3" />
            Converted
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-xs font-bold rounded bg-paper text-ink-dim border border-line">
            {action}
          </span>
        );
    }
  };

  const getEntityIcon = (entity: AuditEntityType) => {
    switch (entity) {
      case "Account":
        return <Building2 className="w-3.5 h-3.5 text-brand-deep" />;
      case "Contact":
        return <User className="w-3.5 h-3.5 text-sky-600" />;
      case "Deal":
        return <Briefcase className="w-3.5 h-3.5 text-purple-600" />;
      case "Lead":
        return <Layers className="w-3.5 h-3.5 text-amber-600" />;
      case "Activity":
        return <Phone className="w-3.5 h-3.5 text-emerald-600" />;
      case "Document":
        return <FileText className="w-3.5 h-3.5 text-indigo-600" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-ink-dim" />;
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-wash text-brand-deep rounded-edge">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-body">
              Admin Audit Trail &amp; History
            </h1>
          </div>
          <p className="text-spec text-ink-dim mt-1">
            Immutable, central log of all customer calls, account edits, deal movements, and records entered across team members.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 text-spec font-semibold text-ink-dim hover:text-body bg-white hover:bg-paper border border-line rounded-edge transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-1.5 text-spec font-bold text-brand-deep bg-brand-wash hover:bg-brand-wash/80 border border-brand-edge rounded-edge transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white rounded-panel border border-line shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-ink-dim uppercase">Total Changes</span>
          <p className="text-2xl font-extrabold text-body">{stats.total}</p>
          <span className="text-[11px] text-ink-dim block">Recorded across workspace</span>
        </div>

        <div className="p-3.5 bg-white rounded-panel border border-line shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-sky-800 uppercase">Customer Calls Logged</span>
          <p className="text-2xl font-extrabold text-sky-700">{stats.calls}</p>
          <span className="text-[11px] text-sky-700/80 block">Phone &amp; meeting entries</span>
        </div>

        <div className="p-3.5 bg-white rounded-panel border border-line shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-amber-800 uppercase">Updates &amp; Movements</span>
          <p className="text-2xl font-extrabold text-amber-700">{stats.updates}</p>
          <span className="text-[11px] text-amber-700/80 block">Deal &amp; contact revisions</span>
        </div>

        <div className="p-3.5 bg-white rounded-panel border border-line shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-brand-deep uppercase">Active Contributors</span>
          <p className="text-2xl font-extrabold text-brand-deep">{stats.uniqueUsers}</p>
          <span className="text-[11px] text-ink-dim block">Team members active</span>
        </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="p-4 bg-white rounded-panel border border-line shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-ink-dim absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by details, account, user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-spec border border-line rounded-edge bg-white focus:outline-none focus:ring-1 focus:ring-brand-deep"
            />
          </div>

          {/* User Filter */}
          <div>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              aria-label="Filter by Team Member"
              className="w-full p-1.5 text-spec border border-line rounded-edge bg-white text-body font-medium"
            >
              <option value="all">All Team Members</option>
              {teamMembers.map((m) => (
                <option key={m.id || m.name} value={m.name}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              aria-label="Filter by Action Type"
              className="w-full p-1.5 text-spec border border-line rounded-edge bg-white text-body font-medium"
            >
              <option value="all">All Action Types</option>
              <option value="CALL_LOGGED">Customer Calls Logged</option>
              <option value="CREATE">New Records Created</option>
              <option value="UPDATE">Record Details Updated</option>
              <option value="STAGE_CHANGE">Deal Stage Changes</option>
              <option value="CONVERT">Lead Conversions</option>
              <option value="DELETE">Record Deletions</option>
            </select>
          </div>

          {/* Entity Filter */}
          <div>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              aria-label="Filter by Entity Type"
              className="w-full p-1.5 text-spec border border-line rounded-edge bg-white text-body font-medium"
            >
              <option value="all">All Entity Types</option>
              <option value="Account">Accounts</option>
              <option value="Contact">Contacts</option>
              <option value="Deal">Deals / Opportunities</option>
              <option value="Lead">Leads</option>
              <option value="Activity">Activities</option>
              <option value="Task">Tasks</option>
              <option value="Document">Documents</option>
            </select>
          </div>
        </div>
      </div>

      {/* AUDIT LOG ENTRIES LIST */}
      <div className="bg-white rounded-panel border border-line shadow-2xs overflow-hidden">
        <div className="px-4 py-3 bg-paper/60 border-b border-line flex items-center justify-between">
          <span className="text-spec font-bold text-body">
            Audit Records ({filteredLogs.length})
          </span>
          <span className="text-xs text-ink-dim">
            Showing latest entries (shared central database)
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-ink-dim space-y-2">
            <Clock className="w-10 h-10 text-ink-faint mx-auto" />
            <p className="font-bold text-body">No audit records found matching your filters</p>
            <p className="text-xs">Adjust your search or filter parameters to inspect workspace history.</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-raised/40 transition-colors space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getActionBadge(log.action)}
                    <div className="flex items-center gap-1.5 text-spec font-bold text-body">
                      {getEntityIcon(log.entityType)}
                      <span>{log.entityType}:</span>
                      <span className="text-brand-deep">{log.entityName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-ink-dim">
                    <span className="font-mono bg-paper px-2 py-0.5 rounded border border-line">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                </div>

                <p className="text-spec text-body font-medium leading-relaxed">
                  {log.details}
                </p>

                <div className="flex items-center justify-between text-xs text-ink-dim pt-1 border-t border-line/40">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-ink-dim">Performed by:</span>
                    <strong className="text-body font-bold">{log.userName}</strong>
                    <span className="text-ink-faint">({log.userRole})</span>
                  </div>

                  <span className="text-[11px] font-mono text-ink-faint">ID: {log.id}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
