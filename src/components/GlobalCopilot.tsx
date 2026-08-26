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

      if (!res.ok) throw new Error("Copilot error");
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      console.error(err);
      showToast("Copilot communication error", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
      {/* Copilot Header - Editorial Dark */}
      <div className="bg-[#0F172A] p-4 text-white flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-emerald-600 flex items-center justify-center text-white font-bold">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs">Plasgain Sales Copilot</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                LIVE
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block">
              Context: {activeTab}
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsCopilotOpen(false)}
          className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="p-3.5 h-80 overflow-y-auto space-y-3 text-xs bg-slate-50/50">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-lg leading-relaxed ${
                m.role === "user"
                  ? "bg-emerald-600 text-white rounded-br-xs"
                  : "bg-white text-slate-800 border border-slate-200 shadow-2xs rounded-bl-xs"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-slate-500 text-xs py-1">
            <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Thinking...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="px-3 py-1.5 bg-slate-100/80 border-t border-slate-200 flex gap-1.5 overflow-x-auto text-[11px]">
        <button
          onClick={() => handleSend("What questions should I ask before quoting?")}
          className="whitespace-nowrap bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 hover:text-emerald-700 cursor-pointer"
        >
          Key Questions?
        </button>
        <button
          onClick={() => handleSend("Explain Cat P4 lighting compliance.")}
          className="whitespace-nowrap bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 hover:text-emerald-700 cursor-pointer"
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
        className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Copilot anything..."
          className="flex-1 text-xs text-slate-900 px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:border-emerald-600 bg-slate-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white p-2 rounded-md transition-colors cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
