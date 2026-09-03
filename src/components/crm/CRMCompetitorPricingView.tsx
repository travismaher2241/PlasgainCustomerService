import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  Search,
  Filter,
  Plus,
  Building2,
  Tag,
  ExternalLink,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Download,
  Calendar,
  Layers,
  ArrowUpDown,
  MoreVertical,
  Archive,
  ArchiveRestore,
  X
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import {
  CompetitorPricingRecord,
  CompetitorPriceBasis,
  CompetitorGstStatus,
  CompetitorSourceType,
  CompetitorPricingStatus
} from "../../types/crm";
import { getLocalDateInputValue } from "../../utils/dateUtils";

export const CRMCompetitorPricingView: React.FC = () => {
  const {
    competitorPricingRecords,
    addCompetitorPricing,
    updateCompetitorPricing,
    accounts,
    crmOpportunities,
    navigateToCRM,
    currentUser,
    showToast
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [competitorFilter, setCompetitorFilter] = useState("all");
  const [statusScope, setStatusScope] = useState<"current" | "superseded" | "all">("current");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CompetitorPricingRecord | null>(null);
  const [formState, setFormState] = useState({
    accountId: accounts[0]?.id || "",
    competitorName: "",
    competitorProduct: "",
    price: 1850,
    plasgainQuotedPrice: "" as string | number,
    currency: "AUD",
    priceBasis: "Per Unit" as CompetitorPriceBasis,
    gstStatus: "Ex GST" as CompetitorGstStatus,
    quantity: "" as string | number,
    sourceType: "Customer Verbal" as CompetitorSourceType,
    observedDate: getLocalDateInputValue(),
    notes: "",
    status: "Active" as CompetitorPricingStatus
  });

  const records = Array.isArray(competitorPricingRecords) ? competitorPricingRecords : [];

  const uniqueCompetitors = useMemo(() => {
    const set = new Set(records.map((r) => r.competitorName));
    return Array.from(set).sort();
  }, [records]);

  // Filtered Records (PART G: DEFAULTS TO CURRENT RECORDS!)
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const isSuperseded = r.status === "Superseded";
      if (statusScope === "current" && isSuperseded) return false;
      if (statusScope === "superseded" && !isSuperseded) return false;

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        r.competitorName.toLowerCase().includes(q) ||
        r.competitorProduct.toLowerCase().includes(q) ||
        (r.accountName && r.accountName.toLowerCase().includes(q)) ||
        (r.notes && r.notes.toLowerCase().includes(q));

      const matchesCompetitor = competitorFilter === "all" || r.competitorName === competitorFilter;

      return matchesSearch && matchesCompetitor;
    });
  }, [records, searchQuery, competitorFilter, statusScope]);

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormState({
      accountId: accounts[0]?.id || "",
      competitorName: "",
      competitorProduct: "",
      price: 1850,
      plasgainQuotedPrice: "",
      currency: "AUD",
      priceBasis: "Per Unit",
      gstStatus: "Ex GST",
      quantity: "",
      sourceType: "Customer Verbal",
      observedDate: getLocalDateInputValue(),
      notes: "",
      status: "Active"
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (record: CompetitorPricingRecord) => {
    setEditingRecord(record);
    setFormState({
      accountId: record.accountId,
      competitorName: record.competitorName,
      competitorProduct: record.competitorProduct,
      price: record.price,
      plasgainQuotedPrice: record.plasgainQuotedPrice ?? "",
      currency: record.currency || "AUD",
      priceBasis: record.priceBasis,
      gstStatus: record.gstStatus,
      quantity: record.quantity ?? "",
      sourceType: record.sourceType,
      observedDate: record.observedDate,
      notes: record.notes || "",
      status: record.status
    });
    setIsModalOpen(true);
  };

  const handleToggleSuperseded = (record: CompetitorPricingRecord) => {
    const isCurrentlySuperseded = record.status === "Superseded";
    updateCompetitorPricing(record.id, {
      status: isCurrentlySuperseded ? "Active" : "Superseded"
    });
    showToast(`Marked ${record.competitorName} pricing as ${isCurrentlySuperseded ? "Current" : "Superseded"}.`, "info");
  };

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const acc = accounts.find((a) => a.id === formState.accountId) || accounts[0];

    const priceNum = typeof formState.price === "number" ? formState.price : parseFloat(formState.price);

    if (editingRecord) {
      updateCompetitorPricing(editingRecord.id, {
        competitorName: formState.competitorName,
        competitorProduct: formState.competitorProduct,
        price: priceNum,
        plasgainQuotedPrice: formState.plasgainQuotedPrice ? Number(formState.plasgainQuotedPrice) : undefined,
        priceBasis: formState.priceBasis,
        gstStatus: formState.gstStatus,
        sourceType: formState.sourceType,
        observedDate: formState.observedDate,
        notes: formState.notes,
        status: formState.status
      });
      showToast("Updated competitor pricing record!", "success");
    } else {
      addCompetitorPricing({
        accountId: acc?.id || "acc-general",
        accountName: acc?.name || "Market Observation",
        competitorName: formState.competitorName,
        competitorProduct: formState.competitorProduct,
        price: priceNum,
        plasgainQuotedPrice: formState.plasgainQuotedPrice ? Number(formState.plasgainQuotedPrice) : undefined,
        currency: "AUD",
        priceBasis: formState.priceBasis,
        gstStatus: formState.gstStatus,
        sourceType: formState.sourceType,
        observedDate: formState.observedDate,
        notes: formState.notes,
        status: formState.status,
        createdBy: currentUser.name
      });
      showToast("Added competitor pricing record!", "success");
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 w-full min-w-0">
      {/* HEADER (PART G: RENAME TO COMPETITOR PRICING, REMOVE DECORATIVE BADGES) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-body tracking-tight">Competitor pricing</h1>
          <p className="text-spec text-ink-dim mt-0.5">
            {filteredRecords.length} records · Verified commercial market benchmarks and competitive pricing intelligence.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2 rounded-edge bg-brand-deep hover:bg-brand text-white font-bold text-spec transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add competitor price</span>
        </button>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3 rounded-panel border border-line shadow-2xs">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-ink-dim absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search competitor, model, account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-spec border border-line rounded-edge bg-white placeholder:text-ink-dim/60 focus:border-brand-deep focus:ring-1 focus:ring-brand-deep"
            />
          </div>

          {/* SCOPE SELECTOR: CURRENT VS SUPERSEDED */}
          <div className="flex items-center rounded-edge border border-line overflow-hidden text-spec font-medium bg-paper/60">
            <button
              type="button"
              onClick={() => setStatusScope("current")}
              className={`px-2.5 py-1 text-xs cursor-pointer ${
                statusScope === "current" ? "bg-chrome text-white font-bold" : "text-ink-dim hover:text-body"
              }`}
            >
              Current
            </button>
            <button
              type="button"
              onClick={() => setStatusScope("superseded")}
              className={`px-2.5 py-1 text-xs cursor-pointer ${
                statusScope === "superseded" ? "bg-chrome text-white font-bold" : "text-ink-dim hover:text-body"
              }`}
            >
              Superseded
            </button>
            <button
              type="button"
              onClick={() => setStatusScope("all")}
              className={`px-2.5 py-1 text-xs cursor-pointer ${
                statusScope === "all" ? "bg-chrome text-white font-bold" : "text-ink-dim hover:text-body"
              }`}
            >
              All
            </button>
          </div>

          {/* COMPETITOR FILTER */}
          <select
            aria-label="Filter by competitor"
            value={competitorFilter}
            onChange={(e) => setCompetitorFilter(e.target.value)}
            className="p-1.5 text-xs border border-line rounded-edge bg-white text-body font-medium"
          >
            <option value="all">All Competitors</option>
            {uniqueCompetitors.map((comp) => (
              <option key={comp} value={comp}>
                {comp}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* COMPACT COMPETITOR ROWS */}
      {filteredRecords.length === 0 ? (
        <div className="p-12 text-center space-y-2 bg-white rounded-panel border border-line shadow-2xs">
          <TrendingUp className="w-10 h-10 text-ink-faint mx-auto" />
          <h2 className="text-base font-bold text-body">
            {statusScope === "current" ? "No current competitor pricing records" : "No pricing records found"}
          </h2>
          <p className="text-spec text-ink-dim max-w-md mx-auto">
            Click <strong>Add competitor price</strong> to log a quote comparison or market benchmark.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-panel border border-line shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-spec">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-ink-dim text-xs font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-4">Competitor &amp; Model</th>
                  <th className="py-2.5 px-4">Price</th>
                  <th className="py-2.5 px-4">Basis &amp; GST</th>
                  <th className="py-2.5 px-4">Source &amp; Date</th>
                  <th className="py-2.5 px-4">Account Context</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-raised/60 transition-colors">
                    {/* COMPETITOR & MODEL */}
                    <td className="py-3 px-4 min-w-[200px]">
                      <div className="font-bold text-body text-spec">{record.competitorName}</div>
                      <div className="text-xs text-ink-dim mt-0.5">{record.competitorProduct}</div>
                    </td>

                    {/* PRICE */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-body text-base">
                      ${(record.price || 0).toLocaleString()}
                    </td>

                    {/* BASIS & GST (PART G: PRESERVED COMMERCIAL EVIDENCE) */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-xs font-semibold text-body">{record.priceBasis}</div>
                      <div className="text-[11px] text-ink-dim font-mono">{record.gstStatus}</div>
                    </td>

                    {/* SOURCE & DATE */}
                    <td className="py-3 px-4 min-w-[160px]">
                      <div className="text-xs font-medium text-body">{record.sourceType}</div>
                      <div className="text-[11px] text-ink-dim font-mono">{record.observedDate}</div>
                    </td>

                    {/* ACCOUNT CONTEXT */}
                    <td className="py-3 px-4 text-xs text-ink-dim min-w-[160px]">
                      {record.accountName || "Market Observation"}
                    </td>

                    {/* ROW MENU (PART G: MOVED TO ROW MENU) */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="relative inline-block">
                        <button
                          type="button"
                          aria-label={`Actions for ${record.competitorName}`}
                          onClick={() => setActiveMenuId(activeMenuId === record.id ? null : record.id)}
                          className="p-1 rounded hover:bg-line text-ink-dim hover:text-body transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuId === record.id && (
                          <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-line rounded-panel shadow-lg py-1 z-30 text-spec text-left animate-in fade-in zoom-in-95 duration-100">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                handleOpenEdit(record);
                              }}
                              className="w-full px-3 py-1.5 hover:bg-raised flex items-center gap-2 text-body"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-ink-dim" />
                              <span>Edit record</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                handleToggleSuperseded(record);
                              }}
                              className="w-full px-3 py-1.5 hover:bg-raised flex items-center gap-2 text-body"
                            >
                              <Archive className="w-3.5 h-3.5 text-ink-dim" />
                              <span>{record.status === "Superseded" ? "Mark Current" : "Supersede"}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-chrome/70 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-150">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="comp-modal-title"
            className="bg-surface rounded-panel max-w-lg w-full p-5 border border-line shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 id="comp-modal-title" className="font-bold text-body text-base">
                {editingRecord ? "Edit Competitor Price" : "Add Competitor Price"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-ink-dim hover:text-body">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-spec font-bold mb-1">Competitor Name *</label>
                  <input
                    required
                    value={formState.competitorName}
                    onChange={(e) => setFormState({ ...formState, competitorName: e.target.value })}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                    placeholder="e.g. Orca Solar"
                  />
                </div>
                <div>
                  <label className="block text-spec font-bold mb-1">Competitor Model *</label>
                  <input
                    required
                    value={formState.competitorProduct}
                    onChange={(e) => setFormState({ ...formState, competitorProduct: e.target.value })}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                    placeholder="e.g. Vertex 60W"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-spec font-bold mb-1">Price ($ AUD) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formState.price}
                    onChange={(e) => setFormState({ ...formState, price: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec font-mono"
                  />
                </div>
                <div>
                  <label className="block text-spec font-bold mb-1">Price Basis</label>
                  <select
                    value={formState.priceBasis}
                    onChange={(e) => setFormState({ ...formState, priceBasis: e.target.value as any })}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                  >
                    <option>Per Unit</option>
                    <option>Supply Only</option>
                    <option>Installed / Turnkey</option>
                    <option>Full Package</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-spec font-bold mb-1">GST Treatment</label>
                  <select
                    value={formState.gstStatus}
                    onChange={(e) => setFormState({ ...formState, gstStatus: e.target.value as any })}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                  >
                    <option>Ex GST</option>
                    <option>Inc GST</option>
                  </select>
                </div>
                <div>
                  <label className="block text-spec font-bold mb-1">Source Type</label>
                  <select
                    value={formState.sourceType}
                    onChange={(e) => setFormState({ ...formState, sourceType: e.target.value as any })}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                  >
                    <option>Customer Verbal</option>
                    <option>Customer Written</option>
                    <option>Public Tender Schedule</option>
                    <option>Distributor Price List</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-spec font-bold mb-1">Notes &amp; Context</label>
                <textarea
                  rows={2}
                  value={formState.notes}
                  onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                  placeholder="e.g. Quoted on 6m column with 5-year warranty"
                  className="w-full p-2 border border-line rounded-edge bg-white text-spec text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-line rounded-edge text-spec font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge"
                >
                  Save Price
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};
