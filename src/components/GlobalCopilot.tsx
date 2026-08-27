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

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-panel shadow-2xl border border-line flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
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
            <span
              className="text-spec text-ink-faint block truncate max-w-[200px]"
              title={
                copilotCustomContext ||
                (currentDeal ? `${currentDeal.name} (${currentDeal.accountName})` : currentAccount ? currentAccount.name : "No customer context")
              }
            >
              Context: {copilotCustomContext || (currentDeal ? currentDeal.name : currentAccount ? currentAccount.name : activeTab === "product-finder" ? "Product Selection Wizard" : "General Guidance")}
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsCopilotOpen(false)}
          className="text-ink-faint hover:text-white p-1 rounded transition-colors cursor-pointer"
          title="Close Copilot (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
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

      {/* Quick Prompts */}
      <div className="px-3 py-1.5 bg-paper border-t border-line flex gap-1.5 overflow-x-auto text-spec">
        <button
          onClick={() => handleSend("What is the active quote reference, contact person and deal value for this project?")}
          className="whitespace-nowrap bg-white px-2 py-0.5 rounded border border-line text-body hover:text-brand-deep cursor-pointer"
        >
          Quote Details?
        </button>
        <button
          onClick={() => handleSend("What are the key technical questions before we finalize this luminaire quote?")}
          className="whitespace-nowrap bg-white px-2 py-0.5 rounded border border-line text-body hover:text-brand-deep cursor-pointer"
        >
          Key Questions?
        </button>
        <button
          onClick={() => handleSend("Explain AS/NZS 1158 Cat P pathway compliance criteria.")}
          className="whitespace-nowrap bg-white px-2 py-0.5 rounded border border-line text-body hover:text-brand-deep cursor-pointer"
        >
          Cat P?
        </button>
      </div>

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
