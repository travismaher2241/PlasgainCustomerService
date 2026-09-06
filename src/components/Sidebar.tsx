import React from "react";
import {
  Home,
  KanbanSquare,
  SlidersHorizontal,
  X,
  LogIn,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Building2,
  Kanban,
  Calendar,
  Flame,
  CheckCircle2,
  TrendingUp,
  Trophy
} from "lucide-react";
import { useApp, NavTab, CRMSubTab, initialsOf } from "../context/AppContext";
import { countOutstandingQuotes } from "../utils/winLossPatterns";
import { PlasgainLockup, PlasgainMark } from "./PlasgainMark";

interface SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    openLoginModal,
    isSidebarCollapsed,
    toggleSidebar,
    openEmailComposer,
    setIsCopilotOpen,
    activeCRMTab,
    setActiveCRMTab,
    crmOpportunities
  } = useApp();

  const outstandingQuotesCount = countOutstandingQuotes(crmOpportunities);
  const sidebarRef = React.useRef<HTMLElement>(null);
  const previouslyFocusedElementRef = React.useRef<HTMLElement | null>(null);

  // Keyboard shortcut (Ctrl+B or Cmd+B) to toggle sidebar on desktop
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [toggleSidebar]);

  // Focus management, focus trap, lock body scroll and listen for Escape key when mobile menu is open (P1-12)
  React.useEffect(() => {
    if (mobileOpen) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = "hidden";

      // Focus first interactive element inside drawer
      const timer = setTimeout(() => {
        if (sidebarRef.current) {
          const focusable = sidebarRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0) {
            focusable[0].focus();
          }
        }
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setMobileOpen?.(false);
          return;
        }

        // Focus trap inside drawer
        if (e.key === "Tab" && sidebarRef.current) {
          const focusable = (
            Array.from(
              sidebarRef.current.querySelectorAll(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
              )
            ) as HTMLElement[]
          ).filter((el: HTMLElement) => el.offsetParent !== null);

          if (focusable.length === 0) return;

          const firstElement = focusable[0];
          const lastElement = focusable[focusable.length - 1];

          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
        if (previouslyFocusedElementRef.current && typeof previouslyFocusedElementRef.current.focus === "function") {
          previouslyFocusedElementRef.current.focus();
        }
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [mobileOpen, setMobileOpen]);

  const navItems: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
  }[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "crm", label: "CRM Command Centre", icon: KanbanSquare },
    { id: "settings", label: "Settings", icon: SlidersHorizontal }
  ];

  /*
    Every CRM destination lives here as well as in the bar at the top of the
    workspace. The bar can only hold two or three on a phone, and putting the
    rest behind a "More" dropdown meant hunting for them while this menu sat
    mostly empty. This is the full list, always.
  */
  const crmDestinations: {
    id: CRMSubTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: "today", label: "Today", icon: Sun },
    { id: "accounts", label: "Accounts", icon: Building2 },
    { id: "pipeline", label: "Outstanding Quotes", icon: Kanban, badge: outstandingQuotesCount },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "leads", label: "Leads", icon: Flame },
    { id: "tasks", label: "Tasks", icon: CheckCircle2 },
    { id: "competitor-pricing", label: "Competitors", icon: TrendingUp },
    { id: "win-patterns", label: "Win patterns", icon: Trophy }
  ];

  const handleSelectCRM = (crmTab: CRMSubTab) => {
    setActiveTab("crm");
    setActiveCRMTab(crmTab);
    if (setMobileOpen) setMobileOpen(false);
  };

  const handleSelect = (tab: NavTab) => {
    setActiveTab(tab);
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  };

  return (
    <>
      {/* Blocking Backdrop Overlay for Mobile Drawer (P1-12) */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen?.(false)}
          className="fixed inset-0 bg-chrome/70 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-150"
          aria-hidden="true"
        />
      )}

      <aside
        ref={sidebarRef}
        role={mobileOpen ? "dialog" : "navigation"}
        aria-modal={mobileOpen ? "true" : undefined}
        aria-label="Main Navigation"
        className={`bg-chrome border-r border-chrome-line flex flex-col shrink-0 h-screen sticky top-0 transition-[width,transform] duration-200 ease-in-out z-50 ${
          mobileOpen
            ? "w-72 max-w-[calc(100vw-3rem)] fixed inset-y-0 left-0 translate-x-0 shadow-2xl"
            : isSidebarCollapsed
            ? "hidden md:flex w-16"
            : "hidden md:flex w-58"
        }`}
      >
        {/* Brand lockup & collapse toggle */}
        <div className={`pt-5.5 pb-6 flex items-center ${isSidebarCollapsed && !mobileOpen ? "px-2.5 justify-center flex-col gap-3" : "px-4.5 justify-between gap-3"}`}>
          {isSidebarCollapsed && !mobileOpen ? (
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-1 text-chrome-dim hover:text-brand-lift cursor-pointer rounded-edge transition-colors"
              title="Expand sidebar (Ctrl+B)"
              aria-label="Expand sidebar"
            >
              <PlasgainMark className="w-7 h-7 text-brand" />
            </button>
          ) : (
            <PlasgainLockup />
          )}

          {/* Desktop collapse toggle button */}
          {!mobileOpen && (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={isSidebarCollapsed ? "Expand sidebar menu" : "Collapse sidebar menu"}
              title={isSidebarCollapsed ? "Expand menu (Ctrl+B)" : "Slide menu out of way (Ctrl+B)"}
              className="hidden md:flex text-chrome-dim hover:text-chrome-text p-1.5 cursor-pointer hover:bg-chrome-line/40 rounded-edge transition-colors"
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-chrome-dim hover:text-chrome-text" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-chrome-dim hover:text-chrome-text" />
              )}
            </button>
          )}

          {/* Mobile close button */}
          {setMobileOpen && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
              className="md:hidden text-chrome-dim hover:text-chrome-text p-1.5 cursor-pointer hover:bg-chrome-line/60 active:bg-chrome-line focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none rounded-edge transition-colors shrink-0 flex items-center justify-center"
              title="Close menu"
            >
              <X className="w-5 h-5 shrink-0" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 flex flex-col gap-px overflow-y-auto ${isSidebarCollapsed && !mobileOpen ? "px-2" : "px-2.5"}`}>
          {!isSidebarCollapsed || mobileOpen ? (
            <div className="u-eyebrow px-2 pb-2 text-[0.625rem] tracking-[0.16em] text-chrome-dim">
              Workspace
            </div>
          ) : (
            <div className="h-2" />
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isCollapsedMode = isSidebarCollapsed && !mobileOpen;

            const button = (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                aria-current={isActive ? "page" : undefined}
                title={isCollapsedMode ? item.label : undefined}
                aria-label={item.label}
                className={`group flex items-center rounded-edge text-meta text-left cursor-pointer transition-colors relative ${
                  isCollapsedMode
                    ? "justify-center p-2.5 my-0.5"
                    : "gap-2.5 px-2 py-2 border-l-2"
                } ${
                  isActive
                    ? isCollapsedMode
                      ? "bg-brand-deep text-white shadow-xs"
                      : "bg-chrome-raised text-chrome-text border-l-brand font-semibold"
                    : isCollapsedMode
                    ? "text-chrome-dim hover:bg-chrome-raised hover:text-chrome-text"
                    : "text-chrome-dim border-l-transparent font-medium hover:bg-chrome-raised hover:text-chrome-text"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive
                      ? isCollapsedMode
                        ? "text-white"
                        : "text-brand-lift"
                      : "text-chrome-dim group-hover:text-chrome-text"
                  }`}
                />
                {(!isSidebarCollapsed || mobileOpen) && (
                  <>
                    <span className="truncate">{item.label}</span>

                    {item.badge !== undefined && (
                      <span
                        className={`u-data ml-auto text-[0.625rem] leading-none px-1.5 py-1 rounded-[2px] ${
                          typeof item.badge === "string"
                            ? "text-brand-lift tracking-[0.06em]"
                            : "bg-chrome-line text-chrome-text"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}

                {/* Collapsed badge dot */}
                {isCollapsedMode && item.badge !== undefined && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-lift" />
                )}
              </button>
            );

            // The CRM destinations belong directly under the workspace they
            // are part of, not after Settings.
            if (item.id !== "crm") return button;

            return (
              <React.Fragment key={item.id}>
                {button}
          {/* CRM destinations, nested under the workspace they belong to. */}
                {(() => {
                  const isCollapsedRail = isSidebarCollapsed && !mobileOpen;
                  return (
            <ul
              className={
                isCollapsedRail
                  ? "mt-0.5 mb-1 space-y-0.5"
                  : "mt-0.5 mb-1 ml-4 pl-2 border-l border-chrome-line/70 space-y-0.5"
              }
            >
              {crmDestinations.map((dest) => {
                const DestIcon = dest.icon;
                const isActive = activeTab === "crm" && activeCRMTab === dest.id;
                return (
                  <li key={dest.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectCRM(dest.id)}
                      aria-current={isActive ? "page" : undefined}
                      title={isCollapsedRail ? dest.label : undefined}
                      aria-label={dest.label}
                      className={`group w-full flex items-center rounded-edge text-meta cursor-pointer transition-colors ${
                        isCollapsedRail
                          ? "justify-center p-2 relative"
                          : "gap-2.5 px-2 min-h-[40px] text-left"
                      } ${
                        isActive
                          ? isCollapsedRail
                            ? "bg-brand-deep text-white"
                            : "bg-chrome-raised text-chrome-text font-semibold"
                          : "text-chrome-dim font-medium hover:bg-chrome-raised hover:text-chrome-text"
                      }`}
                    >
                      <DestIcon
                        className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                          isActive
                            ? isCollapsedRail
                              ? "text-white"
                              : "text-brand-lift"
                            : "text-chrome-dim group-hover:text-chrome-text"
                        }`}
                      />
                      {!isCollapsedRail && (
                        <>
                          <span className="truncate">{dest.label}</span>
                          {dest.badge !== undefined && dest.badge > 0 && (
                            <span className="u-data ml-auto text-[0.625rem] leading-none px-1.5 py-1 rounded-[2px] bg-chrome-line text-chrome-text">
                              {dest.badge}
                            </span>
                          )}
                        </>
                      )}
                      {isCollapsedRail && dest.badge !== undefined && dest.badge > 0 && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-brand-lift" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
                  );
                })()}
              </React.Fragment>
            );
          })}

          {/* Mobile-only AI Quick Actions (P2: Expose AI email & copilot on mobile) */}
          {mobileOpen && (
            <div className="pt-3 mt-2 border-t border-chrome-line/60 space-y-1.5 px-1">
              <div className="u-eyebrow px-1 pb-1 text-[0.625rem] tracking-[0.16em] text-chrome-dim uppercase">
                AI Assistants
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen?.(false);
                  openEmailComposer();
                }}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-edge text-meta font-medium text-brand-lift bg-brand-deep/20 hover:bg-brand-deep/30 border border-brand-lift/20 cursor-pointer transition-colors text-left"
              >
                <div className="w-4 h-4 text-brand-lift">✨</div>
                <span>Write AI Email</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen?.(false);
                  setIsCopilotOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-edge text-meta font-medium text-chrome-text hover:bg-chrome-line/40 border border-chrome-line cursor-pointer transition-colors text-left"
              >
                <div className="w-4 h-4 text-chrome-dim">💬</div>
                <span>Ask Global Copilot</span>
              </button>
            </div>
          )}
        </nav>

        {/* Who is signed in / Switch User button */}
        <div className={`mt-auto border-t border-chrome-line py-3.5 ${isSidebarCollapsed && !mobileOpen ? "px-2 flex justify-center" : "mx-4.5"}`}>
          <button
            type="button"
            onClick={() => {
              openLoginModal();
              if (setMobileOpen) setMobileOpen(false);
            }}
            className={`w-full flex items-center rounded-edge hover:bg-chrome-line/40 transition-colors text-left group cursor-pointer ${
              isSidebarCollapsed && !mobileOpen ? "justify-center p-1" : "gap-2.5 p-1.5 -mx-1.5"
            }`}
            title="Switch user account or update details"
            aria-label={`Signed in as ${currentUser.name}`}
          >
            <div className="u-data w-7.5 h-7.5 rounded-[2px] bg-brand-deep text-white flex items-center justify-center text-spec font-semibold shrink-0 group-hover:bg-brand transition-colors">
              {initialsOf(currentUser.name)}
            </div>
            {(!isSidebarCollapsed || mobileOpen) && (
              <div className="min-w-0 flex-1">
                <div className="text-meta font-semibold text-chrome-text truncate leading-tight flex items-center justify-between">
                  <span className="truncate">{currentUser.name.trim() || "Unnamed user"}</span>
                  <LogIn className="w-3.5 h-3.5 text-chrome-dim opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
                </div>
                <div className="u-data text-[0.625rem] text-chrome-dim truncate">
                  {[currentUser.role, currentUser.location].filter((v) => v.trim()).join(" · ") ||
                    "No role set"}
                </div>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
