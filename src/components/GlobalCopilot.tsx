import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Send,
  X,
  Bot,
  Minimize2,
  Maximize2,
  Copy,
  Lightbulb,
  ShieldCheck,
  RotateCcw
} from "lucide-react";
import { useApp } from "../context/AppContext";

export const GlobalCopilot: React.FC = () => {
  const {
    isCopilotOpen,
    setIsCopilotOpen,
    activeTab,
    activeCRMTab,
    selectedAccountId,
    selectedCrmOpportunityId,
    accounts,
    crmOpportunities,
    contacts,
    competitorPricingRecords,
    copilotCustomContext,
    isCopilotContextPinned,
    clearCopilotContext,
    togglePinCopilotContext,
    showToast
  } = useApp();

  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content:
        "G'day! I'm your Plasgain Technical Sales Copilot. I'm connected to your CRM deals, account records, product catalogues, and Australian Standards. Ask me about active quotes, lead times, compliance clauses, spigot fittings, or competitor pricing."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Listen for Escape key to close Copilot drawer (P-06)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCopilotOpen) {
        setIsCopilotOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCopilotOpen, setIsCopilotOpen]);

  if (!isCopilotOpen) return null;

  const currentDeal = crmOpportunities.find((d) => d.id === selectedCrmOpportunityId);
  const currentAccount = accounts.find((a) => a.id === (currentDeal?.accountId || selectedAccountId));
  const accountContacts = contacts.filter((c) => c.accountId === currentAccount?.id);
  const dealCompetitors = competitorPricingRecords.filter((cp) => cp.accountId === currentAccount?.id || cp.opportunityId === currentDeal?.id);

  // Construct rich CRM intelligence context for the AI engine (M-01)
  const buildCrmContext = () => {
    const contextParts: string[] = [];
    contextParts.push(`Active Screen: ${activeTab.toUpperCase()}`);
    if (activeTab === "crm") contextParts.push(`CRM Sub-Tab: ${activeCRMTab}`);

    if (currentDeal) {
      contextParts.push(
        `ACTIVE DEAL: "${currentDeal.name}" | Account: ${currentDeal.accountName} | Stage: ${currentDeal.stageName} | Deal Value: $${(currentDeal.dealValue || 0).toLocaleString()} | Probability: ${currentDeal.probability}% | Quote Ref / Number: ${currentDeal.quoteNumber || currentDeal.ostendoQuoteRef || "None"} | Expected Close: ${currentDeal.expectedCloseDate} | Primary Contact: ${currentDeal.primaryContactName} (${currentDeal.primaryContactEmail || "no email"}, ${currentDeal.primaryContactPhone || "no phone"}) | Next Action: ${currentDeal.nextAction} (Due: ${currentDeal.nextActionDate}) | Health: ${currentDeal.dealHealth} (${(currentDeal.dealHealthReasons || []).join(", ")}) | Products Quoted: ${currentDeal.products?.map((p) => `${p.quantity}x ${p.productName} (${p.productCode || "No code"})`).join(", ") || "None"}`
      );
    }

    if (currentAccount) {
      contextParts.push(
        `ACCOUNT 360°: ${currentAccount.name} | Segment: ${currentAccount.customerSegment} | Territory: ${currentAccount.territory} | Owner: ${currentAccount.accountOwner} | Health: ${currentAccount.relationshipHealth} | Open Pipeline: $${(currentAccount.metrics?.openPipelineValue || 0).toLocaleString()} | Contacts on file: ${accountContacts.map((c) => `${c.firstName} ${c.lastName} (${c.jobTitle} - ${c.email})`).join("; ") || "None"}`
      );
    }

    if (dealCompetitors.length > 0) {
      contextParts.push(
        `COMPETITOR INTEL: ${dealCompetitors.map((cp) => `${cp.competitorName} quoted ${cp.competitorProduct} at $${cp.price} (${cp.priceBasis}) on ${cp.observedDate}`).join("; ")}`
      );
    }

    if (copilotCustomContext) {
      contextParts.push(`Custom Context: ${copilotCustomContext}`);
    }

    return contextParts.join(" | ");
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg = { role: "user" as const, content: textToSend };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          screenContext: buildCrmContext(),
          history: newMessages
        })
      });

      if (!res.ok) {
        const failure = await res.json().catch(() => null);
        throw new Error(
          res.status === 503 && failure?.degraded
            ? `AI unavailable — ${failure.detail || "the copilot is offline."}`
            : failure?.error || "Copilot error"
        );
      }
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Copilot communication error", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const activeContextName =
    copilotCustomContext ||
    (currentDeal ? `${currentDeal.name} (${currentDeal.accountName})` : currentAccount ? currentAccount.name : "General Assistant (No Deal Attached)");
  const hasActiveContext = Boolean(copilotCustomContext || currentDeal || currentAccount);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Plasgain Sales Copilot"
      className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-panel shadow-2xl border border-line flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200"
    >
      {/* Copilot Header - Editorial Dark */}
      <div className="bg-[#0F172A] p-4 text-white flex items-center justify-between border-b border-chrome-line">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-edge bg-brand-deep flex items-center justify-center text-white font-bold">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-meta">Plasgain Sales Copilot</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-chrome text-brand-lift border border-brand-deep">
                LIVE
              </span>
            </div>
            <span className="text-spec text-ink-faint block truncate max-w-[200px]">
              AI Sales &amp; Standards Copilot
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCopilotOpen(false)}
          aria-label="Close Copilot"
          className="text-ink-faint hover:text-white p-1 rounded transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-lift focus-visible:outline-none"
          title="Close Copilot (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Explicit Context & Pinning Bar (P1-08) */}
      <div className="bg-paper px-3 py-2 border-b border-line flex items-center justify-between text-spec">
        <div className="flex items-center gap-1.5 truncate min-w-0">
          {isCopilotContextPinned ? (
            <span className="text-brand-deep font-bold flex items-center gap-1 shrink-0">
              📌 Pinned:
            </span>
          ) : (
            <span className="text-ink-dim font-semibold shrink-0">Using context:</span>
          )}
          <span className="font-bold text-body truncate" title={activeContextName}>
            {activeContextName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {hasActiveContext && (
            <>
              <button
                type="button"
                onClick={togglePinCopilotContext}
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-deep focus-visible:outline-none ${
                  isCopilotContextPinned
                    ? "bg-brand text-white border-brand"
                    : "bg-white text-ink-dim hover:text-body border-line"
                }`}
                title={isCopilotContextPinned ? "Unpin context" : "Pin context across screen navigation"}
              >
                {isCopilotContextPinned ? "Unpin" : "Pin"}
              </button>
              <button
                type="button"
                onClick={clearCopilotContext}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-urgent border border-urgent/30 hover:bg-urgent-wash transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-urgent focus-visible:outline-none"
                title="Clear active record context"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="p-3.5 h-80 overflow-y-auto space-y-3 text-meta bg-raised">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-edge leading-relaxed ${
                m.role === "user"
                  ? "bg-brand-deep text-white rounded-br-xs"
                  : "bg-white text-body border border-line shadow-2xs rounded-bl-xs"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-ink-dim text-meta py-1">
            <div className="w-3.5 h-3.5 border-2 border-brand-deep border-t-transparent rounded-full animate-spin"></div>
            <span>Evaluating Plasgain knowledge base &amp; CRM context...</span>
          </div>
        )}
      </div>

      {/* OPT-02: Dynamic Contextual Quick Prompt Chips */}
      {(() => {
        let chips: Array<{ label: string; prompt: string }> = [];

        if (currentDeal) {
          chips = [
            {
              label: "🌿 Dark-Sky Clause",
              prompt: `Draft a 3000K fauna-friendly / dark-sky compliance clause for deal "${currentDeal.name}" to satisfy council tender specifications.`
            },
            {
              label: "🔋 5-Day Autonomy Check",
              prompt: `Analyze battery reserve and autonomy for 5 consecutive overcast days for the products quoted in "${currentDeal.name}".`
            },
            {
              label: "💡 Value-Eng Option (-15%)",
              prompt: `Suggest value-engineering alternatives or luminaire spacing adjustments to reduce total quote cost by 15% for "${currentDeal.name}".`
            }
          ];
        } else if (currentAccount) {
          chips = [
            {
              label: "📊 Account Summary",
              prompt: `Summarize buying history, open tenders, and key relationship contacts for account "${currentAccount.name}".`
            },
            {
              label: "✉️ Executive Touchpoint",
              prompt: `Draft a consultative follow-up email to the primary decision-makers at "${currentAccount.name}".`
            },
            {
              label: "🥊 Competitor Intel",
              prompt: `List all recorded competitor pricing and alternative specs quoted against "${currentAccount.name}".`
            }
          ];
        } else if (activeTab === "enquiry") {
          chips = [
            {
              label: "🔍 Extract Pole & Wind Spec",
              prompt: "Extract the required luminaire mounting height, outreach arm length, and AS 1170.2 wind region from this enquiry."
            },
            {
              label: "⚠️ Missing Tender Info",
              prompt: "What critical technical or site specifications are missing from this enquiry before we can issue a formal quote?"
            },
            {
              label: "📜 AS 1158 Sub-Category",
              prompt: "Which AS/NZS 1158 category (P1 to P4 / PR1 to PR4) applies to this pathway or roadway installation?"
            }
          ];
        } else if (activeTab === "tools") {
          chips = [
            {
              label: "🛡️ Polymeric vs Concrete",
              prompt: "Explain the OH&S manual handling and freight advantages of Plasgain polymeric cable cover vs pre-cast concrete slabs."
            },
            {
              label: "📏 Cat P Spacing Rule",
              prompt: "What is the recommended pole spacing and luminaire wattage to achieve 0.85 lux average on a 3m wide shared path?"
            },
            {
              label: "🌪️ Cyclonic Footing Sizing",
              prompt: "What footing depth and ragbolt cage size is required for an 8m pole in Wind Region C Cyclonic?"
            }
          ];
        } else if (activeTab === "takeoff") {
          chips = [
            {
              label: "📦 High-Margin Add-ons",
              prompt: "What accessories (e.g. anti-glare louvres, bird spikes, foundation collars) should we bundle with this plan takeoff?"
            },
            {
              label: "🔧 Spigot & Outreach Check",
              prompt: "Verify standard spigot diameter (60mm vs 76mm) and mounting outreach considerations for this luminaire layout."
            }
          ];
        } else {
          chips = [
            {
              label: "📄 Active Quote Status",
              prompt: "What is the active quote reference, contact person, and deal value for our most urgent deals?"
            },
            {
              label: "📜 AS/NZS 1158 Lighting Class",
              prompt: "Explain the difference between Category P1, P2, P3, and P4 public lighting categories."
            },
            {
              label: "🚚 Standard Lead Times",
              prompt: "What are our standard manufacturing and dispatch lead times for solar luminaires and composite poles?"
            }
          ];
        }

        return (
          <div className="px-3 py-2 bg-paper border-t border-line flex flex-col gap-1 text-spec">
            <div className="flex items-center justify-between text-[11px] font-bold text-ink-dim uppercase">
              <span>Suggested Prompts ({currentDeal ? "Deal Context" : currentAccount ? "Account Context" : activeTab.toUpperCase()})</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              {chips.map((chip, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(chip.prompt)}
                  className="whitespace-nowrap bg-white px-2.5 py-1 rounded-edge border border-line-strong text-body hover:text-brand-deep hover:border-brand hover:bg-brand-wash/30 font-semibold text-[11px] transition-all cursor-pointer shadow-2xs shrink-0"
                  title={chip.prompt}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="p-2.5 bg-white border-t border-line flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Copilot anything..."
          className="flex-1 text-meta px-3 py-2 rounded-edge border border-line focus:outline-none focus:border-brand-deep bg-raised"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-brand-deep hover:bg-brand-deep disabled:bg-line text-white p-2 rounded-edge transition-colors cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
