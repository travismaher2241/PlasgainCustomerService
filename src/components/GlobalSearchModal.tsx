import React, { useState, useEffect } from "react";
import {
  Search,
  FilePlus2,
  SearchCode,
  FileText,
  KanbanSquare,
  Building2,
  User,
  Flame,
  BookOpen,
  ArrowRight,
  Sparkles,
  X,
  FileSpreadsheet,
  Phone,
  CheckCircle2,
  Calculator,
  Compass,
  Terminal,
  Settings,
  Plus
} from "lucide-react";
import { useApp } from "../context/AppContext";

export const GlobalSearchModal: React.FC = () => {
  const {
    isSearchOpen,
    setIsSearchOpen,
    products,
    crmOpportunities,
    accounts,
    contacts,
    leads,
    documents,
    glossary,
    navigateToWorkflow,
    navigateToCRM,
    setExplainingTerm,
    openQuickLog
  } = useApp();

  const [query, setQuery] = useState("");

  // Listen for Cmd+K / Ctrl+K and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen(!isSearchOpen);
      }
      if (e.key === "Escape" && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  if (!isSearchOpen) return null;

  const rawQ = query.trim();
  const isCommandMode = rawQ.startsWith(">") || rawQ.startsWith("/");
  const commandTerm = isCommandMode ? rawQ.slice(1).trim().toLowerCase() : rawQ.toLowerCase();
  const q = isCommandMode ? "" : rawQ.toLowerCase();

  // OPT-05: Action Shortcuts & Command Handler
  const availableCommands = [
    {
      id: "cmd-call",
      title: "Log Customer Call",
      subtitle: "Open the Quick Call Logger modal",
      icon: Phone,
      keywords: ["call", "phone", "log", "touchpoint"],
      action: () => openQuickLog("call")
    },
    {
      id: "cmd-task",
      title: "Create CRM Task / Follow-Up",
      subtitle: "Add a new task to your follow-up cadence",
      icon: CheckCircle2,
      keywords: ["task", "todo", "followup", "reminder"],
      action: () => openQuickLog("task")
    },
    {
      id: "cmd-deal",
      title: "Create New Pipeline Deal / Quote",
      subtitle: "Jump to Opportunities and open the deal creator",
      icon: KanbanSquare,
      keywords: ["deal", "quote", "opportunity", "pipeline", "new deal"],
      action: () => navigateToCRM("pipeline")
    },
    {
      id: "cmd-enquiry",
      title: "Analyse Customer Enquiry / Tender",
      subtitle: "AI extraction of luminaires, heights, and lux requirements",
      icon: FilePlus2,
      keywords: ["enquiry", "tender", "analyse", "rfq", "quote request"],
      action: () => navigateToWorkflow("new-enquiry")
    },
    {
      id: "cmd-product-finder",
      title: "Product Finder Wizard",
      subtitle: "Grounded product selection & AS/NZS 1158 compliance",
      icon: SearchCode,
      keywords: ["product", "finder", "luminaire", "light", "fixture"],
      action: () => navigateToWorkflow("product-finder")
    },
    {
      id: "cmd-takeoff",
      title: "Plan Take-Off Workspace",
      subtitle: "Extract lighting layout, poles, and BOM from civil PDF",
      icon: Compass,
      keywords: ["takeoff", "plan", "drawing", "pdf", "dwg"],
      action: () => navigateToWorkflow("plan-takeoff")
    },
    {
      id: "cmd-tools",
      title: "Engineering Tools & Calculators",
      subtitle: "Cable cover, AS 1158 spacing, and AS 1170.2 wind estimator",
      icon: Calculator,
      keywords: ["calc", "calculator", "spacing", "cable cover", "wind", "foundation"],
      action: () => navigateToWorkflow("tools")
    },
    {
      id: "cmd-settings",
      title: "Platform Settings & AI Configuration",
      subtitle: "Manage API keys, user profile, and system settings",
      icon: Settings,
      keywords: ["settings", "config", "api", "keys", "profile"],
      action: () => navigateToWorkflow("settings")
    }
  ];

  const matchedCommands = availableCommands.filter((cmd) => {
    if (!rawQ) return false;
    if (isCommandMode) {
      if (!commandTerm) return true;
      return (
        cmd.title.toLowerCase().includes(commandTerm) ||
        cmd.keywords.some((k) => k.includes(commandTerm))
      );
    }
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.keywords.some((k) => k === q || (q.length >= 3 && k.startsWith(q)))
    );
  });

  const filteredProducts = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.code && p.code.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.series && p.series.toLowerCase().includes(q))
      )
    : [];

  const filteredAccounts = q
    ? accounts.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.tradingName && a.tradingName.toLowerCase().includes(q)) ||
          (a.customerSegment && a.customerSegment.toLowerCase().includes(q)) ||
          (a.billingAddress?.city && a.billingAddress.city.toLowerCase().includes(q))
      )
    : [];

  const filteredContacts = q
    ? contacts.filter(
        (c) =>
          c.firstName.toLowerCase().includes(q) ||
          c.lastName.toLowerCase().includes(q) ||
          (c.firstName + " " + c.lastName).toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.accountName && c.accountName.toLowerCase().includes(q)) ||
          (c.mobile && c.mobile.includes(q))
      )
    : [];

  const filteredDeals = q
    ? crmOpportunities.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.accountName.toLowerCase().includes(q) ||
          (d.quoteNumber && d.quoteNumber.toLowerCase().includes(q)) ||
          (d.ostendoQuoteRef && d.ostendoQuoteRef.toLowerCase().includes(q)) ||
          (d.primaryContactName && d.primaryContactName.toLowerCase().includes(q))
      )
    : [];

  const filteredLeads = q
    ? leads.filter(
        (l) =>
          l.leadName.toLowerCase().includes(q) ||
          l.company.toLowerCase().includes(q) ||
          l.contactName.toLowerCase().includes(q) ||
          (l.contactEmail && l.contactEmail.toLowerCase().includes(q))
      )
    : [];

  const filteredDocs = q
    ? documents.filter((d) => d.title.toLowerCase().includes(q))
    : [];

  const filteredGlossary = q
    ? glossary.filter(
        (g) =>
          g.term.toLowerCase().includes(q) ||
          (g.shortDefinition || g.definition || "").toLowerCase().includes(q) ||
          (g.whyItMatters || g.salesRelevance || "").toLowerCase().includes(q)
      )
    : [];

  const totalResults =
    matchedCommands.length +
    filteredProducts.length +
    filteredAccounts.length +
    filteredContacts.length +
    filteredDeals.length +
    filteredLeads.length +
    filteredDocs.length +
    filteredGlossary.length;

  const handleSelect = (action: () => void) => {
    action();
    setIsSearchOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (matchedCommands.length > 0) {
        handleSelect(matchedCommands[0].action);
      } else if (filteredAccounts.length > 0) {
        handleSelect(() => navigateToCRM("accounts", filteredAccounts[0].id));
      } else if (filteredDeals.length > 0) {
        handleSelect(() => navigateToCRM("pipeline", filteredDeals[0].id));
      } else if (filteredContacts.length > 0) {
        handleSelect(() => navigateToCRM("accounts", filteredContacts[0].accountId));
      } else if (filteredProducts.length > 0) {
        handleSelect(() => navigateToWorkflow("product-finder"));
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-chrome/50 backdrop-blur-xs z-50 flex items-start justify-center pt-16 sm:pt-20 p-4">
      <div className="bg-white rounded-panel max-w-2xl w-full shadow-2xl border border-line overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input */}
        <div className="p-4 border-b border-line flex items-center gap-3 bg-white">
          {isCommandMode ? (
            <Terminal className="w-5 h-5 text-brand-deep shrink-0" />
          ) : (
            <Search className="w-5 h-5 text-ink-faint shrink-0" />
          )}
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isCommandMode
                ? "Type a command: call, deal, task, calc, takeoff, settings..."
                : "Search or type '>' for command shortcuts (e.g. >call, >deal, >takeoff)..."
            }
            className="w-full text-body focus:outline-none placeholder:text-ink-faint font-sans text-base"
          />
          <button
            onClick={() => setIsSearchOpen(false)}
            className="text-spec bg-paper hover:bg-line text-ink-dim px-2 py-1 rounded cursor-pointer font-bold"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="p-4 overflow-y-auto space-y-4 text-meta flex-1">
          {/* Quick Nav actions if query empty */}
          {!rawQ && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-spec font-bold text-ink-faint uppercase tracking-wider block">
                  Action Shortcuts:
                </span>
                <span className="text-[11px] font-mono text-brand-deep bg-brand-wash px-2 py-0.5 rounded border border-brand-edge">
                  Tip: Type &gt; for instant commands
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => handleSelect(() => openQuickLog("call"))}
                  className="flex items-center gap-2.5 p-3 rounded-edge bg-raised hover:bg-brand-wash hover:text-brand-deep text-body transition-colors text-left cursor-pointer border border-line"
                >
                  <Phone className="w-4 h-4 text-brand-deep" />
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span>Log Phone Call</span>
                      <span className="text-[10px] font-mono bg-paper px-1 rounded">&gt;call</span>
                    </div>
                    <div className="text-spec text-ink-dim">Quick log customer touchpoint</div>
                  </div>
                </button>
                <button
                  onClick={() => handleSelect(() => navigateToCRM("pipeline"))}
                  className="flex items-center gap-2.5 p-3 rounded-edge bg-raised hover:bg-brand-wash hover:text-brand-deep text-body transition-colors text-left cursor-pointer border border-line"
                >
                  <KanbanSquare className="w-4 h-4 text-brand-deep" />
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span>Create Pipeline Deal</span>
                      <span className="text-[10px] font-mono bg-paper px-1 rounded">&gt;deal</span>
                    </div>
                    <div className="text-spec text-ink-dim">Open active quote pipeline</div>
                  </div>
                </button>
                <button
                  onClick={() => handleSelect(() => navigateToWorkflow("new-enquiry"))}
                  className="flex items-center gap-2.5 p-3 rounded-edge bg-raised hover:bg-brand-wash hover:text-brand-deep text-body transition-colors text-left cursor-pointer border border-line"
                >
                  <FilePlus2 className="w-4 h-4 text-brand-deep" />
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span>Analyse Enquiry</span>
                      <span className="text-[10px] font-mono bg-paper px-1 rounded">&gt;enquiry</span>
                    </div>
                    <div className="text-spec text-ink-dim">Ingest tender notes or emails</div>
                  </div>
                </button>
                <button
                  onClick={() => handleSelect(() => navigateToWorkflow("tools"))}
                  className="flex items-center gap-2.5 p-3 rounded-edge bg-raised hover:bg-brand-wash hover:text-brand-deep text-body transition-colors text-left cursor-pointer border border-line"
                >
                  <Calculator className="w-4 h-4 text-brand-deep" />
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span>Engineering Calculators</span>
                      <span className="text-[10px] font-mono bg-paper px-1 rounded">&gt;calc</span>
                    </div>
                    <div className="text-spec text-ink-dim">Spacing &amp; Wind estimator</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* OPT-05: Matched Commands & Actions */}
          {matchedCommands.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-spec font-bold text-brand-deep uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" /> Action Commands ({matchedCommands.length})
              </span>
              <div className="space-y-1">
                {matchedCommands.map((cmd) => {
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => handleSelect(cmd.action)}
                      className="w-full flex items-center justify-between p-2.5 rounded-edge bg-brand-wash/40 hover:bg-brand-wash text-left transition-colors cursor-pointer border border-brand-edge/60 group"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="p-1.5 bg-brand-deep text-white rounded">
                          <Icon className="w-4 h-4" />
                        </span>
                        <div>
                          <div className="font-bold text-body group-hover:text-brand-deep">
                            {cmd.title}
                          </div>
                          <div className="text-spec text-ink-dim">{cmd.subtitle}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-brand-deep bg-white px-2 py-0.5 rounded border border-brand-edge">
                        Press Enter ↵
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {rawQ && totalResults === 0 && (
            <div className="p-8 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-paper flex items-center justify-center mx-auto text-ink-faint">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-body">No matching records or commands</h3>
              <p className="text-meta text-ink-dim max-w-sm mx-auto">
                No accounts, contacts, deals, quotes, or commands matched "{query}".
              </p>
            </div>
          )}

          {/* CRM Accounts */}
          {filteredAccounts.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-spec font-bold text-brand-deep uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Accounts ({filteredAccounts.length})
              </span>
              <div className="space-y-1">
                {filteredAccounts.slice(0, 3).map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => handleSelect(() => navigateToCRM("accounts", acc.id))}
                    className="w-full flex items-center justify-between p-2 rounded-edge hover:bg-brand-wash/30 text-left transition-colors cursor-pointer border border-line/60"
                  >
                    <div>
                      <span className="font-bold text-body">{acc.name}</span>
                      <span className="text-ink-dim ml-2 text-spec">({acc.customerSegment} · {acc.territory})</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-ink-faint" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CRM Deals & Opportunities */}
          {filteredDeals.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-spec font-bold text-brand-deep uppercase tracking-wider flex items-center gap-1.5">
                <KanbanSquare className="w-3.5 h-3.5" /> Deals &amp; Quotations ({filteredDeals.length})
              </span>
              <div className="space-y-1">
                {filteredDeals.slice(0, 4).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => handleSelect(() => navigateToCRM("pipeline", d.id))}
                    className="w-full flex items-center justify-between p-2 rounded-edge hover:bg-brand-wash/30 text-left transition-colors cursor-pointer border border-line/60"
                  >
                    <div>
                      <div className="font-bold text-body">{d.name}</div>
                      <div className="text-spec text-ink-dim">
                        {d.accountName} {d.quoteNumber ? "· Quote: " + d.quoteNumber : ""} {d.ostendoQuoteRef ? "· Ostendo Ref: " + d.ostendoQuoteRef : ""}
                      </div>
                    </div>
                    <span className="text-spec font-bold bg-brand-wash text-brand-deep px-2 py-0.5 rounded">
                      {"$" + (d.dealValue || 0).toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CRM Contacts */}
          {filteredContacts.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-spec font-bold text-brand-deep uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Contacts ({filteredContacts.length})
              </span>
              <div className="space-y-1">
                {filteredContacts.slice(0, 3).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelect(() => navigateToCRM("accounts", c.accountId))}
                    className="w-full flex items-center justify-between p-2 rounded-edge hover:bg-brand-wash/30 text-left transition-colors cursor-pointer border border-line/60"
                  >
                    <div>
                      <span className="font-bold text-body">{c.firstName} {c.lastName}</span>
                      <span className="text-ink-dim ml-2 text-spec">({c.jobTitle} · {c.accountName})</span>
                    </div>
                    <span className="text-spec text-brand-deep font-medium">{c.email}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CRM Leads */}
          {filteredLeads.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-spec font-bold text-brand-deep uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-soon" /> Leads ({filteredLeads.length})
              </span>
              <div className="space-y-1">
                {filteredLeads.slice(0, 3).map((l) => (
                  <button
                    key={l.id}
                    onClick={() => handleSelect(() => navigateToCRM("leads"))}
                    className="w-full flex items-center justify-between p-2 rounded-edge hover:bg-brand-wash/30 text-left transition-colors cursor-pointer border border-line/60"
                  >
                    <div>
                      <span className="font-bold text-body">{l.leadName}</span>
                      <span className="text-ink-dim ml-2 text-spec">({l.company})</span>
                    </div>
                    <span className="text-spec font-bold bg-line px-2 py-0.5 rounded">
                      Score: {l.leadScore}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Products */}
          {filteredProducts.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-spec font-bold text-ink-faint uppercase tracking-wider block">
                Plasgain Products ({filteredProducts.length})
              </span>
              <div className="space-y-1">
                {filteredProducts.slice(0, 3).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelect(() => navigateToWorkflow("product-finder"))}
                    className="w-full flex items-center justify-between p-2 rounded-edge hover:bg-raised text-left transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-body">{p.name}</span>
                      <span className="text-ink-dim ml-2">({p.code || p.category})</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-ink-faint" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Glossary Terms */}
          {filteredGlossary.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-spec font-bold text-ink-faint uppercase tracking-wider block">
                Lighting Glossary &amp; Standards ({filteredGlossary.length})
              </span>
              <div className="space-y-1">
                {filteredGlossary.slice(0, 3).map((g) => (
                  <button
                    key={g.term}
                    onClick={() => handleSelect(() => setExplainingTerm(g.term))}
                    className="w-full flex items-center justify-between p-2 rounded-edge hover:bg-raised text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-brand-deep" />
                      <span className="font-semibold text-body">{g.term}</span>
                    </div>
                    <span className="text-ink-faint text-spec">Explain &rarr;</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-raised border-t border-line text-spec text-ink-faint flex items-center justify-between">
          <span>Type <strong>&gt;</strong> for commands (e.g. <code>&gt;call</code>, <code>&gt;deal</code>, <code>&gt;calc</code>)</span>
          <span>Plasgain Copilot Search · ⌘K</span>
        </div>
      </div>
    </div>
  );
};
