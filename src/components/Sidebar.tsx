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
  Sun,
  X
} from "lucide-react";
import { useApp, NavTab } from "../context/AppContext";

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
    badgeColor?: string;
  }[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "crm", label: "CRM Command Centre", icon: KanbanSquare, badge: "CRM", badgeColor: "bg-emerald-400 text-emerald-950" },
    { id: "new-enquiry", label: "New Enquiry", icon: FilePlus2, badge: "AI", badgeColor: "bg-emerald-400 text-emerald-950" },
    { id: "product-finder", label: "Product Finder", icon: SearchCode },
    { id: "opportunities", label: "Opportunities", icon: KanbanSquare, badge: opportunities.length, badgeColor: "bg-emerald-800/80 text-emerald-100" },
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
      className={`w-64 bg-[#064E3B] text-emerald-50 flex flex-col shrink-0 h-screen sticky top-0 transition-transform duration-200 z-50 ${
        mobileOpen
          ? "fixed inset-y-0 left-0 translate-x-0"
          : "hidden md:flex"
      }`}
    >
      {/* Brand Header */}
      <div className="p-6 mb-1 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-700/80 flex items-center justify-center text-amber-300 font-black shadow-xs">
              <Sun className="w-5 h-5" />
            </div>
            <div className="text-xl font-bold tracking-tight text-white">PLASGAIN</div>
          </div>
          <div id="sidebar-brand-subtitle" className="text-[10px] font-bold tracking-wider uppercase mt-1 text-emerald-200">
            CUSTOMER SERVICE <span className="text-amber-300">SIDEKICK</span>
          </div>
        </div>

        {setMobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-emerald-300 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 flex flex-col gap-1 px-3 overflow-y-auto">
        <div className="px-3 pb-2 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/60">
            Workspace
          </span>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                isActive
                  ? "bg-emerald-900/60 text-white shadow-xs font-semibold"
                  : "text-emerald-100/80 hover:bg-emerald-800/40 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                {isActive ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                ) : (
                  <Icon className="w-4 h-4 text-emerald-300/70 shrink-0" />
                )}
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    item.badgeColor || "bg-emerald-800 text-emerald-200"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-emerald-800/50 bg-[#043d2e]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-xs text-white shrink-0">
            SR
          </div>
          <div className="text-xs min-w-0 flex-1">
            <div className="font-semibold text-white truncate">Sarah Reed</div>
            <div className="text-[11px] text-emerald-300/70 truncate">Internal Sales • Melbourne HQ</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
