import React from "react";
import {
  Home,
  FilePlus2,
  SearchCode,
  MessageSquareQuote,
  KanbanSquare,
  FileText,
  Wrench,
  GraduationCap,
  SlidersHorizontal
} from "lucide-react";
import { useApp, NavTab } from "../context/AppContext";

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab, opportunities } = useApp();

  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number | string }[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "new-enquiry", label: "New Enquiry", icon: FilePlus2, badge: "AI" },
    { id: "product-finder", label: "Product Finder", icon: SearchCode },
    { id: "ask-plasgain", label: "Ask Plasgain", icon: MessageSquareQuote },
    { id: "opportunities", label: "Opportunities", icon: KanbanSquare, badge: opportunities.length },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "tools", label: "Tools", icon: Wrench },
    { id: "learn", label: "Learn", icon: GraduationCap },
    { id: "settings", label: "Settings", icon: SlidersHorizontal }
  ];

  return (
    <nav className="bg-stone-50 border-b border-stone-200 sticky top-16 z-30 overflow-x-auto scrollbar-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 sm:space-x-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? "bg-white text-emerald-900 border border-stone-300 shadow-xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 border border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-emerald-800" : "text-stone-500"}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-stone-200 text-stone-600"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
