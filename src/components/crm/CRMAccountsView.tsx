import React, { useState } from "react";
import {
  Building2,
  Users,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  Globe,
  Sparkles,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Send,
  Calendar,
  Layers,
  ChevronRight,
  UserCheck,
  Tag,
  ShieldAlert,
  ArrowUpRight,
  Edit3,
  Trash2,
  Smartphone
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { Account, CRMContact, CRMOpportunity, RelationshipHealth } from "../../types/crm";
import { CRMContactModal } from "./CRMContactModal";

export const CRMAccountsView: React.FC = () => {
  const {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    contacts,
    crmOpportunities,
    activities,
    tasks,
    updateAccount,
    addAccount,
    addContact,
    updateContact,
    deleteContact,
    openQuickLog,
    navigateToCRM
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [healthFilter, setHealthFilter] = useState("all");
  const [activeAccountTab, setActiveAccountTab] = useState<"overview" | "contacts" | "deals" | "timeline" | "quotes" | "ai-summary">("overview");

  // Contact modal state
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<CRMContact | null>(null);

  // Create new account modal state
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [newAccountForm, setNewAccountForm] = useState({
    name: "",
    tradingName: "",
    status: "Customer" as const,
    industry: "Government & Public Infrastructure",
    customerSegment: "Local Government / Council" as const,
    territory: "QLD/NT" as const,
    accountOwner: "Marcus Vance",
    mainPhone: "",
    generalEmail: "",
    website: "",
    notes: ""
  });

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.tradingName && acc.tradingName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      acc.industry.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSegment = segmentFilter === "all" || acc.customerSegment === segmentFilter;
    const matchesHealth = healthFilter === "all" || acc.relationshipHealth === healthFilter;
    return matchesSearch && matchesSegment && matchesHealth;
  });

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];
  const accountContacts = contacts.filter((c) => c.accountId === selectedAccount?.id);
  const accountDeals = crmOpportunities.filter((d) => d.accountId === selectedAccount?.id);
  const accountActivities = activities.filter((act) => act.accountId === selectedAccount?.id);
  const accountTasks = tasks.filter((t) => t.accountId === selectedAccount?.id);

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountForm.name.trim()) return;

    const newAcc: Account = {
      id: `acc-${Date.now()}`,
      name: newAccountForm.name,
      tradingName: newAccountForm.tradingName,
      status: newAccountForm.status,
      industry: newAccountForm.industry,
      customerSegment: newAccountForm.customerSegment,
      territory: newAccountForm.territory,
      accountOwner: newAccountForm.accountOwner,
      leadSource: "Direct Contact",
      createdDate: new Date().toISOString().split("T")[0],
      lastInteractionDate: new Date().toISOString().split("T")[0],
      mainPhone: newAccountForm.mainPhone,
      generalEmail: newAccountForm.generalEmail,
      website: newAccountForm.website,
      notes: newAccountForm.notes,
      relationshipHealth: "Healthy",
      tags: [newAccountForm.customerSegment],
      metrics: {
        openPipelineValue: 0,
        totalDealsWon: 0,
        activeDealsCount: 0,
        totalEnquiries: 0
      }
    };

    addAccount(newAcc);
    setSelectedAccountId(newAcc.id);
    setIsNewAccountModalOpen(false);
  };

  const getHealthBadge = (health: RelationshipHealth) => {
    switch (health) {
      case "Strong":
        return <span className="px-2 py-0.5 rounded-full text-meta font-semibold bg-brand-wash text-brand-deep border border-brand-edge">Strong</span>;
      case "Healthy":
        return <span className="px-2 py-0.5 rounded-full text-meta font-semibold bg-blue-100 text-blue-800 border border-blue-200">Healthy</span>;
      case "Needs Attention":
        return <span className="px-2 py-0.5 rounded-full text-meta font-semibold bg-amber-100 text-amber-800 border border-amber-200">Needs Attention</span>;
      case "At Risk":
        return <span className="px-2 py-0.5 rounded-full text-meta font-semibold bg-rose-100 text-rose-800 border border-rose-200">At Risk</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold text-body tracking-tight">Account & Customer 360°</h1>
          <p className="text-body text-ink-dim">
            Unified organizational records, multi-stakeholder relationships, active deals, and interaction history.
          </p>
        </div>
        <button
          onClick={() => setIsNewAccountModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-meta font-semibold text-white bg-brand-deep rounded-edge hover:bg-brand-deep shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Account
        </button>
      </div>

      {/* Main 2-Column Split: Account List vs 360 Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Directory & Search (4 Columns) */}
        <div className="lg:col-span-4 bg-white rounded-panel border border-line shadow-sm overflow-hidden flex flex-col h-[780px]">
          {/* Filters */}
          <div className="p-3.5 border-b border-line space-y-2.5 bg-raised">
            <div className="relative">
              <Search className="w-4 h-4 text-ink-faint absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search account name, trading name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-meta bg-white border border-line rounded-edge focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={segmentFilter}
                onChange={(e) => setSegmentFilter(e.target.value)}
                className="w-1/2 text-meta py-1 px-2 bg-white border border-line rounded-edge"
              >
                <option value="all">All Segments</option>
                <option value="Local Government / Council">Councils</option>
                <option value="Civil Contractor">Civil Contractors</option>
                <option value="Commercial Developer">Developers</option>
                <option value="Electrical Contractor">Wholesale / Electrical</option>
              </select>
              <select
                value={healthFilter}
                onChange={(e) => setHealthFilter(e.target.value)}
                className="w-1/2 text-meta py-1 px-2 bg-white border border-line rounded-edge"
              >
                <option value="all">All Health</option>
                <option value="Strong">Strong</option>
                <option value="Healthy">Healthy</option>
                <option value="Needs Attention">Needs Attention</option>
                <option value="At Risk">At Risk</option>
              </select>
            </div>
          </div>

          {/* Account Scroll List */}
          <div className="divide-y divide-line overflow-y-auto flex-1">
            {filteredAccounts.length === 0 ? (
              <div className="p-8 text-center text-meta text-ink-dim">
                No matching accounts found.
              </div>
            ) : (
              filteredAccounts.map((acc) => {
                const isSelected = acc.id === selectedAccount?.id;
                return (
                  <div
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-brand-wash border-l-4 border-brand-deep"
                        : "hover:bg-raised"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="text-meta font-bold leading-snug">{acc.name}</div>
                        <div className="text-spec text-ink-dim">{acc.customerSegment} · {acc.territory}</div>
                      </div>
                      {getHealthBadge(acc.relationshipHealth)}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-spec text-ink-dim">
                      <span>Pipeline: <strong className="text-body font-semibold">${(acc.metrics?.openPipelineValue || 0).toLocaleString()}</strong></span>
                      <span>Owner: {acc.accountOwner.split(" ")[0]}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Account 360 Workspace (8 Columns) */}
        {selectedAccount && (
          <div className="lg:col-span-8 bg-white rounded-panel border border-line shadow-sm overflow-hidden flex flex-col min-h-[780px]">
            {/* Account Header Banner */}
            <div className="p-6 border-b border-line bg-gradient-to-r from-line via-white to-white">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-meta font-semibold px-2.5 py-0.5 rounded-full bg-paper border border-line">
                      {selectedAccount.status}
                    </span>
                    <span className="text-meta text-ink-dim">{selectedAccount.customerSegment}</span>
                    <span className="text-meta text-ink-faint">·</span>
                    <span className="text-meta text-ink-dim">Territory: {selectedAccount.territory}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-body">{selectedAccount.name}</h2>
                  {selectedAccount.tradingName && selectedAccount.tradingName !== selectedAccount.name && (
                    <div className="text-meta text-ink-dim mt-0.5">T/A {selectedAccount.tradingName}</div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openQuickLog("call", selectedAccount.id)}
                    className="px-3 py-1.5 text-meta font-semibold bg-white border border-line-strong rounded-edge hover:bg-raised shadow-sm"
                  >
                    + Call
                  </button>
                  <button
                    onClick={() => openQuickLog("task", selectedAccount.id)}
                    className="px-3 py-1.5 text-meta font-semibold bg-white border border-line-strong rounded-edge hover:bg-raised shadow-sm"
                  >
                    + Task
                  </button>
                  <button
                    onClick={() => openQuickLog("note", selectedAccount.id)}
                    className="px-3 py-1.5 text-meta font-semibold text-white bg-brand-deep rounded-edge hover:bg-brand-deep shadow-sm"
                  >
                    + Note
                  </button>
                </div>
              </div>

              {/* Quick Info Bar */}
              <div className="mt-4 pt-4 border-t border-line grid grid-cols-2 sm:grid-cols-4 gap-3 text-meta">
                <div>
                  <span className="text-ink-faint block text-spec">Relationship Health</span>
                  <div className="mt-0.5">{getHealthBadge(selectedAccount.relationshipHealth)}</div>
                </div>
                <div>
                  <span className="text-ink-faint block text-spec">Open Pipeline</span>
                  <span className="font-bold text-body">
                    ${(selectedAccount.metrics?.openPipelineValue || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-ink-faint block text-spec">Total Won to Date</span>
                  <span className="font-bold text-brand-deep text-body">
                    ${(selectedAccount.metrics?.totalDealsWon || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-ink-faint block text-spec">Account Owner</span>
                  <span className="font-semibold text-body">{selectedAccount.accountOwner}</span>
                </div>
              </div>
            </div>

            {/* Sub Tabs */}
            <div className="px-6 border-b border-line flex items-center gap-6 overflow-x-auto text-meta font-semibold">
              <button
                onClick={() => setActiveAccountTab("overview")}
                className={`py-3.5 border-b-2 transition-colors ${
                  activeAccountTab === "overview"
                    ? "border-brand-deep text-brand-deep"
                    : "border-transparent text-ink-dim hover:text-ink"
                }`}
              >
                Overview & Details
              </button>
              <button
                onClick={() => setActiveAccountTab("contacts")}
                className={`py-3.5 border-b-2 transition-colors ${
                  activeAccountTab === "contacts"
                    ? "border-brand-deep text-brand-deep"
                    : "border-transparent text-ink-dim hover:text-ink"
                }`}
              >
                Contacts ({accountContacts.length})
              </button>
              <button
                onClick={() => setActiveAccountTab("deals")}
                className={`py-3.5 border-b-2 transition-colors ${
                  activeAccountTab === "deals"
                    ? "border-brand-deep text-brand-deep"
                    : "border-transparent text-ink-dim hover:text-ink"
                }`}
              >
                Opportunities ({accountDeals.length})
              </button>
              <button
                onClick={() => setActiveAccountTab("timeline")}
                className={`py-3.5 border-b-2 transition-colors ${
                  activeAccountTab === "timeline"
                    ? "border-brand-deep text-brand-deep"
                    : "border-transparent text-ink-dim hover:text-ink"
                }`}
              >
                Activity Timeline ({accountActivities.length})
              </button>
              <button
                onClick={() => setActiveAccountTab("ai-summary")}
                className={`py-3.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeAccountTab === "ai-summary"
                    ? "border-brand-deep text-brand-deep"
                    : "border-transparent text-ink-dim hover:text-ink"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                AI Intelligence
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {/* Tab 1: Overview */}
              {activeAccountTab === "overview" && (
                <div className="space-y-6">
                  {/* Account Summary Notes */}
                  {selectedAccount.notes && (
                    <div className="p-4 bg-raised rounded-edge border border-line">
                      <div className="text-meta font-bold mb-1">Key Account Notes & Preferences</div>
                      <p className="text-meta text-ink-dim leading-relaxed">{selectedAccount.notes}</p>
                    </div>
                  )}

                  {/* Health Reasons */}
                  {selectedAccount.healthReasons && selectedAccount.healthReasons.length > 0 && (
                    <div className="p-4 bg-blue-50/60 rounded-edge border border-blue-100">
                      <div className="text-meta font-bold text-blue-900 mb-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        Relationship Health Diagnosis
                      </div>
                      <ul className="text-meta text-blue-800 space-y-1 list-disc list-inside">
                        {selectedAccount.healthReasons.map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Organization Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white border border-line rounded-edge space-y-2 text-meta">
                      <div className="font-bold text-body border-b border-line pb-2">Contact & Channels</div>
                      {selectedAccount.mainPhone && (
                        <div className="flex items-center gap-2 text-ink-dim">
                          <Phone className="w-3.5 h-3.5 text-ink-faint" />
                          <span>{selectedAccount.mainPhone}</span>
                        </div>
                      )}
                      {selectedAccount.generalEmail && (
                        <div className="flex items-center gap-2 text-ink-dim">
                          <Mail className="w-3.5 h-3.5 text-ink-faint" />
                          <span>{selectedAccount.generalEmail}</span>
                        </div>
                      )}
                      {selectedAccount.website && (
                        <div className="flex items-center gap-2 text-ink-dim">
                          <Globe className="w-3.5 h-3.5 text-ink-faint" />
                          <a href={selectedAccount.website} target="_blank" rel="noreferrer" className="text-brand-deep hover:underline">
                            {selectedAccount.website}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-white border border-line rounded-edge space-y-2 text-meta">
                      <div className="font-bold text-body border-b border-line pb-2">Addresses & Depots</div>
                      {selectedAccount.billingAddress ? (
                        <div className="text-ink-dim flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-ink-faint mt-0.5 shrink-0" />
                          <div>
                            <span className="font-medium text-body">Billing:</span> {selectedAccount.billingAddress.street}, {selectedAccount.billingAddress.city} {selectedAccount.billingAddress.state} {selectedAccount.billingAddress.postcode}
                          </div>
                        </div>
                      ) : (
                        <div className="text-ink-faint italic">No formal billing address specified.</div>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <div className="text-meta font-bold mb-2">Account Tags & Classifications</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAccount.tags.map((tag, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-paper border border-line rounded-edge text-meta font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Contacts */}
              {activeAccountTab === "contacts" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-meta font-bold uppercase tracking-wider text-ink-dim">
                        Buying Committee & Stakeholders
                      </h3>
                      <p className="text-spec text-ink-faint mt-0.5">
                        Key council engineers, procurement contacts, and specifiers at {selectedAccount.name}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setContactToEdit(null);
                        setIsContactModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-meta font-semibold text-white bg-brand-deep hover:bg-brand-deep rounded-edge shadow-sm transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Contact
                    </button>
                  </div>

                  {accountContacts.length === 0 ? (
                    <div className="p-8 text-center bg-raised rounded-panel border border-dashed border-line space-y-3">
                      <Users className="w-8 h-8 text-ink-faint mx-auto" />
                      <div>
                        <div className="text-meta font-bold">No Stakeholders Listed</div>
                        <div className="text-spec text-ink-dim">
                          Add the primary engineer, lighting asset officer, or procurement contact for this account.
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setContactToEdit(null);
                          setIsContactModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-meta font-semibold text-brand-deep bg-brand-wash hover:bg-brand-wash border border-brand-edge rounded-edge transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add First Contact
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {accountContacts.map((contact) => (
                        <div key={contact.id} className="p-4 bg-white border border-line rounded-panel shadow-xs space-y-3 hover:border-line-strong transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-body">
                                  {contact.firstName} {contact.lastName}
                                </span>
                                {contact.isDecisionMaker && (
                                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 rounded-full text-spec font-bold flex items-center gap-1">
                                    <UserCheck className="w-2.5 h-2.5" /> Decision Maker
                                  </span>
                                )}
                              </div>
                              <div className="text-meta text-ink-dim font-medium">{contact.jobTitle}</div>
                              {contact.department && <div className="text-spec text-ink-faint">{contact.department}</div>}
                            </div>
                            
                            <button
                              onClick={() => {
                                setContactToEdit(contact);
                                setIsContactModalOpen(true);
                              }}
                              className="p-1.5 text-ink-faint hover:text-ink hover:bg-paper rounded-edge transition-colors flex items-center gap-1 text-spec font-semibold border border-line bg-raised cursor-pointer"
                              title="Edit Contact"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-ink-dim" />
                              <span>Edit</span>
                            </button>
                          </div>

                          <div className="space-y-1.5 text-meta text-ink-dim pt-2 border-t border-line">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 truncate">
                                <Mail className="w-3.5 h-3.5 text-ink-faint shrink-0" />
                                <a href={`mailto:${contact.email}`} className="text-brand-deep hover:underline truncate">{contact.email}</a>
                              </div>
                              <span className="text-spec px-1.5 py-0.5 bg-paper text-ink-dim rounded">
                                {contact.preferredContactMethod || "Email"}
                              </span>
                            </div>

                            {contact.mobile && (
                              <div className="flex items-center gap-2">
                                <Smartphone className="w-3.5 h-3.5 text-ink-faint shrink-0" />
                                <span>{contact.mobile}</span>
                              </div>
                            )}

                            {contact.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5 text-ink-faint shrink-0" />
                                <span>{contact.phone}</span>
                              </div>
                            )}
                          </div>

                          {contact.notes && (
                            <div className="p-2 bg-raised rounded-edge border border-line text-spec text-ink-dim line-clamp-2">
                              {contact.notes}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-spec pt-2 border-t border-line text-ink-dim">
                            <span>Role: <strong className="text-body">{contact.roleInBuyingProcess}</strong></span>
                            <div className="flex items-center gap-2">
                              <span>Influence: <strong className="text-body">{contact.influenceLevel}</strong></span>
                              <span className={`px-1.5 py-0.5 rounded text-spec font-semibold ${
                                contact.relationshipStatus === "Strong"
                                  ? "bg-brand-wash text-brand-deep"
                                  : contact.relationshipStatus === "Warm"
                                  ? "bg-blue-100 text-blue-800"
                                  : contact.relationshipStatus === "Cold"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-paper text-body"
                              }`}>
                                {contact.relationshipStatus}
                              </span>
                            </div>
                          </div>

                          {contact.tags && contact.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {contact.tags.map((t, idx) => (
                                <span key={idx} className="text-spec px-2 py-0.5 bg-paper text-ink-dim rounded-edge">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Opportunities */}
              {activeAccountTab === "deals" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-meta font-bold uppercase tracking-wider text-ink-dim">
                      Active & Historical Opportunities
                    </h3>
                    <button
                      onClick={() => navigateToCRM("pipeline")}
                      className="text-meta font-semibold text-brand-deep hover:text-brand-deep flex items-center gap-1"
                    >
                      + Create Opportunity
                    </button>
                  </div>

                  <div className="divide-y divide-line border border-line rounded-panel overflow-hidden">
                    {accountDeals.length === 0 ? (
                      <div className="p-8 text-center text-meta text-ink-dim">
                        No opportunities linked to this account yet.
                      </div>
                    ) : (
                      accountDeals.map((deal) => (
                        <div
                          key={deal.id}
                          onClick={() => navigateToCRM("pipeline", deal.id)}
                          className="p-4 hover:bg-raised cursor-pointer transition-colors flex items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-meta font-bold px-2 py-0.5 rounded-full bg-paper">
                                {deal.stageName}
                              </span>
                              <span className="text-meta text-ink-faint">·</span>
                              <span className="text-meta text-ink-dim">{deal.projectApplication}</span>
                            </div>
                            <div className="text-body font-semibold">{deal.name}</div>
                            <div className="text-meta text-ink-dim">Next: {deal.nextAction || "None"}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-body font-bold">${deal.dealValue.toLocaleString()}</div>
                            <div className="text-meta text-ink-dim">{deal.probability}% probability</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Activity Timeline */}
              {activeAccountTab === "timeline" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-meta font-bold uppercase tracking-wider text-ink-dim">
                      Interaction History
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openQuickLog("call", selectedAccount.id)}
                        className="text-meta font-semibold hover:text-ink"
                      >
                        + Call
                      </button>
                      <button
                        onClick={() => openQuickLog("note", selectedAccount.id)}
                        className="text-meta font-semibold hover:text-ink"
                      >
                        + Note
                      </button>
                    </div>
                  </div>

                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-line">
                    {accountActivities.length === 0 ? (
                      <div className="text-meta text-ink-dim py-4">No activities logged for this account yet.</div>
                    ) : (
                      accountActivities.map((act) => (
                        <div key={act.id} className="relative space-y-1">
                          <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-brand-deep ring-4 ring-white" />
                          <div className="flex items-center justify-between text-meta">
                            <span className="font-bold text-body">{act.title}</span>
                            <span className="text-ink-faint text-spec">
                              {new Date(act.timestamp).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </div>
                          <p className="text-meta text-ink-dim">{act.description}</p>
                          <div className="text-spec text-ink-faint">Logged by {act.performedBy}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab 5: AI Intelligence */}
              {activeAccountTab === "ai-summary" && (
                <div className="space-y-4">
                  <div className="p-5 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 rounded-panel border border-indigo-100 space-y-4">
                    <div className="flex items-center gap-2 text-indigo-900 font-bold text-body">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Account Intelligence & Executive Summary
                    </div>

                    <p className="text-meta leading-relaxed">
                      {selectedAccount.aiSummary?.summary ||
                        `${selectedAccount.name} is an active ${selectedAccount.customerSegment.toLowerCase()} account with active lighting proposals in progress.`}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-meta pt-2">
                      <div className="p-3.5 bg-white rounded-edge border border-indigo-100/80 shadow-xs space-y-1">
                        <div className="font-bold text-body">Current Priority</div>
                        <p className="text-ink-dim">{selectedAccount.aiSummary?.currentPriority || "Follow up on active quotations and technical Dialux submissions."}</p>
                      </div>

                      <div className="p-3.5 bg-white rounded-edge border border-indigo-100/80 shadow-xs space-y-1">
                        <div className="font-bold text-brand-deep">Recommended Next Move</div>
                        <p className="text-brand-deep font-medium">
                          {selectedAccount.aiSummary?.recommendedAction || "Schedule a 15-minute engineering check-in with the primary specifier."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Account Modal */}
      {isNewAccountModalOpen && (
        <div className="fixed inset-0 bg-chrome/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-lg font-bold text-body">Create New Account</h3>
              <button
                onClick={() => setIsNewAccountModalOpen(false)}
                className="text-ink-faint hover:text-ink-dim text-body"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3.5 text-meta">
              <div>
                <label className="block font-semibold text-body mb-1">Company / Organization Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. City of Parramatta Council"
                  value={newAccountForm.name}
                  onChange={(e) => setNewAccountForm({ ...newAccountForm, name: e.target.value })}
                  className="w-full p-2 border border-line-strong rounded-edge"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-body mb-1">Customer Segment</label>
                  <select
                    value={newAccountForm.customerSegment}
                    onChange={(e) => setNewAccountForm({ ...newAccountForm, customerSegment: e.target.value as any })}
                    className="w-full p-2 border border-line-strong rounded-edge"
                  >
                    <option value="Local Government / Council">Local Government / Council</option>
                    <option value="Civil Contractor">Civil Contractor</option>
                    <option value="Electrical Contractor">Electrical Contractor</option>
                    <option value="Commercial Developer">Commercial Developer</option>
                    <option value="Mining & Resources">Mining & Resources</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-body mb-1">Territory</label>
                  <select
                    value={newAccountForm.territory}
                    onChange={(e) => setNewAccountForm({ ...newAccountForm, territory: e.target.value as any })}
                    className="w-full p-2 border border-line-strong rounded-edge"
                  >
                    <option value="QLD/NT">QLD/NT</option>
                    <option value="NSW/ACT">NSW/ACT</option>
                    <option value="VIC/TAS">VIC/TAS</option>
                    <option value="WA">WA</option>
                    <option value="SA">SA</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-body mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="(02) 9000 0000"
                    value={newAccountForm.mainPhone}
                    onChange={(e) => setNewAccountForm({ ...newAccountForm, mainPhone: e.target.value })}
                    className="w-full p-2 border border-line-strong rounded-edge"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-body mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="info@council.gov.au"
                    value={newAccountForm.generalEmail}
                    onChange={(e) => setNewAccountForm({ ...newAccountForm, generalEmail: e.target.value })}
                    className="w-full p-2 border border-line-strong rounded-edge"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-body mb-1">Account Notes & Spec Requirements</label>
                <textarea
                  rows={3}
                  placeholder="Key standards, wildlife CCT preferences, etc."
                  value={newAccountForm.notes}
                  onChange={(e) => setNewAccountForm({ ...newAccountForm, notes: e.target.value })}
                  className="w-full p-2 border border-line-strong rounded-edge"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsNewAccountModalOpen(false)}
                  className="px-4 py-2 text-ink-dim hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-brand-deep rounded-edge hover:bg-brand-deep"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CRM Contact Modal (Add & Edit) */}
      {selectedAccount && (
        <CRMContactModal
          isOpen={isContactModalOpen}
          onClose={() => {
            setIsContactModalOpen(false);
            setContactToEdit(null);
          }}
          onSave={(contactData, existingId) => {
            if (existingId) {
              updateContact(existingId, contactData);
            } else {
              addContact({
                ...contactData,
                id: `con-${Date.now()}`
              });
            }
          }}
          onDelete={(contactId) => {
            deleteContact(contactId);
          }}
          contactToEdit={contactToEdit}
          accountId={selectedAccount.id}
          accountName={selectedAccount.name}
          accountWebsite={selectedAccount.website}
          accountOwner={selectedAccount.accountOwner}
        />
      )}
    </div>
  );
};
