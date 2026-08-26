import React from "react";
import {
  FilePlus2,
  SearchCode,
  BookOpen,
  FileText,
  PhoneCall,
  ClipboardCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  Layers,
  MapPin,
  Calendar,
  Building,
  UserCheck
} from "lucide-react";
import { useApp } from "../context/AppContext";

export const HomeDashboard: React.FC = () => {
  const {
    navigateToWorkflow,
    opportunities,
    setSelectedOpportunityId,
    setRawEnquiryInput,
    showToast
  } = useApp();

  const handleLoadSample = (sampleType: "ballarat" | "geelong" | "monash") => {
    if (sampleType === "ballarat") {
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
      showToast("Loaded Ballarat 1.2km Shared Path sample enquiry", "info");
      navigateToWorkflow("new-enquiry");
    } else if (sampleType === "geelong") {
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
      showToast("Loaded Geelong Foreshore Bollards sample enquiry", "info");
      navigateToWorkflow("new-enquiry");
    } else if (sampleType === "monash") {
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
      showToast("Loaded Monash Transport Depot sample enquiry", "info");
      navigateToWorkflow("new-enquiry");
    }
  };

  // Action centre counts
  const needsFollowUpCount = opportunities.filter((o) => o.stage === "Follow-Up").length;
  const waitingCustomerCount = opportunities.filter((o) => o.stage === "Awaiting Information").length;
  const quoteDueSoonCount = opportunities.filter((o) => o.stage === "Quoting" || o.stage === "Qualifying").length;
  const techReviewCount = opportunities.filter((o) => o.stage === "Technical Review").length;
  const newEnquiriesCount = opportunities.filter((o) => o.stage === "New Enquiry").length;

  return (
    <div className="space-y-6">
      {/* Top Greeting & Command Bar - Editorial Slate & Emerald */}
      <div className="bg-[#0F172A] rounded-xl p-6 sm:p-8 text-white shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Internal Sales Workspace
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Analyse messy customer enquiries, match Plasgain solar & commercial luminaires, identify missing parameters, and generate professional responses grounded in official documentation.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 sm:self-start md:self-center">
            <button
              onClick={() => navigateToWorkflow("crm")}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-md text-xs transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-950" />
              <span>Open Sales CRM</span>
            </button>
            <button
              onClick={() => navigateToWorkflow("new-enquiry")}
              className="bg-emerald-700 hover:bg-emerald-600 text-white font-medium px-4 py-2.5 rounded-md text-xs transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <FilePlus2 className="w-4 h-4 text-emerald-200" />
              <span>Analyse New Enquiry</span>
            </button>
            <button
              onClick={() => navigateToWorkflow("product-finder")}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-4 py-2.5 rounded-md text-xs transition-all border border-slate-700 flex items-center gap-2 cursor-pointer"
            >
              <SearchCode className="w-4 h-4 text-slate-300" />
              <span>Product Finder</span>
            </button>
          </div>
        </div>

        {/* Quick Launcher Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mt-6 pt-6 border-t border-slate-800">
          <button
            onClick={() => navigateToWorkflow("new-enquiry")}
            className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-700/50 text-left transition-all text-slate-200 hover:text-white cursor-pointer group"
          >
            <FilePlus2 className="w-4 h-4 mb-1.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-center">New Enquiry</span>
          </button>

          <button
            onClick={() => navigateToWorkflow("product-finder")}
            className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-700/50 text-left transition-all text-slate-200 hover:text-white cursor-pointer group"
          >
            <SearchCode className="w-4 h-4 mb-1.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-center">Find Product</span>
          </button>

          <button
            onClick={() => navigateToWorkflow("documents")}
            className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-700/50 text-left transition-all text-slate-200 hover:text-white cursor-pointer group"
          >
            <BookOpen className="w-4 h-4 mb-1.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-center">Catalogues</span>
          </button>

          <button
            onClick={() => navigateToWorkflow("tools", "tender-analyser")}
            className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-700/50 text-left transition-all text-slate-200 hover:text-white cursor-pointer group"
          >
            <FileText className="w-4 h-4 mb-1.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-center">Analyse Tender</span>
          </button>

          <button
            onClick={() => navigateToWorkflow("tools", "call-prep", "opp-001")}
            className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-700/50 text-left transition-all text-slate-200 hover:text-white cursor-pointer group"
          >
            <PhoneCall className="w-4 h-4 mb-1.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-center">Prepare Call</span>
          </button>

          <button
            onClick={() => navigateToWorkflow("tools", "quote-review")}
            className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-700/50 text-left transition-all text-slate-200 hover:text-white cursor-pointer group"
          >
            <ClipboardCheck className="w-4 h-4 mb-1.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-center">Review Quote</span>
          </button>
        </div>
      </div>

      {/* Action Centre Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Action Centre — What Needs Your Attention
          </h2>
          <span className="text-xs text-slate-400 font-medium">Updated live</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Card 1 */}
          <div
            onClick={() => navigateToWorkflow("opportunities")}
            className="bg-white p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-amber-700 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Needs Follow-Up</span>
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="text-2xl font-black text-slate-900 group-hover:text-emerald-700">
              {needsFollowUpCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Active quotes awaiting feedback</p>
          </div>

          {/* Card 2 */}
          <div
            onClick={() => navigateToWorkflow("opportunities")}
            className="bg-white p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-blue-700 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Waiting for Customer</span>
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
            <div className="text-2xl font-black text-slate-900 group-hover:text-emerald-700">
              {waitingCustomerCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Pending missing specs before quoting</p>
          </div>

          {/* Card 3 */}
          <div
            onClick={() => navigateToWorkflow("opportunities")}
            className="bg-white p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-rose-700 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Quote Due Soon</span>
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div className="text-2xl font-black text-slate-900 group-hover:text-emerald-700">
              {quoteDueSoonCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Deadlines within 5 business days</p>
          </div>

          {/* Card 4 */}
          <div
            onClick={() => navigateToWorkflow("opportunities")}
            className="bg-white p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-purple-700 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Technical Review</span>
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div className="text-2xl font-black text-slate-900 group-hover:text-emerald-700">
              {techReviewCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Awaiting Dialux photometric check</p>
          </div>

          {/* Card 5 */}
          <div
            onClick={() => navigateToWorkflow("opportunities")}
            className="bg-white p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer group col-span-2 sm:col-span-1"
          >
            <div className="flex items-center justify-between text-emerald-700 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">New Enquiries</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div className="text-2xl font-black text-slate-900 group-hover:text-emerald-700">
              {newEnquiriesCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Unprocessed emails & tenders</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Priorities & Sample Demo Scenarios */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Priorities (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Today&apos;s Priority Pipeline Actions</h3>
              <p className="text-xs text-slate-500">Sorted by quotation deadline, opportunity value, and missing info status</p>
            </div>
            <button
              onClick={() => navigateToWorkflow("opportunities")}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View All Pipeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {opportunities.slice(0, 4).map((opp) => (
              <div
                key={opp.id}
                className="p-3.5 rounded-lg border border-slate-200 hover:border-emerald-300 bg-slate-50/50 hover:bg-emerald-50/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">{opp.project}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      {opp.stage}
                    </span>
                    {opp.estimatedValue && (
                      <span className="text-xs font-bold text-emerald-700">
                        ${opp.estimatedValue.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3 text-slate-400" />
                      {opp.customerCompany} ({opp.contactName})
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {opp.location}
                    </span>
                    {opp.quoteDeadline && (
                      <span className="flex items-center gap-1 text-amber-800 font-medium">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Due: {opp.quoteDeadline}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-700 pt-1">
                    <span className="font-semibold text-slate-900">Next Action:</span> {opp.nextAction}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => {
                      setSelectedOpportunityId(opp.id);
                      navigateToWorkflow("tools", "call-prep", opp.id);
                    }}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer border border-slate-200"
                  >
                    Prep Call
                  </button>
                  <button
                    onClick={() => {
                      setSelectedOpportunityId(opp.id);
                      navigateToWorkflow("opportunities", undefined, opp.id);
                    }}
                    className="text-xs font-medium px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-2xs"
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Sample Enquiries & Testing Suite (1 col) */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Demo Enquiry Scenarios</h3>
                <p className="text-xs text-slate-500">Test AI analysis with preloaded Australian enquiries</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {/* Sample 1: Ballarat */}
              <button
                onClick={() => handleLoadSample("ballarat")}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">
                    Ballarat 1.2km Shared Path
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    Solar / Council
                  </span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">
                  "We are pricing a new 1.2 km shared pathway in Ballarat and require a solar lighting option. 6m poles, dusk-to-dawn..."
                </p>
                <span className="text-[11px] text-emerald-700 font-semibold mt-1.5 inline-flex items-center gap-1 group-hover:underline">
                  Load into Enquiry Workspace &rarr;
                </span>
              </button>

              {/* Sample 2: Geelong */}
              <button
                onClick={() => handleLoadSample("geelong")}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">
                    Geelong Foreshore Bollards
                  </span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                    Vandal IK10 / 3000K
                  </span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">
                  "24x solar pathway bollards. Must be vandal resistant (IK10 rated), zero upward spill, 3000K warm white..."
                </p>
                <span className="text-[11px] text-emerald-700 font-semibold mt-1.5 inline-flex items-center gap-1 group-hover:underline">
                  Load into Enquiry Workspace &rarr;
                </span>
              </button>

              {/* Sample 3: Monash */}
              <button
                onClick={() => handleLoadSample("monash")}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">
                    Dandenong Transport Depot
                  </span>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                    High Mast Flood
                  </span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">
                  "Substation at capacity. Need high-output off-grid solar floodlighting on 10m-12m poles with 5-night autonomy..."
                </p>
                <span className="text-[11px] text-emerald-700 font-semibold mt-1.5 inline-flex items-center gap-1 group-hover:underline">
                  Load into Enquiry Workspace &rarr;
                </span>
              </button>
            </div>
          </div>

          {/* AI Guardrail Principles Card */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Plasgain Sales Guardrails</span>
            </div>
            <ul className="space-y-1 text-slate-600 pl-4 list-disc">
              <li><strong className="text-slate-800">Evidence before assertion:</strong> Grounded in approved datasheets.</li>
              <li><strong className="text-slate-800">Recommendation, not certification:</strong> Formal compliance requires Dialux engineering.</li>
              <li><strong className="text-slate-800">Sales usefulness:</strong> Every analysis ends in an actionable next step.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
