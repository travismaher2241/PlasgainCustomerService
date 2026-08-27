import React from "react";
import {
  Home,
  FilePlus2,
  SearchCode,
  MessageSquareQuote,
  KanbanSquare,
  FileText,
  Wrench,
  SlidersHorizontal
} from "lucide-react";
import { useApp, NavTab } from "../context/AppContext";

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number | string }[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "crm", label: "CRM", icon: KanbanSquare },
    { id: "new-enquiry", label: "New Enquiry", icon: FilePlus2, badge: "AI" },
    { id: "product-finder", label: "Product Finder", icon: SearchCode },
    { id: "ask-plasgain", label: "Ask Plasgain", icon: MessageSquareQuote },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "tools", label: "Tools", icon: Wrench },
    { id: "settings", label: "Settings", icon: SlidersHorizontal }
  ];

  return (
    <nav className="bg-raised border-b border-line sticky top-16 z-30 overflow-x-auto scrollbar-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 sm:space-x-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-edge text-meta sm:text-body font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? "bg-white text-brand-deep border border-line-strong shadow-xs"
                    : "text-ink-dim hover:text-ink hover:bg-line border border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-brand-deep" : "text-ink-dim"}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`text-spec font-bold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-brand-wash text-brand-deep"
                        : "bg-line text-ink-dim"
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
