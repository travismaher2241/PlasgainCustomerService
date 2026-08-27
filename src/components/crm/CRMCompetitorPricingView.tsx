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
  ArrowUpDown
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import {
  CompetitorPricingRecord,
  CompetitorPriceBasis,
  CompetitorGstStatus,
  CompetitorSourceType,
  CompetitorPricingStatus
} from "../../types/crm";

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
  const [statusFilter, setStatusFilter] = useState("all");
  const [priceBasisFilter, setPriceBasisFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CompetitorPricingRecord | null>(null);
  const [formState, setFormState] = useState({
    accountId: accounts[0]?.id || "",
    opportunityId: "",
    opportunityName: "",
    competitorName: "",
    competitorProduct: "",
    price: 1850,
    plasgainQuotedPrice: "" as string | number,
    currency: "AUD",
    priceBasis: "Per Unit" as CompetitorPriceBasis,
    gstStatus: "Ex GST" as CompetitorGstStatus,
    quantity: "" as string | number,
    sourceType: "Customer Verbal" as CompetitorSourceType,
    observedDate: new Date().toISOString().split("T")[0],
    notes: "",
    status: "Active" as CompetitorPricingStatus
  });

  // Unique Competitor List for Filter
  const uniqueCompetitors = useMemo(() => {
    const set = new Set(competitorPricingRecords.map((r) => r.competitorName));
    return Array.from(set).sort();
  }, [competitorPricingRecords]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return competitorPricingRecords.filter((r) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        r.competitorName.toLowerCase().includes(q) ||
        r.competitorProduct.toLowerCase().includes(q) ||
        r.accountName.toLowerCase().includes(q) ||
        (r.notes && r.notes.toLowerCase().includes(q));

      const matchesCompetitor = competitorFilter === "all" || r.competitorName === competitorFilter;
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesBasis = priceBasisFilter === "all" || r.priceBasis === priceBasisFilter;
      const matchesSource = sourceFilter === "all" || r.sourceType === sourceFilter;

      return matchesSearch && matchesCompetitor && matchesStatus && matchesBasis && matchesSource;
    });
  }, [competitorPricingRecords, searchQuery, competitorFilter, statusFilter, priceBasisFilter, sourceFilter]);

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormState({
      accountId: accounts[0]?.id || "",
      opportunityId: "",
      opportunityName: "",
      competitorName: "",
      competitorProduct: "",
      price: 1850,
      plasgainQuotedPrice: "",
      currency: "AUD",
      priceBasis: "Per Unit",
      gstStatus: "Ex GST",
      quantity: "",
      sourceType: "Customer Verbal",
      observedDate: new Date().toISOString().split("T")[0],
      notes: "",
      status: "Active"
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (record: CompetitorPricingRecord) => {
    setEditingRecord(record);
    const opp = crmOpportunities.find((o) => o.id === record.opportunityId);
    setFormState({
      accountId: record.accountId,
      opportunityId: record.opportunityId || "",
      opportunityName: record.opportunityName || opp?.name || "",
      competitorName: record.competitorName,
      competitorProduct: record.competitorProduct,
      price: record.price,
      plasgainQuotedPrice: record.plasgainQuotedPrice !== undefined ? record.plasgainQuotedPrice : "",
      currency: record.currency || "AUD",
      priceBasis: record.priceBasis,
      gstStatus: record.gstStatus,
      quantity: record.quantity || "",
      sourceType: record.sourceType,
      observedDate: record.observedDate,
      notes: record.notes || "",
      status: record.status
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const account = accounts.find((a) => a.id === formState.accountId) || accounts[0];
    const priceNum = typeof formState.price === "number" ? formState.price : parseFloat(formState.price);
    const qtyNum = formState.quantity ? (typeof formState.quantity === "number" ? formState.quantity : parseFloat(formState.quantity)) : undefined;
    const opp = crmOpportunities.find((o) => o.id === formState.opportunityId);
    const plasgainPriceNum = formState.plasgainQuotedPrice !== "" && formState.plasgainQuotedPrice !== undefined ? (typeof formState.plasgainQuotedPrice === "number" ? formState.plasgainQuotedPrice : parseFloat(formState.plasgainQuotedPrice as string)) : undefined;

    if (editingRecord) {
      await updateCompetitorPricing(editingRecord.id, {
        accountId: account.id,
        accountName: account.name,
        opportunityId: formState.opportunityId || undefined,
        opportunityName: opp?.name || formState.opportunityName || undefined,
        competitorName: formState.competitorName,
        competitorProduct: formState.competitorProduct,
        price: priceNum,
        plasgainQuotedPrice: plasgainPriceNum,
        priceBasis: formState.priceBasis,
        gstStatus: formState.gstStatus,
        quantity: qtyNum,
        sourceType: formState.sourceType,
        observedDate: formState.observedDate,
        notes: formState.notes,
        status: formState.status
      });
    } else {
      await addCompetitorPricing({
        accountId: account.id,
        accountName: account.name,
        opportunityId: formState.opportunityId || undefined,
        opportunityName: opp?.name || formState.opportunityName || undefined,
        competitorName: formState.competitorName,
        competitorProduct: formState.competitorProduct,
        price: priceNum,
        plasgainQuotedPrice: plasgainPriceNum,
        currency: formState.currency,
        priceBasis: formState.priceBasis,
        gstStatus: formState.gstStatus,
        quantity: qtyNum,
        sourceType: formState.sourceType,
        observedDate: formState.observedDate,
        notes: formState.notes,
        createdBy: currentUser.name,
        status: formState.status
      });
    }

    setIsModalOpen(false);
  };

  // Export filtered intelligence report as CSV
  const handleExportCSV = () => {
    const headers = [
      "Competitor",
      "Model / Product",
      "Customer Account",
      "Price ($ AUD)",
      "Price Basis",
      "GST Status",
      "Quantity",
      "Source",
      "Observed Date",
      "Recorded By",
      "Status",
      "Notes"
    ];

    const rows = filteredRecords.map((r) => [
      `"${r.competitorName.replace(/"/g, '""')}"`,
      `"${r.competitorProduct.replace(/"/g, '""')}"`,
      `"${r.accountName.replace(/"/g, '""')}"`,
      r.price,
      `"${r.priceBasis}"`,
      `"${r.gstStatus}"`,
      r.quantity || "",
      `"${r.sourceType}"`,
      `"${r.observedDate}"`,
      `"${r.createdBy}"`,
      `"${r.status}"`,
      `"${(r.notes || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Competitor_Pricing_Intelligence_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    showToast("Downloaded Competitor Pricing Intelligence CSV!", "success");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Banner & Actions */}
      <div className="bg-white p-6 rounded-panel border border-line shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-spec font-bold px-2 py-0.5 rounded-full bg-brand-wash text-brand-deep">
              Market Intelligence
            </span>
            <span className="text-meta text-ink-dim font-medium">Shared Team Repository</span>
          </div>
          <h1 className="text-2xl font-bold text-body tracking-tight">Competitor Pricing Intelligence</h1>
          <p className="text-meta text-ink-dim mt-0.5">
            Consolidated market price points, tender schedules, and competitor quotes across accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-meta font-bold bg-paper hover:bg-raised text-body border border-line rounded-edge transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-ink-dim" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 text-meta font-bold text-white bg-brand-deep hover:bg-brand rounded-edge transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Record Intelligence</span>
          </button>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="bg-white p-4 rounded-panel border border-line shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-meta">
          
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-ink-faint absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search competitor, model, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-paper rounded-edge border border-line font-medium text-meta"
            />
          </div>

          {/* Competitor Filter */}
          <div>
            <select
              value={competitorFilter}
              onChange={(e) => setCompetitorFilter(e.target.value)}
              className="w-full py-1.5 px-2 bg-paper border border-line rounded-edge font-medium text-meta"
            >
              <option value="all">All Competitors</option>
              {uniqueCompetitors.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-1.5 px-2 bg-paper border border-line rounded-edge font-medium text-meta"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Superseded">Superseded</option>
              <option value="Unverified">Unverified</option>
            </select>
          </div>

          {/* Price Basis Filter */}
          <div>
            <select
              value={priceBasisFilter}
              onChange={(e) => setPriceBasisFilter(e.target.value)}
              className="w-full py-1.5 px-2 bg-paper border border-line rounded-edge font-medium text-meta"
            >
              <option value="all">All Price Bases</option>
              <option value="Per Unit">Per Unit</option>
              <option value="Per System">Per System</option>
              <option value="Project Total">Project Total</option>
              <option value="Supply Only">Supply Only</option>
              <option value="Installed">Installed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-panel border border-line shadow-xs overflow-hidden">
        <div className="p-4 border-b border-line flex items-center justify-between">
          <div className="font-bold text-meta text-body">
            Showing {filteredRecords.length} Competitor Pricing Records
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-ink-dim space-y-2">
            <TrendingUp className="w-10 h-10 mx-auto text-ink-faint" />
            <div className="font-bold text-body">No matching competitor records found</div>
            <p className="text-spec max-w-sm mx-auto">
              Try adjusting your search filters or click "Record Intelligence" to log new competitor pricing.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-meta">
              <thead>
                <tr className="bg-raised border-b border-line text-spec font-bold text-ink-dim uppercase">
                  <th className="text-left py-3 px-4">Competitor &amp; Model</th>
                  <th className="text-left py-3 px-3">Customer Account</th>
                  <th className="text-right py-3 px-3">Observed Price ($ AUD)</th>
                  <th className="text-left py-3 px-3">Price Basis</th>
                  <th className="text-left py-3 px-3">Source &amp; Date</th>
                  <th className="text-center py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredRecords.map((item) => (
                  <tr key={item.id} className="hover:bg-raised/50 transition-colors group">
                    
                    {/* Competitor & Model */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-body text-meta">{item.competitorName}</div>
                      <div className="font-mono text-spec text-brand-deep font-semibold">
                        {item.competitorProduct}
                      </div>
                    </td>

                    {/* Customer Account */}
                    <td className="py-3 px-3">
                      <button
                        onClick={() => navigateToCRM("accounts", item.accountId)}
                        className="font-semibold text-brand-deep hover:underline text-left flex items-center gap-1 cursor-pointer"
                      >
                        <span>{item.accountName}</span>
                        <ExternalLink className="w-3 h-3 text-ink-dim" />
                      </button>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-3 text-right">
                      <div className="font-black text-body text-meta">
                        ${item.price.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-ink-dim font-bold">{item.gstStatus}</div>
                    </td>

                    {/* Price Basis */}
                    <td className="py-3 px-3 text-spec text-ink-dim">
                      <span className="font-semibold text-body">{item.priceBasis}</span>
                      {item.quantity && <span className="block text-[11px]">Qty: {item.quantity}</span>}
                    </td>

                    {/* Source & Date */}
                    <td className="py-3 px-3 text-spec text-ink-dim">
                      <div className="font-semibold text-body">{item.sourceType}</div>
                      <div className="text-[11px]">{item.observedDate} ({item.createdBy})</div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-spec px-2 py-0.5 rounded-full font-bold ${
                          item.status === "Active"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.status === "Superseded"
                            ? "bg-paper text-ink-dim border border-line"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="px-2 py-1 text-spec font-semibold hover:bg-raised rounded border border-line cursor-pointer text-body"
                        title="Edit / Correct details"
                      >
                        Edit
                      </button>
                      {item.status === "Active" ? (
                        <button
                          onClick={() => updateCompetitorPricing(item.id, { status: "Superseded" })}
                          className="px-2 py-1 text-spec font-semibold text-ink-dim hover:text-ink hover:bg-raised rounded border border-line cursor-pointer"
                          title="Mark Superseded"
                        >
                          Supersede
                        </button>
                      ) : (
                        <button
                          onClick={() => updateCompetitorPricing(item.id, { status: "Active" })}
                          className="px-2 py-1 text-spec font-semibold text-brand-deep hover:bg-brand-wash rounded border border-brand-edge cursor-pointer"
                          title="Re-activate record"
                        >
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-chrome/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-deep" />
                <h3 className="text-lg font-bold text-body">
                  {editingRecord ? "Edit Competitor Intelligence" : "Record Competitor Intelligence"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-ink-faint hover:text-ink p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-meta">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Customer Account *
                  </label>
                  <select
                    value={formState.accountId}
                    onChange={(e) => setFormState({ ...formState, accountId: e.target.value, opportunityId: "", opportunityName: "" })}
                    className="w-full p-2 bg-paper rounded-edge border border-line text-meta font-medium"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Linked Deal / Project
                  </label>
                  <select
                    value={formState.opportunityId}
                    onChange={(e) => {
                      const opp = crmOpportunities.find((o) => o.id === e.target.value);
                      setFormState({ ...formState, opportunityId: e.target.value, opportunityName: opp?.name || "" });
                    }}
                    className="w-full p-2 bg-paper rounded-edge border border-line text-meta font-medium"
                  >
                    <option value="">None / General Market</option>
                    {crmOpportunities
                      .filter((o) => !formState.accountId || o.accountId === formState.accountId)
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Competitor Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Leadsun, Orca Solar"
                    value={formState.competitorName}
                    onChange={(e) => setFormState({ ...formState, competitorName: e.target.value })}
                    className="w-full p-2 bg-paper rounded-edge border border-line text-meta font-medium"
                  />
                </div>
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Competitor Model / Product *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AE3 30W All-In-One"
                    value={formState.competitorProduct}
                    onChange={(e) => setFormState({ ...formState, competitorProduct: e.target.value })}
                    className="w-full p-2 bg-paper rounded-edge border border-line text-meta font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Observed Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formState.price}
                    onChange={(e) => setFormState({ ...formState, price: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-paper rounded-edge border border-line font-bold text-urgent text-meta"
                  />
                </div>
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Plasgain Quoted ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 1950"
                    value={formState.plasgainQuotedPrice}
                    onChange={(e) => setFormState({ ...formState, plasgainQuotedPrice: e.target.value })}
                    className="w-full p-2 bg-paper rounded-edge border border-line font-bold text-brand-deep text-meta"
                  />
                </div>
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Price Basis *
                  </label>
                  <select
                    value={formState.priceBasis}
                    onChange={(e) => setFormState({ ...formState, priceBasis: e.target.value as CompetitorPriceBasis })}
                    className="w-full p-2 bg-paper rounded-edge border border-line text-meta"
                  >
                    <option value="Per Unit">Per Unit</option>
                    <option value="Per System">Per System</option>
                    <option value="Project Total">Project Total</option>
                    <option value="Supply Only">Supply Only</option>
                    <option value="Installed">Installed</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    GST Treatment
                  </label>
                  <select
                    value={formState.gstStatus}
                    onChange={(e) => setFormState({ ...formState, gstStatus: e.target.value as CompetitorGstStatus })}
                    className="w-full p-2 bg-paper rounded-edge border border-line text-meta"
                  >
                    <option value="Ex GST">Ex GST</option>
                    <option value="Inc GST">Inc GST</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Intelligence Source *
                  </label>
                  <select
                    value={formState.sourceType}
                    onChange={(e) => setFormState({ ...formState, sourceType: e.target.value as CompetitorSourceType })}
                    className="w-full p-2 bg-paper rounded-edge border border-line text-meta"
                  >
                    <option value="Customer Verbal">Customer Verbal</option>
                    <option value="Competitor Quote">Competitor Quote</option>
                    <option value="Tender Schedule">Tender Schedule</option>
                    <option value="Email">Email</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Date Observed *
                  </label>
                  <input
                    type="date"
                    required
                    value={formState.observedDate}
                    onChange={(e) => setFormState({ ...formState, observedDate: e.target.value })}
                    className="w-full p-2 bg-paper rounded-edge border border-line text-meta"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Quantity (if known)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 24"
                    value={formState.quantity}
                    onChange={(e) => setFormState({ ...formState, quantity: e.target.value })}
                    className="w-full p-2 bg-paper rounded-edge border border-line text-meta"
                  />
                </div>
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Status
                  </label>
                  <select
                    value={formState.status}
                    onChange={(e) => setFormState({ ...formState, status: e.target.value as CompetitorPricingStatus })}
                    className="w-full p-2 bg-paper rounded-edge border border-line text-meta"
                  >
                    <option value="Active">Active</option>
                    <option value="Superseded">Superseded</option>
                    <option value="Unverified">Unverified</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                  Context &amp; Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context, warranty notes, or tender specifics"
                  value={formState.notes}
                  onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                  className="w-full p-2 bg-paper rounded-edge border border-line text-meta"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-ink-dim hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-brand-deep rounded-edge hover:bg-brand transition-colors cursor-pointer shadow-xs"
                >
                  {editingRecord ? "Update Intelligence" : "Save & Alert Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
