import { useState, useRef, useEffect } from "react";
import { HamburgerButton } from "./HamburgerButton";

export interface FilterCounts {
  all: number;
  video: number;
  twitter: number;
  pdf: number;
  article: number;
  has_note: number;
}

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
  title?: React.ReactNode;
  activeFilter?: string;
  onFilterChange?: (filterId: string) => void;
  filterCounts?: FilterCounts;
  onOpenTree?: () => void;
}

const FILTER_OPTIONS = [
  {
    id: "all",
    label: "All Content",
    icon: (
      <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    id: "video",
    label: "Videos",
    icon: (
      <img
        width="24"
        height="24"
        src="https://img.icons8.com/softteal-line/24/video.png"
        alt="video"
        className="w-3.5 h-3.5 object-contain brightness-110"
      />
    ),
  },
  {
    id: "twitter",
    label: "Tweets / X",
    icon: (
      <img
        width="50"
        height="50"
        src="https://img.icons8.com/ios/50/twitterx--v2.png"
        alt="twitterx"
        className="w-3.5 h-3.5 object-contain invert opacity-90"
      />
    ),
  },
  {
    id: "pdf",
    label: "PDF Documents",
    icon: (
      <img
        width="48"
        height="48"
        src="https://img.icons8.com/fluency-systems-regular/48/pdf-2.png"
        alt="pdf"
        className="w-3.5 h-3.5 object-contain invert brightness-110"
      />
    ),
  },
  {
    id: "article",
    label: "Articles & Links",
    icon: (
      <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    id: "has_note",
    label: "With Notes",
    icon: <span className="text-xs">📝</span>,
  },
];

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
  activeFilter = "all",
  onFilterChange,
  filterCounts,
  onOpenTree,
}: TopBarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isFilterOpen]);

  return (
    <header
      className={`w-full h-14 ${isDark ? "bg-[#191919]" : "bg-white"} px-4 flex items-center justify-between shrink-0 select-none transition-colors duration-300 ${className}`}
    >
      {/* Left: Far-left Hamburger Menu Icon */}
      <div className="flex items-center gap-0">
        <div className={`transition-all duration-300 relative group ${isSidebarOpen ? "opacity-0 pointer-events-none w-0 overflow-hidden" : "opacity-100 w-10"}`}>
          <HamburgerButton
            onClick={onHamburgerClick}
            onMouseEnter={onHamburgerMouseEnter}
            onMouseLeave={onHamburgerMouseLeave}
            isOpen={isSidebarOpen}
          />
          {/* Notion Tooltip on Hover */}
          <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 hidden group-hover:flex flex-col items-start z-50 pointer-events-none whitespace-nowrap px-2.5 py-1 rounded-lg bg-[#202022] border border-white/10 text-white shadow-xl animate-in fade-in zoom-in-95 duration-100">
            <span className="text-[11px] font-semibold leading-tight">Lock sidebar open</span>
            <span className="text-[9px] text-gray-400 font-mono">Ctrl+\</span>
          </div>
        </div>
        <div className={`text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
          isDark ? "text-gray-400 opacity-75 hover:opacity-100" : "text-gray-700 hover:text-gray-900"
        }`}>
          {title || "Dashboard"}
        </div>
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
        {/* Filter Option (on left side of Share) */}
        {onFilterChange && (
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer border flex items-center gap-1.5 active:scale-95 ${
                activeFilter !== "all"
                  ? (isDark 
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-xs" 
                      : "bg-purple-50 text-purple-700 border-purple-300 shadow-xs")
                  : (isDark 
                      ? "bg-[#202020] hover:bg-[#262626] text-gray-300 hover:text-white border-white/5" 
                      : "bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 border-gray-200 shadow-sm")
              }`}
              title="Filter Content"
            >
              <img
                width="50"
                height="50"
                src="https://img.icons8.com/ios/50/horizontal-settings-mixer--v1.png"
                alt="horizontal-settings-mixer--v1"
                className={`w-3.5 h-3.5 object-contain transition-transform ${
                  isDark ? "invert opacity-90" : "opacity-75"
                } ${isFilterOpen ? "rotate-90" : ""}`}
              />
              <span className="hidden sm:inline text-xs font-semibold">Filter</span>
              {activeFilter !== "all" && (
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              )}
            </button>

            {/* Filter Dropdown Popover */}
            {isFilterOpen && (
              <div
                className={`absolute right-0 top-full mt-2 w-56 rounded-2xl border shadow-2xl z-50 p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl ${
                  isDark 
                    ? "bg-[#1f1e1c]/95 border-white/10 text-gray-200 shadow-black/80" 
                    : "bg-white/95 border-gray-200 text-gray-800 shadow-xl"
                }`}
              >
                <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/5 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Filter Content
                  </span>
                  {activeFilter !== "all" && (
                    <button
                      type="button"
                      onClick={() => {
                        onFilterChange("all");
                        setIsFilterOpen(false);
                      }}
                      className="text-[10px] font-bold text-purple-400 hover:text-purple-300 cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {FILTER_OPTIONS.map((opt) => {
                  const isSelected = activeFilter === opt.id;
                  const count = filterCounts ? (filterCounts as unknown as Record<string, number>)[opt.id] : undefined;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onFilterChange(opt.id);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full px-2.5 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? (isDark 
                              ? "bg-purple-500/25 text-purple-200 font-semibold" 
                              : "bg-purple-100/70 text-purple-800 font-semibold")
                          : (isDark 
                              ? "hover:bg-white/[0.06] text-gray-300 hover:text-white" 
                              : "hover:bg-gray-100 text-gray-700 hover:text-gray-900")
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-4 h-4 flex items-center justify-center shrink-0">
                          {opt.icon}
                        </span>
                        <span className="truncate">{opt.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {count !== undefined && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                            isSelected 
                              ? (isDark ? "bg-purple-500/40 text-purple-200" : "bg-purple-200 text-purple-800")
                              : (isDark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500")
                          }`}>
                            {count}
                          </span>
                        )}
                        {isSelected && (
                          <svg className="w-3.5 h-3.5 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {onOpenTree && (
          <button
            type="button"
            onClick={onOpenTree}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
              isDark 
                ? "bg-[#202020] hover:bg-[#262626] text-gray-300 hover:text-white border-white/5" 
                : "bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 border-gray-200 shadow-sm"
            }`}
            title="Open Folder Tree Directory"
          >
            <svg className="w-3.5 h-3.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 2H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
              <path d="M2 10h20" />
            </svg>
            <span className="hidden sm:inline">Tree</span>
          </button>
        )}

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
