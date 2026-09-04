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
        "I'm your Plasgain Sales Assistant. Ask me about quotes, deal pipeline, customer accounts, or sales strategy."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = messagesScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  const [copilotState, setCopilotState] = useState<"ready" | "working" | "offline" | "failed">("ready");
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);

  // Derive Context
  const currentAccount = accounts.find((a) => a.id === selectedAccountId);
  const currentDeal = crmOpportunities.find((d) => d.id === selectedCrmOpportunityId);

  const handleOpenCitation = (cit: CopilotCitation) => {
    if (cit.sourceType === "standard") {
      showToast(`Standards Citation: ${cit.title} ${cit.clause || ""}`, "info");
    } else {
      showToast(`Referenced source: ${cit.title}`, "info");
    }
  };

  const handleSend = async (userPromptText?: string) => {
    const promptToSend = (userPromptText || input).trim();
    if (!promptToSend || isLoading) return;

    setInput("");
    setIsLoading(true);
    setCopilotState("working");
    setLastFailedPrompt(promptToSend);

    const newMessages: CopilotMessage[] = [...messages, { role: "user", content: promptToSend }];
    setMessages(newMessages);

    try {
      let streamedAnswer = "";
      let incomingCitations: CopilotCitation[] = [];

      await apiStreamPost(
        "/api/copilot/chat",
        {
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          context: {
            activeTab,
            activeCRMTab,
            accountId: currentAccount?.id,
            accountName: currentAccount?.name,
            dealId: currentDeal?.id,
            dealName: currentDeal?.name,
            customContext: copilotCustomContext
          }
        },
        {
          onChunk: (delta: string) => {
            streamedAnswer += delta;
            setMessages([
              ...newMessages,
              { role: "assistant", content: streamedAnswer, citations: incomingCitations }
            ]);
          },
          onComplete: (data: any) => {
            if (data?.citations) {
              incomingCitations = data.citations;
              setMessages([
                ...newMessages,
                { role: "assistant", content: streamedAnswer || data.content || data.reply || "", citations: incomingCitations }
              ]);
            }
          }
        }
      );

      setCopilotState("ready");
      setLastFailedPrompt(null);
    } catch (err: any) {
      setCopilotState("failed");
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Sorry, I encountered an issue connecting to the knowledge service. You can retry your question below.",
          isError: true,
          failedPrompt: promptToSend
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isCopilotOpen) return null;

  return (
    <>
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white border-l border-line shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-3.5 bg-paper border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-wash text-brand-deep rounded">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-body text-sm">Plasgain Sales Assistant</h3>
              <span className="text-[11px] text-ink-dim font-mono">
                {currentDeal ? `Context: ${currentDeal.name}` : currentAccount ? `Context: ${currentAccount.name}` : "General Workspace Context"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCopilotOpen(false)}
            className="p-1.5 text-ink-dim hover:text-body rounded hover:bg-raised transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Stream */}
        <div ref={messagesScrollRef} className="flex-1 p-4 overflow-y-auto space-y-3.5 text-spec">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[90%] p-3 rounded-panel ${
                  m.role === "user"
                    ? "bg-brand-deep text-white rounded-br-none"
                    : m.isError
                    ? "bg-red-50 border border-red-200 text-red-900 rounded-bl-none"
                    : "bg-paper border border-line text-body rounded-bl-none"
                }`}
              >
                <MarkdownText text={m.content} />

                {m.isError && (
                  <div className="mt-2 pt-2 border-t border-red-200 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSend(m.failedPrompt || lastFailedPrompt || "")}
                      className="px-2 py-1 bg-red-700 hover:bg-red-800 text-white rounded text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  </div>
                )}

                {/* Citations */}
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-line/60 space-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-ink-dim uppercase tracking-wider">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Verified Sources</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {m.citations.map((cit, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => handleOpenCitation(cit)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium bg-white hover:bg-brand-wash text-brand-deep border border-line px-2 py-0.5 rounded cursor-pointer transition-colors shadow-2xs"
                        >
                          <FileText className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[170px]">{cit.title}</span>
                          {cit.page && <span>p. {cit.page}</span>}
                          <ExternalLink className="w-2 h-2 opacity-60" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-ink-dim text-xs py-1">
              <div className="w-3.5 h-3.5 border-2 border-brand-deep border-t-transparent rounded-full animate-spin"></div>
              <span>Generating response...</span>
            </div>
          )}
        </div>

        {/* Dynamic Contextual Quick Prompt Chips (hidden once conversation begins) */}
        {messages.length <= 1 && (() => {
          let chips: Array<{ label: string; prompt: string }> = [];

          if (currentDeal) {
            chips = [
              {
                label: "Dark-Sky Clause",
                prompt: `Draft a 3000K fauna-friendly / dark-sky compliance clause for deal "${currentDeal.name}" to satisfy council tender specifications.`
              },
              {
                label: "Follow-Up Strategy",
                prompt: `Draft a tailored follow-up strategy and email for deal "${currentDeal.name}".`
              },
              {
                label: "Objection Handling",
                prompt: `Suggest objection handling points for pricing and lead times for deal "${currentDeal.name}".`
              }
            ];
          } else if (currentAccount) {
            chips = [
              {
                label: "Account Summary",
                prompt: `Summarize buying history, open tenders, and key relationship contacts for account "${currentAccount.name}".`
              },
              {
                label: "Executive Follow-up",
                prompt: `Draft a consultative follow-up email to the primary decision-makers at "${currentAccount.name}".`
              },
              {
                label: "Competitor Intel",
                prompt: `List all recorded competitor pricing and alternative specs quoted against "${currentAccount.name}".`
              }
            ];
          } else {
            chips = [
              {
                label: "Active Quote Status",
                prompt: "What is the active quote reference, contact person, and deal value for our most urgent deals?"
              },
              {
                label: "Sales Call Prep",
                prompt: "Help me prepare for an upcoming sales call with an electrical contractor or council engineer."
              },
              {
                label: "Pipeline Review",
                prompt: "Summarize overdue tasks and high-value quotes in our pipeline needing attention."
              }
            ];
          }

          return (
            <div className="px-3 py-2 bg-paper border-t border-line flex flex-col gap-1 text-spec">
              <span className="text-[10px] font-bold text-ink-dim uppercase">Suggested Prompts</span>
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                {chips.map((chip, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSend(chip.prompt)}
                    className="whitespace-nowrap bg-white px-2.5 py-1 rounded-edge border border-line text-body hover:text-brand-deep hover:border-brand-deep font-medium text-xs transition-colors cursor-pointer shadow-2xs shrink-0"
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
          className="p-3 bg-white border-t border-line flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Copilot anything..."
            className="flex-1 text-spec px-3 py-2 rounded-edge border border-line focus:outline-none focus:border-brand-deep bg-raised"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-brand-deep hover:bg-brand disabled:bg-line text-white p-2 rounded-edge transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </>
  );
};
