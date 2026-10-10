import { HamburgerButton } from "./HamburgerButton";

export interface TopBarProps {
  onHamburgerClick: () => void;
  onHamburgerMouseEnter: () => void;
  onHamburgerMouseLeave: () => void;
  isSidebarOpen: boolean;
  onAddMemory?: () => void;
  onShareBrain?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  className?: string;
  isDark?: boolean;
  title?: string;
}

export function TopBar({
  onHamburgerClick,
  onHamburgerMouseEnter,
  onHamburgerMouseLeave,
  isSidebarOpen,
  onAddMemory,
  onShareBrain,
  searchQuery,
  onSearchChange,
  className = "",
  isDark = true,
  title,
}: TopBarProps) {
  return (
    <header
      className={`w-full h-14 ${isDark ? "bg-[#191919]" : "bg-white"} px-4 flex items-center justify-between shrink-0 select-none transition-colors duration-300 ${className}`}
    >
      {/* Left: Far-left Hamburger Menu Icon */}
      <div className="flex items-center gap-0">
        <div className={`transition-all duration-300 ${isSidebarOpen ? "opacity-0 pointer-events-none w-0 overflow-hidden" : "opacity-100 w-10"}`}>
          <HamburgerButton
            onClick={onHamburgerClick}
            onMouseEnter={onHamburgerMouseEnter}
            onMouseLeave={onHamburgerMouseLeave}
            isOpen={isSidebarOpen}
          />
        </div>
        <span className="text-sm font-medium text-gray-400 opacity-75 hover:opacity-100 transition-all whitespace-nowrap">
          {title || "Dashboard"}
        </span>
      </div>

      {/* Center / Rest of Top Bar: Empty and Distraction-Free */}
      <div className="flex-1 max-w-sm mx-auto px-4">
        {onSearchChange && (
          <div className="relative w-full">
            <input
              type="text"
              value={searchQuery || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Type to search..."
              className={`w-full border rounded-md px-8 py-1.5 text-sm focus:outline-none transition-all ${
                isDark 
                  ? "bg-[#202020] border-white/5 text-gray-200 placeholder-gray-500 focus:border-white/20" 
                  : "bg-gray-100 border-transparent text-gray-900 placeholder-gray-400 focus:bg-white focus:border-purple-300 focus:ring-1 focus:ring-purple-300"
              }`}
            />
            <svg
              className="w-4 h-4 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        )}
      </div>

      {/* Right: Subtle Actions */}
      <div className="flex items-center gap-2">
        {!title && onShareBrain && (
          <button
            type="button"
            onClick={onShareBrain}
            className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer border ${
              isDark 
                ? "bg-[#202020] hover:bg-[#262626] text-gray-300 hover:text-white border-white/5" 
                : "bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 border-gray-200 shadow-sm"
            }`}
            title="Share Brain Link"
          >
            Share
          </button>
        )}

        {!title && onAddMemory && (
          <button
            type="button"
            onClick={onAddMemory}
            className="px-4 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer border-none flex items-center gap-1.5 active:scale-95 bg-[#7164C0] hover:bg-[#7F73C6] text-white shadow-sm"
          >
            <span>+</span>
            <span>Add</span>
          </button>
        )}
      </div>
    </header>
  );
}
