import React, { useState } from "react";
import { apiPost, toUserMessage } from "../utils/apiClient";
import {
  MessageSquareQuote,
  Sparkles,
  Send,
  FileText,
  ShieldCheck,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  Copy,
  ChevronRight,
  ExternalLink,
  Info,
  Lightbulb,
  Check,
  AlertTriangle,
  AlertCircle
} from "lucide-react";
import { useApp } from "../context/AppContext";

interface QAPair {
  question: string;
  response: {
    answer: string;
    foundInKnowledgeBase?: boolean;
    confidence?: "High" | "Medium" | "Low";
    citations?: Array<{ document: string; pageOrSection?: string; excerpt?: string }>;
    conflictWarning?: string | null;
    technicalConfirmationRequired?: boolean;
    learningSnippet?: {
      concept?: string;
      explanation?: string;
      whyItMattersToCustomer?: string;
    };
    suggestedFollowUpQuestions?: string[];
  };
}

export const AskPlasgain: React.FC = () => {
  const { showToast } = useApp();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [qaHistory, setQaHistory] = useState<QAPair[]>([
    {
      question: "What is the luminous output and battery size of the Intense 50W Solar light?",
      response: {
        answer:
          "According to the approved Plasgain Intense 50W product documentation:\n\n- **Luminous Output:** 7,500 lumens (utilising a Philips SMD 3030 LED module at 150 lm/W lamp efficiency).\n- **Battery Storage:** 896Wh capacity with internal 10A PWM IP68 waterproof controller; rated 70Ah at 12.8V LiFePO4.\n- **Solar Panel:** 130W / 18V monocrystalline PV array with approx. 260° horizontal rotation.\n\n*Source: Plasgain 50W Solar Intense Light Web Page & 2025 Solar Lighting Catalogue.*",
        foundInKnowledgeBase: true,
        confidence: "High",
        citations: [
          {
            document: "Plasgain 50W Solar Intense Light Web Page",
            pageOrSection: "Product Specifications Table",
            excerpt: "Luminous flux: 7,500 lm. Battery: 896Wh with controller; 70Ah / 12.8V. Solar panel: 130W / 18V monocrystalline PV."
          }
        ],
        learningSnippet: {
          concept: "Split-System Solar Luminaire Autonomy",
          explanation: "896Wh battery capacity allows the luminaire to maintain multi-night operation when paired with programmable PIR motion dimming profiles.",
          whyItMattersToCustomer: "Protects against winter dark-sky outages along council trails while keeping the pole structure light."
        },
        suggestedFollowUpQuestions: [
          "What spigot diameter is required for Intense 50W?",
          "Can Intense 50W be supplied in 3000K for fauna-sensitive areas?",
          "How does Intense 50W compare to Pro Blade 75/125?"
        ]
      }
    }
  ]);

  const validationQuestions = [
    { label: "Intense 50W Lumens", query: "What is the luminous output of the Intense 50W Solar light?" },
    { label: "Intense 50W Battery", query: "What is the battery size of the Intense 50W Solar light?" },
    { label: "Roadway V-LED Height", query: "What is the recommended mounting height for Roadway V-LED 70W?" },
    { label: "Shared Path Products", query: "Which Plasgain products are suitable for shared pathways?" },
    { label: "Pro Blade 125 Price", query: "What is the price of the Pro Blade 125?" },
    { label: "Deltalux Solar Panel", query: "What size solar panel is used on Deltalux?" },
    { label: "Roadway V-LED Spacing", query: "Will Roadway V-LED 70W meet AS/NZS 1158 every 35 metres?" },
    { label: "Plaspole 35% Carbon", query: "Does Plaspole reduce carbon emissions by exactly 35%?" }
  ];

  const handleAsk = async (questionText: string) => {
    if (!questionText.trim()) return;

    setIsLoading(true);
    setQuery("");

    try {
      const data = await apiPost("/api/ask-plasgain", { question: questionText });

      setQaHistory((prev) => [
        {
          question: questionText,
          response: {
            answer: data.answer || "No response text generated.",
            foundInKnowledgeBase: data.foundInKnowledgeBase !== false,
            confidence: data.confidence || "High",
            citations: data.citations || [],
            conflictWarning: data.conflictWarning,
            technicalConfirmationRequired: data.technicalConfirmationRequired,
            learningSnippet: data.learningSnippet,
            suggestedFollowUpQuestions: data.suggestedFollowUpQuestions || []
          }
        },
        ...prev
      ]);
    } catch (err: any) {
      console.error(err);
      showToast(toUserMessage(err), "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-body">Ask Plasgain Knowledge Assistant</h1>
            <span className="text-meta font-bold px-2 py-0.5 rounded bg-brand-wash text-brand-deep border border-brand-edge uppercase tracking-wide">
              Grounded AI Engine
            </span>
          </div>
          <p className="text-meta text-ink-dim mt-0.5">
            Instant answers strictly grounded in approved Plasgain product sheets, catalogues, conflict registers, and Australian standards.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-meta text-ink-dim bg-paper px-3 py-1.5 rounded-edge border border-line font-medium self-start">
          <ShieldCheck className="w-4 h-4 text-brand-deep" />
          <span>Strict Anti-Hallucination Grounding</span>
        </div>
      </div>

      {/* Search & Prompt Box */}
      <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk(query);
          }}
          className="relative"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about Plasgain products, lumens, battery Wh, CCT, spigot sizes, or Australian standards..."
            className="w-full text-meta sm:text-body pl-4 pr-24 py-3 rounded-edge border border-line focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep shadow-2xs"
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="absolute right-1.5 top-1.5 bg-brand-deep hover:bg-brand-deep disabled:bg-line-strong text-white text-meta font-medium px-4 py-2 rounded-edge transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {isLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Ask</span>
              </>
            )}
          </button>
        </form>

        {/* Validation Questions / Starter Pills */}
        <div className="space-y-1.5 pt-1">
          <span className="text-spec font-bold text-ink-faint uppercase tracking-wider block">
            Validation Test Scenarios & Quick Queries:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {validationQuestions.map((vq, idx) => (
              <button
                key={idx}
                onClick={() => handleAsk(vq.query)}
                className="text-3xs bg-raised hover:bg-brand-wash text-body hover:text-brand-deep px-2.5 py-1 rounded-edge border border-line hover:border-brand-edge transition-all text-left cursor-pointer font-medium"
              >
                {vq.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Answers Stream */}
      <div className="space-y-5">
        {qaHistory.map((item, idx) => (
          <div
            key={idx}
            className="bg-white rounded-panel border border-line shadow-xs p-5 space-y-4 transition-all"
          >
            {/* User Question */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-line">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-edge bg-brand-wash text-brand-deep flex items-center justify-center font-bold text-meta shrink-0 mt-0.5">
                  Q
                </div>
                <h3 className="font-bold text-body sm:text-base leading-snug">
                  {item.question}
                </h3>
              </div>
              <span
                className={`text-spec font-bold px-2 py-0.5 rounded-edge shrink-0 uppercase tracking-wider ${
                  item.response.confidence === "High"
                    ? "bg-brand-wash text-brand-deep"
                    : item.response.confidence === "Medium"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {item.response.confidence || "High"} Confidence
              </span>
            </div>

            {/* Conflict Warning if present */}
            {(item.response.conflictWarning || item.response.technicalConfirmationRequired) && (
              <div className="p-3 rounded-edge bg-amber-50 border border-amber-200 text-meta text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-amber-950">Technical Confirmation Required</span>
                  <span>{item.response.conflictWarning || "Public Plasgain sources contain conflicting information for this specification. Please confirm the current internal datasheet before quoting."}</span>
                </div>
              </div>
            )}

            {/* Direct Answer (Markdown rendered cleanly) */}
            <div className="text-meta sm:text-body leading-relaxed bg-raised p-4 rounded-edge border border-line whitespace-pre-wrap">
              {item.response.answer}
            </div>

            {/* Learning Snippet */}
            {item.response.learningSnippet && (
              <div className="bg-raised border border-line rounded-edge p-3 text-meta text-ink-dim flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-body font-semibold">
                    {item.response.learningSnippet.concept || "Key Technical Concept"}:{" "}
                  </strong>
                  <span>{item.response.learningSnippet.explanation}</span>
                  {item.response.learningSnippet.whyItMattersToCustomer && (
                    <p className="mt-1 text-ink-dim italic">
                      Why it matters: {item.response.learningSnippet.whyItMattersToCustomer}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Citations */}
            {item.response.citations && item.response.citations.length > 0 && (
              <div className="pt-2 border-t border-line space-y-1.5">
                <span className="text-spec font-bold text-ink-faint uppercase tracking-wider block">
                  Approved Grounded Citations:
                </span>
                <div className="space-y-1.5">
                  {item.response.citations.map((c, i) => (
                    <div
                      key={i}
                      className="text-meta bg-raised p-2.5 rounded border border-line flex items-start gap-2"
                    >
                      <FileText className="w-3.5 h-3.5 text-brand-deep shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-body">{c.document}</span>
                        {c.pageOrSection && <span className="text-ink-dim ml-1">({c.pageOrSection})</span>}
                        {c.excerpt && <p className="text-ink-dim text-spec italic mt-0.5">"{c.excerpt}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Follow-ups */}
            {item.response.suggestedFollowUpQuestions && item.response.suggestedFollowUpQuestions.length > 0 && (
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <span className="text-spec font-bold text-ink-dim">Related follow-ups:</span>
                {item.response.suggestedFollowUpQuestions.map((fq, i) => (
                  <button
                    key={i}
                    onClick={() => handleAsk(fq)}
                    className="text-meta text-brand-deep hover:text-brand-deep bg-brand-wash hover:bg-brand-wash px-2.5 py-1 rounded-edge border border-brand-edge transition-colors cursor-pointer font-medium"
                  >
                    {fq} &rarr;
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
