import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  X,
  Copy,
  Lightbulb,
  ShieldCheck,
  RotateCcw,
  FileText,
  BookOpen,
  ExternalLink
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { apiStreamPost, apiGet } from "../utils/apiClient";
import { PDFViewerModal } from "./PDFViewerModal";
import { ControlledDocument } from "../server/documentGovernanceStore";

export interface CopilotCitation {
  sourceId: string;
  sourceType: "document" | "standard" | "product" | "project" | "crm";
  title: string;
  version?: string;
  page?: number;
  clause?: string;
  documentId?: string;
  excerpt?: string;
  fileUrl?: string;
}

export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
  citations?: CopilotCitation[];
  isError?: boolean;
  failedPrompt?: string;
}

/**
 * Renders the light markdown the model actually emits.
 *
 * Answers were previously dropped into a plain <div>, so a rep read
 * "**enLighten Zorro 2:**" with the asterisks intact. This handles bold, italic,
 * inline code and bullet/numbered lists — deliberately without
 * dangerouslySetInnerHTML, so model output can never inject markup.
 */
const renderInline = (text: string): React.ReactNode[] =>
  text
    .split(/(\*\*[^*]+\*\*|`[^`]+`|(?<![*\w])\*[^*\n]+\*(?!\w))/g)
    .filter((part) => part !== undefined && part !== "")
    .map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={i} className="font-mono text-[0.9em] bg-paper border border-line rounded px-1 py-0.5">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={i}>{part.slice(1, -1)}</em>;
      }
      return <React.Fragment key={i}>{part}</React.Fragment>;
    });

const MarkdownText: React.FC<{ text: string }> = ({ text }) => {
  const lines = (text || "").split("\n");
  const blocks: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let listOrdered = false;

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    const items = listBuffer.map((li, i) => <li key={i}>{renderInline(li)}</li>);
    blocks.push(
      listOrdered ? (
        <ol key={key} className="list-decimal pl-5 space-y-0.5 my-1">{items}</ol>
      ) : (
        <ul key={key} className="list-disc pl-5 space-y-0.5 my-1">{items}</ul>
      )
    );
    listBuffer = [];
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const heading = line.match(/^\s*#{1,6}\s+(.*)$/);

    if (bullet) {
      if (listOrdered) flushList(`l-${idx}`);
      listOrdered = false;
      listBuffer.push(bullet[1]);
      return;
    }
    if (numbered) {
      if (!listOrdered) flushList(`l-${idx}`);
      listOrdered = true;
      listBuffer.push(numbered[1]);
      return;
    }

    flushList(`l-${idx}`);

    if (heading) {
      blocks.push(<div key={idx} className="font-bold mt-2 first:mt-0">{renderInline(heading[1])}</div>);
      return;
    }
    if (line.trim() === "") {
      blocks.push(<div key={idx} className="h-1.5" />);
      return;
    }
    blocks.push(<p key={idx} className="my-0.5">{renderInline(line)}</p>);
  });

  flushList("l-end");
  return <div className="space-y-0">{blocks}</div>;
};

export const GlobalCopilot: React.FC = () => {
  const {
    isCopilotOpen,
    setIsCopilotOpen,
    activeTab,
    setActiveTab,
    navigateToWorkflow,
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

  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      role: "assistant",
      content:
        "G'day! I'm your Plasgain Technical Sales Copilot. I'm connected to your CRM deals, account records, product catalogues, and Australian Standards. Ask me about active quotes, lead times, compliance clauses, spigot fittings, or competitor pricing."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Follow the conversation. Without this the panel stayed pinned at the top,
  // so a streamed answer looked like it never arrived.
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = messagesScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);
  const [copilotState, setCopilotState] = useState<"ready" | "working" | "offline" | "failed">("ready");
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [citationPage, setCitationPage] = useState(1);
  const [viewingDoc, setViewingDoc] = useState<ControlledDocument | null>(null);

  // Active abort controller for stream cancellation (P2-01)
  const streamAbortControllerRef = useRef<AbortController | null>(null);

  // Listen for Escape key to close Copilot drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCopilotOpen) {
        setIsCopilotOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCopilotOpen, setIsCopilotOpen]);

  // Cancel in-flight ephemeral copilot stream when closed
  useEffect(() => {
    if (!isCopilotOpen && streamAbortControllerRef.current) {
      streamAbortControllerRef.current.abort();
      streamAbortControllerRef.current = null;
      setIsLoading(false);
    }
  }, [isCopilotOpen]);

  if (!isCopilotOpen) return null;

  const currentDeal = crmOpportunities.find((d) => d.id === selectedCrmOpportunityId);
  const currentAccount = accounts.find((a) => a.id === (currentDeal?.accountId || selectedAccountId));
  const accountContacts = contacts.filter((c) => c.accountId === currentAccount?.id);
  const dealCompetitors = competitorPricingRecords.filter(
    (cp) => cp.accountId === currentAccount?.id || cp.opportunityId === currentDeal?.id
  );

  // Construct rich CRM intelligence context for the AI engine
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

    // Abort previous in-flight request if user sends replacement prompt
    if (streamAbortControllerRef.current) {
      streamAbortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    streamAbortControllerRef.current = abortController;

    const userMsg: CopilotMessage = { role: "user", content: textToSend };
    const updatedMessages = [...messages, userMsg];

    // Placeholder assistant message for live streaming (P2-01)
    const assistantIndex = updatedMessages.length;
    const initialAssistantMsg: CopilotMessage = { role: "assistant", content: "" };
    setMessages([...updatedMessages, initialAssistantMsg]);
    setInput("");
    setIsLoading(true);
    setCopilotState("working");

    try {
      let streamedText = "";
      const result = await apiStreamPost<{ reply: string; citations?: CopilotCitation[] }>(
        "/api/copilot/chat-stream",
        {
          message: textToSend,
          activeScreen: activeTab,
          activeContextData: {
            crmContext: buildCrmContext(),
            dealId: currentDeal?.id,
            accountId: currentAccount?.id
          },
          chatHistory: updatedMessages.map((m) => ({ role: m.role, content: m.content }))
        },
        {
          signal: abortController.signal,
          onChunk: (delta) => {
            streamedText += delta;
            setMessages((prev) => {
              const copy = [...prev];
              if (copy[assistantIndex]) {
                copy[assistantIndex] = {
                  ...copy[assistantIndex],
                  content: streamedText
                };
              }
              return copy;
            });
          },
          onComplete: (completedData) => {
            setCopilotState("ready");
            setLastFailedPrompt(null);
            setMessages((prev) => {
              const copy = [...prev];
              if (copy[assistantIndex]) {
                copy[assistantIndex] = {
                  role: "assistant",
                  content: completedData?.reply || streamedText || "Here is the guidance based on approved Plasgain knowledge.",
                  citations: completedData?.citations || []
                };
              }
              return copy;
            });
          }
        }
      );

      // Final fallback sync
      if (result?.citations) {
        setMessages((prev) => {
          const copy = [...prev];
          if (copy[assistantIndex]) {
            copy[assistantIndex].citations = result.citations;
          }
          return copy;
        });
      }
      setCopilotState("ready");
      setLastFailedPrompt(null);
    } catch (err: any) {
      if (err?.name === "AbortError" || abortController.signal.aborted) {
        // Safe cancellation
        setCopilotState("ready");
        return;
      }
      console.error(err);
      setCopilotState("failed");
      setLastFailedPrompt(textToSend);
      showToast(err?.message || "Copilot communication error", "error");
      setMessages((prev) => {
        const copy = [...prev];
        if (copy[assistantIndex]) {
          copy[assistantIndex] = {
            role: "assistant",
            content: "I ran into a connection issue while generating the answer.",
            isError: true,
            failedPrompt: textToSend
          };
        }
        return copy;
      });
    } finally {
      setIsLoading(false);
      streamAbortControllerRef.current = null;
    }
  };

  const handleOpenCitation = async (citation: CopilotCitation) => {
    if (citation.sourceType === "document" && citation.documentId) {
      try {
        const record = await apiGet<import("../types/knowledge").KnowledgeRecord>(`/api/knowledge/documents/${citation.documentId}`);
        setCitationPage(citation.page || 1);
        setViewingDoc(record.document);
      } catch (error: any) { showToast(error.message || "Could not open source PDF", "error"); }
    } else if (citation.sourceType === "standard") {
      navigateToWorkflow("tools", "conflict-resolver");
    } else {
      showToast("This citation has no stored PDF. Check the named source directly.", "info");
    }
  };

  const activeContextName =
    copilotCustomContext ||
    (currentDeal
      ? `${currentDeal.name} (${currentDeal.accountName})`
      : currentAccount
      ? currentAccount.name
      : "General Assistant (No Deal Attached)");
  const hasActiveContext = Boolean(copilotCustomContext || currentDeal || currentAccount);

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Plasgain Sales Copilot"
        className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-panel shadow-2xl border border-line flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200"
      >
        {/* Copilot Header */}
        <div className="bg-[#0F172A] p-4 text-white flex items-center justify-between border-b border-chrome-line">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-edge bg-brand-deep flex items-center justify-center text-white font-bold">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-meta">Plasgain Sales Copilot</span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                    copilotState === "working"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                      : copilotState === "failed"
                      ? "bg-red-500/20 text-red-300 border-red-500/40"
                      : copilotState === "offline"
                      ? "bg-slate-500/20 text-slate-300 border-slate-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  }`}
                >
                  {copilotState === "working"
                    ? "Working"
                    : copilotState === "failed"
                    ? "Failed — Retry"
                    : copilotState === "offline"
                    ? "Offline"
                    : "Ready"}
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

        {/* Explicit Context & Pinning Bar */}
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
        <div ref={messagesScrollRef} className="p-3.5 h-80 overflow-y-auto space-y-3 text-meta bg-raised">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-edge leading-relaxed ${
                  m.role === "user"
                    ? "bg-brand-deep text-white rounded-br-xs"
                    : m.isError
                    ? "bg-red-50 text-red-900 border border-red-200 shadow-2xs rounded-bl-xs"
                    : "bg-white text-body border border-line shadow-2xs rounded-bl-xs"
                }`}
              >
                <MarkdownText text={m.content} />

                {/* Inline Retry Action on Failed Messages (P1) */}
                {m.isError && (
                  <div className="mt-2.5 pt-2 border-t border-red-200 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-red-700 font-semibold">Response interrupted</span>
                    <button
                      type="button"
                      onClick={() => handleSend(m.failedPrompt || lastFailedPrompt || "")}
                      className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white cursor-pointer transition-colors shadow-2xs"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  </div>
                )}

                {/* P2-12: Auditable Citations Pills */}
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Checked page excerpts</span>
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {m.citations.map((cit, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => handleOpenCitation(cit)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-50 hover:bg-brand/10 text-brand-deep border border-slate-200 hover:border-brand/30 px-2 py-0.5 rounded cursor-pointer transition-colors shadow-2xs"
                          title={cit.excerpt || cit.clause || `Open ${cit.title}`}
                        >
                          <FileText className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[170px]">{cit.title}</span>
                          {cit.page && <span>p. {cit.page}</span>}
                          <ExternalLink className="w-2 h-2 opacity-60" />
                        </button>
                      ))}
                    </div>
                    {m.citations.some(citation => citation.excerpt) && <details className="text-[11px] text-ink-dim"><summary className="cursor-pointer">Show supporting quotations</summary>{m.citations.filter(citation => citation.excerpt).map((citation,index) => <blockquote key={index} className="border-l-2 border-brand-edge pl-2 my-2 whitespace-pre-wrap">{citation.excerpt}<footer className="font-semibold">{citation.title} · PDF page {citation.page}</footer></blockquote>)}</details>}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-ink-dim text-meta py-1">
              <div className="w-3.5 h-3.5 border-2 border-brand-deep border-t-transparent rounded-full animate-spin"></div>
              <span>Streaming answer from Plasgain knowledge engine...</span>
            </div>
          )}
        </div>

        {/* Dynamic Contextual Quick Prompt Chips */}
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
          } else if (activeTab === "new-enquiry") {
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
                <span>Suggested Prompts</span>
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
            className="bg-brand-deep hover:bg-brand disabled:bg-line text-white p-2 rounded-edge transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* PDF Viewer for Citation Inspection */}
      {viewingDoc && (
        <PDFViewerModal
          isOpen={Boolean(viewingDoc)}
          onClose={() => setViewingDoc(null)}
          document={viewingDoc}
          initialPage={citationPage}
        />
      )}
    </>
  );
};
