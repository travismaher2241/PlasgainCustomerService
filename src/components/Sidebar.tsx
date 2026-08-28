import React from "react";
import {
  Home,
  FilePlus2,
  SearchCode,
  KanbanSquare,
  BookOpen,
  Wrench,
  SlidersHorizontal,
  X
} from "lucide-react";
import { useApp, NavTab, initialsOf } from "../context/AppContext";
import { PlasgainLockup } from "./PlasgainMark";

interface SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { activeTab, setActiveTab, currentUser } = useApp();
  const sidebarRef = React.useRef<HTMLElement>(null);
  const previouslyFocusedElementRef = React.useRef<HTMLElement | null>(null);

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
    { id: "new-enquiry", label: "New Enquiry", icon: FilePlus2 },
    { id: "product-finder", label: "Product Finder", icon: SearchCode },
    { id: "documents", label: "Product Catalogues", icon: BookOpen },
    { id: "tools", label: "Tools", icon: Wrench },
    { id: "settings", label: "Settings", icon: SlidersHorizontal }
  ];

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
        className={`w-58 bg-chrome border-r border-chrome-line flex flex-col shrink-0 h-screen sticky top-0 transition-transform duration-200 z-50 ${
          mobileOpen ? "fixed inset-y-0 left-0 translate-x-0 shadow-2xl" : "hidden md:flex"
        }`}
      >
        {/* Brand lockup */}
        <div className="px-4.5 pt-5.5 pb-6 flex items-start justify-between">
          <PlasgainLockup />

          {setMobileOpen && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
              className="md:hidden text-chrome-dim hover:text-chrome-text p-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none rounded-edge"
              title="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-px px-2.5 overflow-y-auto">
        {/* chrome-dim, not body-faint: this label sits on ink, not on paper. */}
        <div className="u-eyebrow px-2 pb-2 text-[0.625rem] tracking-[0.16em] text-chrome-dim">
          Workspace
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={`group flex items-center gap-2.5 px-2 py-2 rounded-edge text-meta text-left cursor-pointer border-l-2 transition-colors ${
                isActive
                  ? "bg-chrome-raised text-chrome-text border-l-brand font-semibold"
                  : "text-chrome-dim border-l-transparent font-medium hover:bg-chrome-raised hover:text-chrome-text"
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? "text-brand-lift" : "text-chrome-dim group-hover:text-chrome-text"
                }`}
              />
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
            </button>
          );
        })}
      </nav>

      {/* Who is signed in */}
      <div className="mt-auto mx-4.5 py-3.5 border-t border-chrome-line flex items-center gap-2.5">
        <div className="u-data w-7.5 h-7.5 rounded-[2px] bg-brand-deep text-white flex items-center justify-center text-spec font-semibold shrink-0">
          {initialsOf(currentUser.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-meta font-semibold text-chrome-text truncate leading-tight">
            {currentUser.name.trim() || "Unnamed user"}
          </div>
          <div className="u-data text-[0.625rem] text-chrome-dim truncate">
            {[currentUser.role, currentUser.location].filter((v) => v.trim()).join(" · ") ||
              "No role set"}
          </div>
        </div>
      </div>
    </aside>
    </>
  );
};
