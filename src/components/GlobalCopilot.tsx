import React, { useState } from "react";
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
  const { isCopilotOpen, setIsCopilotOpen, activeTab, selectedOpportunityId, opportunities, showToast } = useApp();
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content:
        "G'day! I'm your Plasgain Sales Copilot. I'm aware you are currently on the " +
        activeTab.toUpperCase() +
        " screen. You can ask me to draft customer replies, explain compliance clauses, verify battery autonomy for a location, or sanity check pole heights."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isCopilotOpen) return null;

  const currentOpp = opportunities.find((o) => o.id === selectedOpportunityId);

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
          screenContext: `Active Tab: ${activeTab}. Selected Opportunity: ${currentOpp ? `${currentOpp.project} (${currentOpp.customerCompany})` : "None"}.`,
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
            <span className="text-spec text-ink-faint block">
              Context: {activeTab}
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsCopilotOpen(false)}
          className="text-ink-faint hover:text-white p-1 rounded transition-colors cursor-pointer"
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
            <span>Thinking...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="px-3 py-1.5 bg-paper border-t border-line flex gap-1.5 overflow-x-auto text-spec">
        <button
          onClick={() => handleSend("What questions should I ask before quoting?")}
          className="whitespace-nowrap bg-white px-2 py-0.5 rounded border border-line text-body hover:text-brand-deep cursor-pointer"
        >
          Key Questions?
        </button>
        <button
          onClick={() => handleSend("Explain Cat P4 lighting compliance.")}
          className="whitespace-nowrap bg-white px-2 py-0.5 rounded border border-line text-body hover:text-brand-deep cursor-pointer"
        >
          Cat P4?
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
