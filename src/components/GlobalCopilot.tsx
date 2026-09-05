import React, { useState, useEffect, useRef, useMemo } from "react";
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
  ExternalLink,
  Mail,
  Calendar,
  Phone,
  CheckSquare,
  TrendingUp,
  UserPlus,
  Check,
  ArrowRight
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { apiStreamPost, apiGet } from "../utils/apiClient";
import { CRMActionPayload, CopilotActionProposal, NextBestActionItem, CRMOpportunity, Account } from "../types/crm";
import { executeCRMAction, ActionDispatchContext } from "../utils/copilotActionDispatcher";

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
  actions?: CopilotActionProposal[];
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

export const renderActionIcon = (type?: string) => {
  switch (type) {
    case "send_email":
      return <Mail className="w-3.5 h-3.5" />;
    case "schedule_meeting":
      return <Calendar className="w-3.5 h-3.5" />;
    case "log_call":
      return <Phone className="w-3.5 h-3.5" />;
    case "create_task":
      return <CheckSquare className="w-3.5 h-3.5" />;
    case "update_stage":
      return <TrendingUp className="w-3.5 h-3.5" />;
    case "assign_contact":
      return <UserPlus className="w-3.5 h-3.5" />;
    default:
      return <ArrowRight className="w-3.5 h-3.5" />;
  }
};

export function deriveActionsFromContext(
  content: string,
  deal?: CRMOpportunity,
  account?: Account,
  nbas?: NextBestActionItem[]
): CopilotActionProposal[] {
  const proposals: CopilotActionProposal[] = [];

  // 1. Relevant Next Best Actions matching current deal or account
  if (nbas && nbas.length > 0) {
    const relevant = nbas.filter(
      (nba) =>
        (deal && nba.relatedEntityId === deal.id) ||
        (account && nba.relatedEntityId === account.id)
    );
    relevant.slice(0, 2).forEach((nba) => {
      if (nba.actionPayload) {
        proposals.push({
          id: `copilot-act-${nba.id}`,
          label: nba.actionLabel || "Execute Action",
          type: nba.actionPayload.type,
          description: nba.title,
          payload: nba.actionPayload
        });
      }
    });
  }

  // 2. Synthesize contextual actions if none were directly matched from NBA
  if (deal && proposals.length === 0) {
    const lower = content.toLowerCase();
    if (lower.includes("email") || lower.includes("follow up") || lower.includes("quote") || lower.includes("draft")) {
      proposals.push({
        id: `copilot-act-email-${deal.id}`,
        label: "Draft Follow-Up Email",
        type: "send_email",
        description: `Draft tailored email for ${deal.name}`,
        payload: {
          type: "send_email",
          opportunityId: deal.id,
          accountId: deal.accountId,
          recipientEmail: deal.primaryContactEmail,
          defaultTitle: `Follow-up: ${deal.name}`,
          defaultNotes: `Checking in regarding quotation and project schedule for ${deal.name}.`
        }
      });
    }

    if (lower.includes("meeting") || lower.includes("site visit") || lower.includes("review") || lower.includes("strategy")) {
      proposals.push({
        id: `copilot-act-meeting-${deal.id}`,
        label: "Schedule Strategy Meeting",
        type: "schedule_meeting",
        description: `Organise meeting with ${deal.primaryContactName || "client"}`,
        payload: {
          type: "schedule_meeting",
          opportunityId: deal.id,
          accountId: deal.accountId,
          assignedContactId: deal.primaryContactId,
          defaultTitle: `Strategy Review: ${deal.name}`
        }
      });
    }

    if (lower.includes("call") || lower.includes("phone")) {
      proposals.push({
        id: `copilot-act-call-${deal.id}`,
        label: "Log Call Debrief",
        type: "log_call",
        description: `Record call notes for ${deal.name}`,
        payload: {
          type: "log_call",
          opportunityId: deal.id,
          accountId: deal.accountId,
          defaultTitle: `Call with ${deal.primaryContactName || "client"}`
        }
      });
    }

    if (lower.includes("stage") || lower.includes("quote sent") || lower.includes("advance")) {
      proposals.push({
        id: `copilot-act-stage-${deal.id}`,
        label: "Advance to Quote Sent",
        type: "update_stage",
        description: `Move ${deal.name} to Quote Sent`,
        payload: {
          type: "update_stage",
          opportunityId: deal.id,
          targetStageId: "stage-quote-sent",
          targetStageName: "Quote Sent"
        }
      });
    }
  }

  return proposals;
}

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
    showToast,
    openEmailComposer,
    openScheduleMeeting,
    openQuickLog,
    addTask,
    updateOpportunity,
    navigateToCRM,
    setSelectedAccountId,
    setSelectedCrmOpportunityId,
    currentUser,
    nextBestActions
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
  const [executedActionIds, setExecutedActionIds] = useState<Set<string>>(new Set());

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

  // Dispatch context for 1-tap executable actions
  const dispatchContext: ActionDispatchContext = useMemo(() => ({
    openEmailComposer,
    openScheduleMeeting,
    openQuickLog,
    addTask,
    updateOpportunity,
    navigateToCRM,
    setSelectedAccountId,
    setSelectedOpportunityId: setSelectedCrmOpportunityId,
    showToast,
    currentUser,
    accounts,
    crmOpportunities,
    contacts
  }), [
    openEmailComposer,
    openScheduleMeeting,
    openQuickLog,
    addTask,
    updateOpportunity,
    navigateToCRM,
    setSelectedAccountId,
    setSelectedCrmOpportunityId,
    showToast,
    currentUser,
    accounts,
    crmOpportunities,
    contacts
  ]);

  const handleExecuteAction = (action: CopilotActionProposal) => {
    const result = executeCRMAction(action.payload, dispatchContext);
    if (result.success) {
      setExecutedActionIds((prev) => new Set(prev).add(action.id));
    }
  };

  // Find relevant Next Best Actions for current context
  const relevantNbas = useMemo(() => {
    if (!nextBestActions || nextBestActions.length === 0) return [];
    return nextBestActions.filter((nba) => {
      if (currentDeal && nba.relatedEntityId === currentDeal.id) return true;
      if (currentAccount && nba.relatedEntityId === currentAccount.id) return true;
      return false;
    });
  }, [nextBestActions, currentDeal, currentAccount]);

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
            const finalContent = streamedAnswer || data?.content || data?.reply || "";
            if (data?.citations) {
              incomingCitations = data.citations;
            }
            const actions = deriveActionsFromContext(finalContent, currentDeal, currentAccount, nextBestActions);
            setMessages([
              ...newMessages,
              {
                role: "assistant",
                content: finalContent,
                citations: incomingCitations,
                actions: actions.length > 0 ? actions : undefined
              }
            ]);
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

        {/* Actionable Next Steps Strip for Active Deal or Account */}
        {(currentDeal || currentAccount) && relevantNbas.length > 0 && (
          <div className="px-3.5 py-2.5 bg-brand-wash/60 border-b border-brand-edge/60 space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-brand-deep uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-deep" />
                <span>Recommended Next Actions ({relevantNbas.length})</span>
              </span>
              <span className="text-[10px] font-mono text-ink-dim">1-Tap Execute</span>
            </div>
            <div className="space-y-1.5">
              {relevantNbas.slice(0, 2).map((nba) => {
                const isDone = executedActionIds.has(nba.id);
                return (
                  <div
                    key={nba.id}
                    className="p-2 bg-white rounded-edge border border-line flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-body truncate">{nba.title}</p>
                      <p className="text-[10px] text-ink-dim truncate">{nba.description}</p>
                    </div>
                    <button
                      type="button"
                      disabled={isDone}
                      onClick={() =>
                        nba.actionPayload &&
                        handleExecuteAction({
                          id: nba.id,
                          label: nba.actionLabel || "Act Now",
                          type: nba.actionPayload.type,
                          payload: nba.actionPayload
                        })
                      }
                      className={`px-2.5 py-1 rounded-edge text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs ${
                        isDone
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                          : "bg-brand-deep hover:bg-brand text-white"
                      }`}
                    >
                      {isDone ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Done</span>
                        </>
                      ) : (
                        <>
                          {renderActionIcon(nba.actionPayload?.type)}
                          <span>{nba.actionLabel || "Act"}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

                {/* Embedded Action Proposal Buttons */}
                {m.actions && m.actions.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-line/70 space-y-2">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-ink-dim uppercase tracking-wider">
                      <Sparkles className="w-3 h-3 text-brand-deep" />
                      <span>Actionable Next Steps (1-Tap Execution)</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {m.actions.map((act) => {
                        const isDone = executedActionIds.has(act.id);
                        return (
                          <button
                            key={act.id}
                            type="button"
                            disabled={isDone}
                            onClick={() => handleExecuteAction(act)}
                            className={`px-3 py-1.5 rounded-edge text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                              isDone
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                                : "bg-white hover:bg-brand-wash text-brand-deep border border-brand-edge hover:border-brand-deep hover:shadow-xs"
                            }`}
                          >
                            {isDone ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Action Executed</span>
                              </>
                            ) : (
                              <>
                                {renderActionIcon(act.type)}
                                <span>{act.label}</span>
                              </>
                            )}
                          </button>
                        );
                      })}
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
