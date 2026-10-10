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
      className={`fixed top-12 left-3 z-50 w-[260px] max-h-[85vh] overflow-y-auto ${
        isDark ? "bg-[#202020] border-white/10" : "bg-[#F9F8F7] border-gray-200"
      } border rounded-xl p-3 shadow-2xl transition-all duration-200 ease-out flex flex-col justify-between ${
        visible
          ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
          : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
      }`}
    >
      <div>
        {/*Floating Box Header */}
        <div className={`flex items-center justify-between px-2.5 py-1.5 mb-2 rounded-lg border ${
          isDark ? "bg-white/5 border-white/5" : "bg-white border-gray-200"
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded bg-purple-600/30 text-purple-600 flex items-center justify-center font-bold text-[10px]">
              M
            </div>
            <span className={`text-xs font-semibold truncate ${isDark ? "text-gray-200" : "text-gray-800"}`}>Memora Vault</span>
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

        <div className="flex flex-col gap-0.5">
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
