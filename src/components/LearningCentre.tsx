import React, { useState } from "react";
import {
  GraduationCap,
  BookOpen,
  Award,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Check,
  Search
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { LessonTopic, GlossaryTerm } from "../types";

export const LearningCentre: React.FC = () => {
  const {
    lessons,
    glossary,
    setExplainingTerm,
    showToast,
    setRawEnquiryInput,
    navigateToWorkflow
  } = useApp();
  const [activeSection, setActiveSection] = useState<
    "lessons" | "quiz" | "simulator" | "scenarios" | "glossary"
  >("lessons");
  const [selectedLesson, setSelectedLesson] = useState<LessonTopic>(lessons[0]);
  const [glossarySearch, setGlossarySearch] = useState("");

  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({});
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);

  const quizQuestions = [
    {
      question: "Why is battery autonomy calculated against June/July winter solstice in Victoria rather than annual average sunlight?",
      options: [
        "Because Victorian councils only operate lights during winter months",
        "Because winter solstice has the lowest solar irradiance and longest night operating hours, representing the worst-case scenario for system survival",
        "To comply with European CE mark requirements",
        "Because LiFePO4 batteries charge twice as fast in cold weather"
      ],
      correctIndex: 1,
      explanation:
        "Australian solar lighting systems must survive the worst-case winter solstice (minimum daily sun hours + maximum night burn hours) to avoid blackouts during consecutive cloudy days."
    },
    {
      question: "Under AS/NZS 1158.3.1, which category is typically specified for regional shared pedestrian/cycle pathways?",
      options: [
        "Category V3 (High speed highway)",
        "Category P4 (Standard pedestrian/cycle path ~1.0 lux average)",
        "Category P1 (High density CBD pedestrian mall)",
        "Category M (Motorway tunnel)"
      ],
      correctIndex: 1,
      explanation:
        "Category P4 is the standard lighting subcategory applied to public pedestrian and cycle pathways requiring adequate visual guidance and safety."
    },
    {
      question: "Why do Victorian coastal councils strictly specify 3000K or 2200K rather than 5000K for public parks and reserves?",
      options: [
        "5000K luminaires are illegal in Australia",
        "Warm CCT (3000K/2200K) produces significantly less blue light wavelength, minimising disruption to nocturnal wildlife, birds, and dark sky compliance",
        "3000K LEDs use half the battery capacity of 5000K LEDs",
        "5000K light cannot penetrate coastal sea mist"
      ],
      correctIndex: 1,
      explanation:
        "High blue-wavelength content in 4000K-5000K light causes skyglow and disrupts circadian rhythms of local fauna. 3000K or 2200K is standard for council environmental reserves."
    },
    {
      question: "If a tree canopy will partially shade a solar panel for 2 hours in the morning, what is the best internal sales recommendation?",
      options: [
        "Tell the client the light will definitely not work and decline the quote",
        "Upsize the solar panel capacity, calculate shade impact, or recommend a spigot outreach bracket/offset pole position to clear the shadow line",
        "Install a 6000K light to compensate for lost sunlight",
        "Reduce battery warranty to 6 months"
      ],
      correctIndex: 1,
      explanation:
        "Solar luminaires can handle minor morning shade if the collector is upsized or positioned via brackets/extended arms away from the primary shadow corridor."
    }
  ];

  // Simulator state
  const [persona, setPersona] = useState<"Council Officer" | "Civil Contractor" | "Solar Sceptic">("Civil Contractor");
  const [simMessages, setSimMessages] = useState<Array<{ sender: "user" | "customer"; text: string }>>([
    {
      sender: "customer",
      text: "Look mate, we are pricing 30 solar lights for a council path in Bendigo, but the project manager is worried they'll go flat after 2 cloudy days in winter. Why shouldn't we just trench mains power?"
    }
  ]);
  const [userInput, setUserInput] = useState("");
  const [isSimLoading, setIsSimLoading] = useState(false);

  const handleSimSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const newHistory = [...simMessages, { sender: "user" as const, text: textToSend }];
    setSimMessages(newHistory);
    setUserInput("");
    setIsSimLoading(true);

    try {
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Roleplay: You are an Australian ${persona}. Respond to the Plasgain sales rep's message: "${textToSend}". Keep it realistic, professional but probing. If their explanation is strong, acknowledge it and ask the next natural question.`,
          history: newHistory.map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text
          }))
        })
      });

      if (!res.ok) {
        const failure = await res.json().catch(() => null);
        throw new Error(
          res.status === 503 && failure?.degraded
            ? `AI unavailable — ${failure.detail || "the simulator is offline."}`
            : failure?.error || "Simulator error"
        );
      }
      const data = await res.json();
      setSimMessages([...newHistory, { sender: "customer", text: data.reply }]);
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Simulator error", "error");
    } finally {
      setIsSimLoading(false);
    }
  };

  const filteredGlossary = glossary.filter(
    (g) =>
      g.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
      (g.shortDefinition || g.definition || "").toLowerCase().includes(glossarySearch.toLowerCase()) ||
      (g.whyItMatters || g.salesRelevance || g.plasgainRelevance || "").toLowerCase().includes(glossarySearch.toLowerCase())
  );

  const calculateScore = () => {
    let score = 0;
    quizQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        score++;
      }
    });
    return score;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-body">Learning & Training Centre</h1>
            <span className="text-meta font-semibold px-2.5 py-0.5 rounded-full bg-brand-wash text-brand-deep border border-brand-edge">
              Solar & Lighting Mastery
            </span>
          </div>
          <p className="text-meta text-ink-dim mt-0.5">
            5-minute bite-sized technical modules, interactive product quizzes, sales simulators, and lighting glossary.
          </p>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex items-center gap-2 border-b border-line pb-1">
        <button
          onClick={() => setActiveSection("lessons")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-edge text-meta font-semibold transition-colors cursor-pointer ${
            activeSection === "lessons"
              ? "bg-brand-deep text-white shadow-xs"
              : "bg-paper hover:bg-line text-body"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>5-Minute Micro-Lessons</span>
        </button>

        <button
          onClick={() => setActiveSection("quiz")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-edge text-meta font-semibold transition-colors cursor-pointer ${
            activeSection === "quiz"
              ? "bg-brand-deep text-white shadow-xs"
              : "bg-paper hover:bg-line text-body"
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Knowledge Quiz</span>
        </button>

        <button
          onClick={() => setActiveSection("simulator")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-edge text-meta font-semibold transition-colors cursor-pointer ${
            activeSection === "simulator"
              ? "bg-brand-deep text-white shadow-xs"
              : "bg-paper hover:bg-line text-body"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Sales Roleplay Simulator</span>
        </button>

        <button
          onClick={() => setActiveSection("scenarios")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-edge text-meta font-semibold transition-colors cursor-pointer ${
            activeSection === "scenarios"
              ? "bg-brand-deep text-white shadow-xs"
              : "bg-paper hover:bg-line text-body"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Training Scenarios</span>
        </button>

        <button
          onClick={() => setActiveSection("glossary")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-edge text-meta font-semibold transition-colors cursor-pointer ${
            activeSection === "glossary"
              ? "bg-brand-deep text-white shadow-xs"
              : "bg-paper hover:bg-line text-body"
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Lighting Glossary</span>
        </button>
      </div>

      {/* 1. LESSONS VIEW */}
      {activeSection === "lessons" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lessons List (1 col) */}
          <div className="space-y-2">
            {lessons.map((les) => {
              const isSelected = selectedLesson.id === les.id;
              return (
                <button
                  key={les.id}
                  onClick={() => setSelectedLesson(les)}
                  className={`w-full text-left p-3.5 rounded-panel border transition-all cursor-pointer space-y-1 ${
                    isSelected
                      ? "bg-brand-wash border-brand-edge ring-2 ring-brand-deep/20"
                      : "bg-white border-line hover:border-line-strong"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-spec font-bold px-1.5 py-0.5 rounded bg-paper text-ink-dim uppercase">
                      {les.category}
                    </span>
                    <span className="text-spec text-ink-dim font-medium">{les.readTimeMinutes} min read</span>
                  </div>
                  <h4 className="font-bold text-meta">{les.title}</h4>
                  <p className="text-spec text-ink-dim line-clamp-1">{les.summary}</p>
                </button>
              );
            })}
          </div>

          {/* Selected Lesson Reader (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-panel border border-line p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <span className="text-spec font-bold text-brand-deep uppercase tracking-wider block">
                  {selectedLesson.category} • {selectedLesson.readTimeMinutes} Minute Module
                </span>
                <h3 className="text-lg font-bold text-body">{selectedLesson.title}</h3>
              </div>
              <span className="text-meta bg-brand-wash text-brand-deep font-bold px-2 py-0.5 rounded">
                Verified Curriculum
              </span>
            </div>

            <div className="space-y-4 text-meta leading-relaxed">
              <div className="bg-raised p-4 rounded-edge border border-line">
                <strong className="text-body block mb-1">Module Summary:</strong>
                <p>{selectedLesson.summary}</p>
              </div>

              <div>
                <h4 className="font-bold text-body mb-2">Key Learning Points:</h4>
                <ul className="space-y-2">
                  {selectedLesson.keyTakeaways.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-brand-wash p-2.5 rounded border border-brand-edge">
                      <CheckCircle2 className="w-4 h-4 text-brand-deep shrink-0 mt-0.5" />
                      <span className="text-body">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {selectedLesson.salesRelevance && (
                <div className="bg-amber-50/60 p-4 rounded-edge border border-amber-200 text-amber-950 space-y-1">
                  <strong className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    How to Use This in Customer Conversations:
                  </strong>
                  <p>{selectedLesson.salesRelevance}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. QUIZ VIEW */}
      {activeSection === "quiz" && (
        <div className="bg-white rounded-panel border border-line p-6 shadow-xs space-y-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div>
              <h3 className="font-bold text-body text-base">Product & Standards Knowledge Check</h3>
              <p className="text-meta text-ink-dim">Test your recall on battery autonomy, AS1158, and CCT</p>
            </div>
            {isQuizSubmitted && (
              <span className="text-body font-bold px-3 py-1 rounded bg-brand-wash text-brand-deep">
                Score: {calculateScore()} / {quizQuestions.length}
              </span>
            )}
          </div>

          <div className="space-y-6">
            {quizQuestions.map((q, qIdx) => {
              const selectedOpt = selectedAnswers[qIdx];
              return (
                <div key={qIdx} className="space-y-3 pb-4 border-b border-line last:border-0 text-meta">
                  <div className="font-bold text-body flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-brand-deep text-white flex items-center justify-center text-spec shrink-0 mt-0.5">
                      {qIdx + 1}
                    </span>
                    <span>{q.question}</span>
                  </div>

                  <div className="space-y-2 pl-7">
                    {q.options.map((opt, optIdx) => {
                      const isChosen = selectedOpt === optIdx;
                      const isCorrect = q.correctIndex === optIdx;

                      let optStyle = "bg-raised border-line hover:border-brand-edge";
                      if (isQuizSubmitted) {
                        if (isCorrect) optStyle = "bg-brand-wash border-brand font-semibold text-brand-deep";
                        else if (isChosen) optStyle = "bg-rose-100 border-rose-400 text-rose-950";
                      } else if (isChosen) {
                        optStyle = "bg-brand-wash border-brand ring-2 ring-brand-deep/20";
                      }

                      return (
                        <button
                          key={optIdx}
                          disabled={isQuizSubmitted}
                          onClick={() => setSelectedAnswers({ ...selectedAnswers, [qIdx]: optIdx })}
                          className={`w-full text-left p-3 rounded-edge border text-meta transition-all cursor-pointer flex items-center justify-between ${optStyle}`}
                        >
                          <span>{opt}</span>
                          {isQuizSubmitted && isCorrect && <Check className="w-4 h-4 text-brand-deep shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {isQuizSubmitted && (
                    <div className="pl-7 pt-1 text-spec text-ink-dim italic">
                      <strong>Explanation: </strong> {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-line flex justify-end gap-3">
            {isQuizSubmitted ? (
              <button
                onClick={() => {
                  setSelectedAnswers({});
                  setIsQuizSubmitted(false);
                }}
                className="bg-paper hover:bg-line font-semibold px-4 py-2 rounded-edge text-meta transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Quiz</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (Object.keys(selectedAnswers).length < quizQuestions.length) {
                    showToast("Please answer all questions before submitting", "warning");
                    return;
                  }
                  setIsQuizSubmitted(true);
                  showToast("Quiz submitted! Review explanations below", "success");
                }}
                className="bg-brand-deep hover:bg-chrome text-white font-semibold px-5 py-2.5 rounded-edge text-meta transition-colors cursor-pointer shadow-xs"
              >
                Submit Answers
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. SIMULATOR VIEW */}
      {activeSection === "simulator" && (
        <div className="bg-white rounded-panel border border-line p-6 shadow-xs space-y-4 max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
            <div>
              <h3 className="font-bold text-body text-base">Interactive Customer Roleplay Simulator</h3>
              <p className="text-meta text-ink-dim">Practice handling tough objections with simulated Australian buyers</p>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-meta text-ink-dim font-medium">Persona:</span>
              <select
                value={persona}
                onChange={(e) => {
                  const p = e.target.value as any;
                  setPersona(p);
                  setSimMessages([
                    {
                      sender: "customer",
                      text:
                        p === "Civil Contractor"
                          ? "Look mate, we are pricing 30 solar lights for a council path in Bendigo, but the project manager is worried they'll go flat after 2 cloudy days in winter. Why shouldn't we just trench mains power?"
                          : p === "Council Officer"
                          ? "We have strict AS/NZS 1158.3.1 Category P4 compliance requirements and a wildlife overlay for 3000K. How do you guarantee the Pro Blade will pass formal audit?"
                          : "Solar lights are just toys that fail after 18 months when the battery dies. Convince me otherwise."
                    }
                  ]);
                }}
                className="text-meta font-semibold px-2.5 py-1.5 rounded-edge border border-line-strong bg-raised"
              >
                <option value="Civil Contractor">Civil Contractor (Cost & Reliability)</option>
                <option value="Council Officer">Council Lighting Officer (AS1158 & CCT)</option>
                <option value="Solar Sceptic">Solar Sceptic (Battery Life Doubts)</option>
              </select>
            </div>
          </div>

          {/* Chat Stream */}
          <div className="h-80 overflow-y-auto p-4 rounded-panel bg-raised border border-line space-y-3 text-meta">
            {simMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <span className="text-spec text-ink-faint mb-0.5 px-1 font-semibold">
                  {msg.sender === "user" ? "You (Plasgain Sales)" : `${persona}`}
                </span>
                <div
                  className={`p-3 rounded-panel max-w-lg leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-brand-deep text-white rounded-tr-none"
                      : "bg-white text-body border border-line rounded-tl-none shadow-2xs"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isSimLoading && (
              <div className="flex items-center gap-2 text-ink-faint text-meta italic">
                <div className="w-3.5 h-3.5 border-2 border-brand-deep border-t-transparent rounded-full animate-spin"></div>
                <span>Customer is replying...</span>
              </div>
            )}
          </div>

          {/* Quick coaching prompts */}
          <div className="flex flex-wrap gap-1.5 text-spec">
            <span className="text-ink-dim font-medium">Quick suggestions:</span>
            <button
              onClick={() =>
                handleSimSend(
                  "Our systems are sized for southern Victorian winter solstice with 4-5 nights autonomy on Grade-A LiFePO4 cells (3,000+ cycles to 80% DOD). Trenching mains power over 1.2km often costs $80-$120/metre just in civil works, making solar significantly more cost-effective."
                )
              }
              className="text-brand-deep hover:text-brand-deep bg-brand-wash hover:bg-brand-wash px-2.5 py-1 rounded border border-brand-edge transition-colors cursor-pointer"
            >
              "Explain winter sizing & trenching cost comparison"
            </button>
            <button
              onClick={() =>
                handleSimSend(
                  "We provide full point-by-point Dialux photometric simulation reports matching AS/NZS 1158.3.1 Category P4 criteria with our 3000K warm white optics."
                )
              }
              className="text-brand-deep hover:text-brand-deep bg-brand-wash hover:bg-brand-wash px-2.5 py-1 rounded border border-brand-edge transition-colors cursor-pointer"
            >
              "Offer Dialux photometric report & 3000K compliance"
            </button>
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSimSend(userInput);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your response to the customer..."
              className="flex-1 text-meta p-2.5 rounded-edge border border-line-strong focus:outline-none focus:border-brand-deep"
            />
            <button
              type="submit"
              disabled={isSimLoading || !userInput.trim()}
              className="bg-brand-deep hover:bg-chrome disabled:bg-line-strong text-white px-4 py-2.5 rounded-edge text-meta font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Send Response
            </button>
          </form>
        </div>
      )}

      {/* 4. GLOSSARY VIEW */}
      {activeSection === "glossary" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-ink-faint absolute left-3 top-3" />
              <input
                type="text"
                value={glossarySearch}
                onChange={(e) => setGlossarySearch(e.target.value)}
                placeholder="Search lighting terms, standards, or acronyms..."
                className="w-full text-meta pl-9 pr-4 py-2.5 rounded-edge border border-line-strong focus:outline-none focus:border-brand-deep bg-white"
              />
            </div>
            <span className="text-meta text-ink-dim font-medium">
              {filteredGlossary.length} lighting terms
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGlossary.map((term, idx) => (
              <div
                key={idx}
                className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-2 text-meta"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-body">{term.term}</h4>
                  <button
                    onClick={() => setExplainingTerm(term.term)}
                    className="text-spec text-brand-deep underline font-semibold cursor-pointer"
                  >
                    Deep Dive
                  </button>
                </div>
                <p className="text-body leading-relaxed">
                  {term.definition || term.shortDefinition}
                </p>
                <div className="bg-brand-wash p-2.5 rounded border border-brand-edge text-spec">
                  <strong className="text-brand-deep">Sales Relevance: </strong>
                  {term.salesRelevance || term.whyItMatters || term.plasgainRelevance}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. TRAINING SCENARIOS & EXAMPLES */}
      {activeSection === "scenarios" && (
        <div className="space-y-4">
          <div className="bg-white rounded-panel border border-line p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-brand-deep" />
              <h3 className="font-bold text-body">
                Practical Australian Lighting Practice Scenarios
              </h3>
            </div>
            <p className="text-meta text-ink-dim">
              Load realistic Australian council and commercial contractor enquiries into the AI Analysis Workspace to test specification extraction, standard compliance evaluation (AS/NZS 1158), and luminaire matching.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Scenario 1: Ballarat */}
            <div className="bg-white rounded-panel border border-line p-5 shadow-xs flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-spec font-bold text-brand-deep bg-brand-wash px-2 py-0.5 rounded uppercase">
                    Solar Pathway
                  </span>
                  <span className="text-spec text-ink-faint font-medium">Ballarat, VIC</span>
                </div>
                <h4 className="font-bold text-body">
                  Ballarat 1.2km Shared Path Upgrade
                </h4>
                <p className="text-meta text-ink-dim leading-relaxed">
                  ABC Civil pricing a 1.2km shared path requiring off-grid solar option due to mains trenching costs. 6m poles, dusk-to-dawn operation.
                </p>
                <div className="p-2.5 rounded bg-raised border border-line text-spec">
                  <strong className="text-body">Key Learning:</strong> Identifying missing AS/NZS 1158 subcategory (P4), path width, and battery autonomy survival.
                </div>
              </div>

              <button
                onClick={() => {
                  setRawEnquiryInput({
                    rawContent:
                      "We are pricing a new 1.2 km shared pathway in Ballarat and require a solar lighting option. The current drawings indicate 6 m poles. Lighting is expected to operate dusk to dawn. Can you recommend a suitable solution and provide budget pricing? Installation is expected around November.",
                    customer: "Rob Mitchell",
                    contact: "rob.mitchell@abccivil.com.au",
                    company: "ABC Civil Pty Ltd",
                    project: "Ballarat 1.2km Shared Path Upgrade",
                    location: "Ballarat, Victoria",
                    source: "Email"
                  });
                  showToast("Loaded Ballarat Shared Path enquiry into workspace", "info");
                  navigateToWorkflow("new-enquiry");
                }}
                className="w-full py-2 px-3 rounded-edge bg-brand-deep hover:bg-brand-deep text-white font-semibold text-meta transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>Load into AI Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Scenario 2: Geelong */}
            <div className="bg-white rounded-panel border border-line p-5 shadow-xs flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-spec font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded uppercase">
                    Coastal / IK10
                  </span>
                  <span className="text-spec text-ink-faint font-medium">Geelong, VIC</span>
                </div>
                <h4 className="font-bold text-body">
                  Eastern Beach Foreshore Bollards
                </h4>
                <p className="text-meta text-ink-dim leading-relaxed">
                  Council expression of interest for 24x solar pathway bollards. Requires IK10 vandal resistance, zero upward light spill, and 3000K warm white.
                </p>
                <div className="p-2.5 rounded bg-raised border border-line text-spec">
                  <strong className="text-body">Key Learning:</strong> Protecting coastal fauna with 3000K CCT and dark sky zero upward light spill requirements.
                </div>
              </div>

              <button
                onClick={() => {
                  setRawEnquiryInput({
                    rawContent:
                      "Geelong City Council is seeking expressions of interest for 24x solar pathway bollards for the Eastern Beach foreshore path. Must be vandal resistant (IK10 rated), low-glare with zero upward light spill, and 3000K warm white to suit coastal fauna. Need tender documentation and IES files.",
                    customer: "Sarah Jenkins",
                    contact: "sjenkins@geelongcity.vic.gov.au",
                    company: "City of Greater Geelong",
                    project: "Eastern Beach Foreshore Reserve Path",
                    location: "Geelong, Victoria",
                    source: "Council Tender Portal"
                  });
                  showToast("Loaded Geelong Foreshore enquiry into workspace", "info");
                  navigateToWorkflow("new-enquiry");
                }}
                className="w-full py-2 px-3 rounded-edge bg-brand-deep hover:bg-brand-deep text-white font-semibold text-meta transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>Load into AI Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Scenario 3: Monash */}
            <div className="bg-white rounded-panel border border-line p-5 shadow-xs flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-spec font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded uppercase">
                    Industrial Flood
                  </span>
                  <span className="text-spec text-ink-faint font-medium">Dandenong, VIC</span>
                </div>
                <h4 className="font-bold text-body">
                  Dandenong Transport Depot Heavy Yard
                </h4>
                <p className="text-meta text-ink-dim leading-relaxed">
                  Freight transport depot with overloaded electrical substation. High-output solar floodlighting on 10m-12m poles with 5 nights battery autonomy.
                </p>
                <div className="p-2.5 rounded bg-raised border border-line text-spec">
                  <strong className="text-body">Key Learning:</strong> Sizing high-mast solar panels and battery storage for heavy vehicle loading areas.
                </div>
              </div>

              <button
                onClick={() => {
                  setRawEnquiryInput({
                    rawContent:
                      "We have a new freight transport yard in Dandenong South. Substation is at capacity so trenching mains power is too expensive. Need high-output off-grid solar floodlighting on 10m-12m poles to illuminate heavy vehicle loading area. Must have at least 5 nights battery autonomy.",
                    customer: "David Lee",
                    contact: "dlee@apexelectrical.com.au",
                    company: "Apex Electrical Contracting",
                    project: "Monash Industrial Estate Transport Depot",
                    location: "Dandenong South, Victoria",
                    source: "Phone Notes"
                  });
                  showToast("Loaded Monash Transport Depot enquiry into workspace", "info");
                  navigateToWorkflow("new-enquiry");
                }}
                className="w-full py-2 px-3 rounded-edge bg-brand-deep hover:bg-brand-deep text-white font-semibold text-meta transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>Load into AI Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
