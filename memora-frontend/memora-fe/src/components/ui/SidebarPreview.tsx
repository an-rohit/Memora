import { NavigationItem } from "./NavigationItem";

export interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

export interface SidebarPreviewProps {
  visible: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  items: NavItemConfig[];
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onLockSidebar: () => void;
  isDark?: boolean;
}

export function SidebarPreview({
  visible,
  onMouseEnter,
  onMouseLeave,
  items,
  activeTab,
  onSelectTab,
  onLockSidebar,
  isDark = true,
}: SidebarPreviewProps) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`fixed top-14 bottom-3.5 left-0 z-50 w-[245px] flex flex-col justify-between rounded-r-2xl border-y border-r p-3 shadow-2xl backdrop-blur-xl transition-all duration-200 ease-out ${
        isDark
          ? "bg-[#202020]/98 border-white/10 text-gray-200 shadow-[0_15px_40px_rgba(0,0,0,0.7)]"
          : "bg-[#F9F8F7]/98 border-gray-200 text-[#55534E] shadow-[0_15px_40px_rgba(0,0,0,0.12)]"
      } ${
        visible
          ? "opacity-100 translate-x-0 pointer-events-auto"
          : "opacity-0 -translate-x-full pointer-events-none"
      }`}
    >
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Floating Box Header */}
        <div className={`flex items-center justify-between px-2.5 py-1.5 mb-2 rounded-lg border ${
          isDark ? "bg-white/5 border-white/5" : "bg-white border-gray-200"
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded bg-purple-600/30 text-purple-600 flex items-center justify-center font-bold text-[10px] shrink-0">
              M
            </div>
            <span className={`text-xs font-semibold truncate ${isDark ? "text-gray-200" : "text-gray-800"}`}>
              Memora Vault
            </span>
          </div>

          {/* Expand / Lock Button */}
          <button
            type="button"
            onClick={onLockSidebar}
            className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Lock sidebar open (Ctrl+\)"
          >
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Lock Hint Badge */}
        <button
          type="button"
          onClick={onLockSidebar}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] font-medium text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all mb-2 cursor-pointer"
        >
          <span>Lock sidebar open</span>
          <kbd className="text-[9px] text-gray-400 bg-black/40 px-1.5 py-0.5 rounded font-mono border border-white/5">
            Ctrl+\
          </kbd>
        </button>

        {/* Navigation Items List */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-0.5">
          {items.map((item) => (
            <NavigationItem
              key={item.id}
              label={item.label}
              icon={item.icon}
              count={item.count}
              active={activeTab === item.id}
              onClick={() => onSelectTab(item.id)}
              isDark={isDark}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
