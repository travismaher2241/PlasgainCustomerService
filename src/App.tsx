import React, { useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { HomeDashboard } from "./components/HomeDashboard";
import { NewEnquiryWorkspace } from "./components/NewEnquiryWorkspace";
import { ProductFinder } from "./components/ProductFinder";
import { AskPlasgain } from "./components/AskPlasgain";
import { OpportunitiesPipeline } from "./components/OpportunitiesPipeline";
import { DocumentLibrary } from "./components/DocumentLibrary";
import { ToolsHub } from "./components/ToolsHub";
import { LearningCentre } from "./components/LearningCentre";
import { SettingsView } from "./components/SettingsView";
import { CRMCommandCenter } from "./components/crm/CRMCommandCenter";
import { CRMQuickLogModal } from "./components/crm/CRMQuickLogModal";
import { GlobalCopilot } from "./components/GlobalCopilot";
import { ExplainTermModal } from "./components/ExplainTermModal";
import { GlobalSearchModal } from "./components/GlobalSearchModal";
import { CheckCircle2, AlertCircle, Info, XCircle } from "lucide-react";

const MainLayout: React.FC = () => {
  const { activeTab, toast } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden antialiased selection:bg-emerald-700 selection:text-white">
      {/* Editorial Emerald Sidebar */}
      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-[#F8FAFC]">
        {/* Editorial Top Header */}
        <Header onToggleMobileMenu={() => setMobileMenuOpen(true)} />

        {/* Dynamic Main Workspace Stage */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            {activeTab === "home" && <HomeDashboard />}
            {activeTab === "crm" && <CRMCommandCenter />}
            {activeTab === "new-enquiry" && <NewEnquiryWorkspace />}
            {activeTab === "product-finder" && <ProductFinder />}
            {activeTab === "ask-plasgain" && <AskPlasgain />}
            {activeTab === "opportunities" && <OpportunitiesPipeline />}
            {activeTab === "documents" && <DocumentLibrary />}
            {activeTab === "tools" && <ToolsHub />}
            {activeTab === "learn" && <LearningCentre />}
            {activeTab === "settings" && <SettingsView />}
          </div>
        </main>
      </div>

      {/* Interactive Overlays */}
      <GlobalCopilot />
      <ExplainTermModal />
      <GlobalSearchModal />
      <CRMQuickLogModal />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 left-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg border text-xs font-semibold ${
              toast.type === "success"
                ? "bg-slate-900 text-white border-slate-800"
                : toast.type === "warning"
                ? "bg-amber-900 text-white border-amber-800"
                : toast.type === "error"
                ? "bg-rose-900 text-white border-rose-800"
                : "bg-slate-800 text-white border-slate-700"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {toast.type === "warning" && <AlertCircle className="w-4 h-4 text-amber-400" />}
            {toast.type === "error" && <XCircle className="w-4 h-4 text-rose-400" />}
            {toast.type === "info" && <Info className="w-4 h-4 text-blue-400" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
