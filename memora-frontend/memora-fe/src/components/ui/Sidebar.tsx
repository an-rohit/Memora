import { NavigationItem } from "./NavigationItem";
import { ProfileMenu } from "./ProfileMenu";
import { Logo } from "../../icons/logo";
import type { Content } from "../../types/content";
import { useState } from "react";

export interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

export interface SidebarProps {
  open: boolean;
  onClose: () => void;
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  items: NavItemConfig[];
  isDark?: boolean;
  onToggleTheme?: () => void;
  currentWorkspace?: string;
  onWorkspaceSelect?: (workspaceId: string) => void;
  sharedBrains?: Content[];
}

export function Sidebar({
  open,
  onClose,
  activeTab,
  onSelectTab,
  items,
  isDark = true,
  onToggleTheme,
  currentWorkspace = "personal",
  onWorkspaceSelect,
  sharedBrains = [],
}: SidebarProps) {
  const [sharedExpanded, setSharedExpanded] = useState(true);
  const [workspaceSearch, setWorkspaceSearch] = useState("");

  const filteredSharedBrains = sharedBrains.filter(b => 
    b.title.toLowerCase().includes(workspaceSearch.toLowerCase())
  );
  return (
    <>
      {/* Mobile/Tablet Backdrop Overlay */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-200 lg:hidden"
        />
      )}

      {/* Main Locked Sidebar Panel */}
      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 z-40 w-[260px] ${
          isDark ? "bg-[#202020] text-gray-200 border-white/5" : "bg-[#F9F8F7] text-[#55534E] border-gray-200"
        } border-r flex flex-col justify-between shrink-0 transition-all duration-300 ease-out ${
          open ? "translate-x-0 lg:ml-0" : "-translate-x-full lg:translate-x-0 lg:-ml-[260px]"
        }`}
      >
        {/* Header / Brand & Unlock Toggle */}
        <div className={`flex items-center justify-between h-14 px-4 shrink-0`}>
          <a href="/dashboard" className="flex items-center gap-3 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7164C0] text-white shadow-sm">
              <Logo className="w-4 h-4" />
            </div>
            <div>
              <span className={`text-sm font-bold tracking-tight block ${isDark ? "text-white" : "text-[#55534E]"}`}>
                Memora
              </span>
            </div>
          </a>

          <div className="flex items-center gap-1">
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  isDark ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-800 hover:bg-gray-200"
                }`}
                title="Toggle Theme"
              >
                {isDark ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                isDark ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-800 hover:bg-gray-200"
              }`}
              title="Close / Unlock sidebar (Ctrl+\)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation Items List */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
          <div className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Workspace
          </div>

          {items.map((item) => (
            <NavigationItem
              key={item.id}
              label={item.label}
              icon={item.icon}
              count={item.count}
              active={activeTab === item.id && currentWorkspace === "personal"}
              onClick={() => {
                onSelectTab(item.id);
                if (onWorkspaceSelect) onWorkspaceSelect("personal");
              }}
              isDark={isDark}
            />
          ))}

          {/* Shared Workspaces Accordion */}
          <div className="mt-4">
            <div 
              className={`flex items-center justify-between px-3 pt-2 pb-1.5 cursor-pointer group ${isDark ? "hover:bg-white/5" : "hover:bg-gray-100"} rounded-md transition-colors`}
              onClick={() => setSharedExpanded(!sharedExpanded)}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Shared With Me
              </div>
              <svg 
                className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${sharedExpanded ? "rotate-180" : ""}`} 
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {sharedExpanded && (
              <div className="mt-1 flex flex-col gap-1">
                {sharedBrains.length > 5 && (
                  <div className="px-2 mb-1">
                    <input 
                      type="text" 
                      placeholder="Filter connections..." 
                      value={workspaceSearch}
                      onChange={(e) => setWorkspaceSearch(e.target.value)}
                      className={`w-full text-xs px-2.5 py-1.5 rounded-md border focus:outline-none transition-colors ${
                        isDark 
                          ? "bg-[#252525] border-white/5 text-gray-300 placeholder-gray-600 focus:border-purple-500/50" 
                          : "bg-white border-gray-200 text-gray-700 placeholder-gray-400 focus:border-purple-400"
                      }`}
                    />
                  </div>
                )}
                
                {filteredSharedBrains.length === 0 && (
                  <div className="px-3 py-2 text-xs text-gray-500 italic">
                    {workspaceSearch ? "No matches found" : "No shared brains yet"}
                  </div>
                )}

                {filteredSharedBrains.map((brain) => (
                  <div
                    key={brain._id}
                    onClick={() => {
                      if (onWorkspaceSelect) {
                        const hash = brain.link.split("/share/")[1];
                        if (hash) onWorkspaceSelect(hash);
                      }
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 group ${
                      currentWorkspace === brain.link.split("/share/")[1]
                        ? isDark 
                          ? "bg-emerald-500/10 text-emerald-400" 
                          : "bg-emerald-50 text-emerald-700 font-medium"
                        : isDark
                          ? "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold uppercase shrink-0 ${
                      currentWorkspace === brain.link.split("/share/")[1]
                        ? isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-700"
                        : isDark ? "bg-white/10 text-gray-400 group-hover:text-gray-200" : "bg-gray-200 text-gray-600 group-hover:text-gray-900"
                    }`}>
                      {brain.title ? brain.title.charAt(0) : "?"}
                    </div>
                    <span className="text-sm truncate select-none">
                      {brain.title || "Unknown Brain"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer / Profile Menu */}
        <div className="p-3 border-t border-white/5 shrink-0">
          <ProfileMenu />
        </div>
      </aside>
    </>
  );
}
