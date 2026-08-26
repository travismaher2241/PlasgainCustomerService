import React from "react";
import {
  Home,
  FilePlus2,
  SearchCode,
  KanbanSquare,
  BookOpen,
  Wrench,
  GraduationCap,
  SlidersHorizontal,
  X
} from "lucide-react";
import { useApp, NavTab } from "../context/AppContext";
import { PlasgainLockup } from "./PlasgainMark";

interface SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { activeTab, setActiveTab, opportunities } = useApp();

  const navItems: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
  }[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "crm", label: "CRM Command Centre", icon: KanbanSquare },
    { id: "new-enquiry", label: "New Enquiry", icon: FilePlus2, badge: "AI" },
    { id: "product-finder", label: "Product Finder", icon: SearchCode },
    { id: "opportunities", label: "Opportunities", icon: KanbanSquare, badge: opportunities.length },
    { id: "documents", label: "Product Catalogues", icon: BookOpen },
    { id: "tools", label: "Tools", icon: Wrench },
    { id: "learn", label: "Learn", icon: GraduationCap },
    { id: "settings", label: "Settings", icon: SlidersHorizontal }
  ];

  const handleSelect = (tab: NavTab) => {
    setActiveTab(tab);
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  };

  return (
    <aside
      className={`w-58 bg-chrome border-r border-chrome-line flex flex-col shrink-0 h-screen sticky top-0 transition-transform duration-200 z-50 ${
        mobileOpen ? "fixed inset-y-0 left-0 translate-x-0" : "hidden md:flex"
      }`}
    >
      {/* Brand lockup */}
      <div className="px-4.5 pt-5.5 pb-6 flex items-start justify-between">
        <PlasgainLockup />

        {setMobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-chrome-dim hover:text-chrome-text p-1 cursor-pointer"
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
          SR
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-meta font-semibold text-chrome-text truncate leading-tight">
            Sarah Reed
          </div>
          <div className="u-data text-[0.625rem] text-chrome-dim truncate">
            Internal Sales · Melbourne
          </div>
        </div>
      </div>
    </aside>
  );
};
