import React, { useState, Suspense, lazy } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { CheckCircle2, AlertCircle, Info, XCircle } from "lucide-react";

// Code-split major screens and heavy modals for optimal initial bundle size
const HomeDashboard = lazy(() => import("./components/HomeDashboard").then(m => ({ default: m.HomeDashboard })));
const NewEnquiryWorkspace = lazy(() => import("./components/NewEnquiryWorkspace").then(m => ({ default: m.NewEnquiryWorkspace })));
const ProductFinder = lazy(() => import("./components/ProductFinder").then(m => ({ default: m.ProductFinder })));
const AskPlasgain = lazy(() => import("./components/AskPlasgain").then(m => ({ default: m.AskPlasgain })));
const OpportunitiesPipeline = lazy(() => import("./components/OpportunitiesPipeline").then(m => ({ default: m.OpportunitiesPipeline })));
const DocumentLibrary = lazy(() => import("./components/DocumentLibrary").then(m => ({ default: m.DocumentLibrary })));
const ToolsHub = lazy(() => import("./components/ToolsHub").then(m => ({ default: m.ToolsHub })));
const LearningCentre = lazy(() => import("./components/LearningCentre").then(m => ({ default: m.LearningCentre })));
const SettingsView = lazy(() => import("./components/SettingsView").then(m => ({ default: m.SettingsView })));
const CRMCommandCenter = lazy(() => import("./components/crm/CRMCommandCenter").then(m => ({ default: m.CRMCommandCenter })));
const CRMQuickLogModal = lazy(() => import("./components/crm/CRMQuickLogModal").then(m => ({ default: m.CRMQuickLogModal })));
const GlobalCopilot = lazy(() => import("./components/GlobalCopilot").then(m => ({ default: m.GlobalCopilot })));
const ExplainTermModal = lazy(() => import("./components/ExplainTermModal").then(m => ({ default: m.ExplainTermModal })));
const GlobalSearchModal = lazy(() => import("./components/GlobalSearchModal").then(m => ({ default: m.GlobalSearchModal })));

const ViewLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-[350px] w-full" data-testid="view-loading-spinner">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-xs font-semibold text-slate-500">Loading Plasgain workspace...</span>
    </div>
  </div>
);

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
            <Suspense fallback={<ViewLoadingFallback />}>
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
            </Suspense>
          </div>
        </main>
      </div>

      {/* Interactive Overlays */}
      <Suspense fallback={null}>
        <GlobalCopilot />
        <ExplainTermModal />
        <GlobalSearchModal />
        <CRMQuickLogModal />
      </Suspense>

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
