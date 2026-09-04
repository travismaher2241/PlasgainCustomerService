import React, { useState, Suspense, lazy } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { CheckCircle2, AlertCircle, Info, XCircle } from "lucide-react";

// Code-split major screens and heavy modals for optimal initial bundle size
const HomeDashboard = lazy(() => import("./components/HomeDashboard").then(m => ({ default: m.HomeDashboard })));
const SettingsView = lazy(() => import("./components/SettingsView").then(m => ({ default: m.SettingsView })));
const CRMCommandCenter = lazy(() => import("./components/crm/CRMCommandCenter").then(m => ({ default: m.CRMCommandCenter })));
const CRMQuickLogModal = lazy(() => import("./components/crm/CRMQuickLogModal").then(m => ({ default: m.CRMQuickLogModal })));
const CRMCallPrepModal = lazy(() => import("./components/crm/CRMCallPrepModal").then(m => ({ default: m.CRMCallPrepModal })));
const CRMScheduleMeetingModal = lazy(() => import("./components/crm/CRMScheduleMeetingModal").then(m => ({ default: m.CRMScheduleMeetingModal })));
const CRMMeetingPrepModal = lazy(() => import("./components/crm/CRMMeetingPrepModal").then(m => ({ default: m.CRMMeetingPrepModal })));
const AIEmailComposerModal = lazy(() => import("./components/AIEmailComposerModal").then(m => ({ default: m.AIEmailComposerModal })));
const GlobalCopilot = lazy(() => import("./components/GlobalCopilot").then(m => ({ default: m.GlobalCopilot })));
const GlobalSearchModal = lazy(() => import("./components/GlobalSearchModal").then(m => ({ default: m.GlobalSearchModal })));
const UserLoginModal = lazy(() => import("./components/UserLoginModal").then(m => ({ default: m.UserLoginModal })));

const ViewLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-[350px] w-full" data-testid="view-loading-spinner">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-brand-deep border-t-transparent rounded-full animate-spin"></div>
      <span className="text-meta font-medium text-ink-dim">Loading Plasgain workspace...</span>
    </div>
  </div>
);

const MainLayout: React.FC = () => {
  const { activeTab, toast } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-paper font-ui text-body overflow-hidden selection:bg-brand-deep selection:text-white">
      {/* Ink rail — holds the logo ground */}
      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-paper">
        <Header onToggleMobileMenu={() => setMobileMenuOpen(true)} />

        {/* Dynamic Main Workspace Stage */}
        <main className={`flex-1 overflow-y-auto ${activeTab === "crm" ? "p-0" : "p-4 sm:p-6 lg:p-8"}`}>
          <div className={`${activeTab === "crm" ? "w-full min-w-0" : "max-w-7xl mx-auto w-full min-w-0"}`}>
            <ErrorBoundary area="This workspace" resetKey={activeTab}>
              <Suspense fallback={<ViewLoadingFallback />}>
                {activeTab === "home" && <HomeDashboard />}
                {activeTab === "crm" && <CRMCommandCenter />}
                {activeTab === "settings" && <SettingsView />}
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Interactive Overlays */}
      <ErrorBoundary area="This dialog">
      <Suspense fallback={null}>
        <AIEmailComposerModal />
        <UserLoginModal />
        <GlobalCopilot />
        <GlobalSearchModal />
        <CRMQuickLogModal />
        <CRMCallPrepModal />
        <CRMScheduleMeetingModal />
        <CRMMeetingPrepModal />
      </Suspense>
      </ErrorBoundary>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 left-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-edge shadow-lift border border-chrome-line bg-chrome text-chrome-text text-meta font-medium">
            {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-brand-lift shrink-0" />}
            {toast.type === "warning" && <AlertCircle className="w-4 h-4 text-soon-on-ink shrink-0" />}
            {toast.type === "error" && <XCircle className="w-4 h-4 text-urgent-on-ink shrink-0" />}
            {toast.type === "info" && <Info className="w-4 h-4 text-hold-on-ink shrink-0" />}
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
