import { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { Content } from "../types/content";
import type { Collection } from "../types/collection";
import { TopBar, type FilterCounts } from "../components/ui/TopBar";
import { Sidebar, type NavItemConfig } from "../components/ui/Sidebar";
import { SidebarPreview } from "../components/ui/SidebarPreview";
import { Card } from "../components/ui/Card";
import { CreateContentModal } from "../components/ui/createContentModel";
import { CollectionsHub } from "../components/collections/CollectionsHub";
import { CollectionModal } from "../components/collections/CollectionModal";
import { ShareCollectionModal } from "../components/collections/ShareCollectionModal";
import { CollectionIcon, DEFAULT_COLLECTION_ICON } from "../components/collections/CollectionIcon";
import { FolderTreeDrawer } from "../components/collections/FolderTreeDrawer";
import { EmptyState } from "../components/ui/EmptyState";
import { Toast } from "../components/ui/Toast";
import { useContent } from "../hooks/useContent";
import { useCollections } from "../hooks/useCollections";
import axios from "axios";
import { BACKEND_URL } from "../config";

export function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("home");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [currentWorkspace, setCurrentWorkspace] = useState<string>("personal");
  const [sharedWorkspaceData, setSharedWorkspaceData] = useState<{ username: string; content: Content[] } | null>(null);
  const [sharedWorkspaceLoading, setSharedWorkspaceLoading] = useState(false);
  const [sharedWorkspaceError, setSharedWorkspaceError] = useState<string | null>(null);

  // Collections State
  const {
    collections,
    refreshCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    shareCollection,
  } = useCollections();

  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [isShareCollectionModalOpen, setIsShareCollectionModalOpen] = useState(false);
  const [sharingCollection, setSharingCollection] = useState<Collection | null>(null);
  const [isTreeDrawerOpen, setIsTreeDrawerOpen] = useState(false);
  const [highlightedCardId, setHighlightedCardId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();

  // Unified collection navigator that updates both state and browser history
  const navigateToCollection = (col: Collection | null) => {
    setSelectedCollection(col);
    setActiveTab("collections");
    if (col) {
      setSearchParams({ c: col._id });
    } else {
      setSearchParams({});
    }
  };

  // Sync browser Back / Forward navigation with active collection
  useEffect(() => {
    const colId = searchParams.get("c");
    if (colId) {
      const matched = collections.find((c) => c._id === colId);
      if (matched && matched._id !== selectedCollection?._id) {
        setSelectedCollection(matched);
        setActiveTab("collections");
      }
    } else if (activeTab === "collections" && selectedCollection) {
      setSelectedCollection(null);
    }
  }, [searchParams, collections]);

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved !== "light";
  });

  useEffect(() => {
    localStorage.setItem("theme", isDark ? "dark" : "light");
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const { contents, refresh, loading } = useContent();
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (currentWorkspace !== "personal") {
      setSharedWorkspaceLoading(true);
      setSharedWorkspaceError(null);
      axios.get(`${BACKEND_URL}/api/v1/content/${currentWorkspace}`)
        .then((result) => {
          setSharedWorkspaceData(result.data);
        })
        .catch((err) => {
          setSharedWorkspaceError(err?.response?.data?.message || "Failed to load shared brain");
        })
        .finally(() => {
          setSharedWorkspaceLoading(false);
        });
    } else {
      setSharedWorkspaceData(null);
    }
  }, [currentWorkspace]);

  // Keyboard shortcut: Ctrl+\ or Cmd+\ toggles sidebar (shortcut)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "\\") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Hover preview handlers with micro delay
  const handleHamburgerMouseEnter = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      if (!sidebarOpen) setPreviewOpen(true);
    }, 150);
  };

  const handleHamburgerMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setPreviewOpen(false);
    }, 200);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  async function handleDelete(contentId: string) {
    try {
      await axios.delete(`${BACKEND_URL}/api/v1/content/${contentId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      showToast("Memory deleted successfully");
      refresh();
    } catch (err) {
      console.error("Delete failed", err);
    }
  }

  async function handleShare() {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/v1/content/share`,
        { share: true },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const shareUrl = `${window.location.origin}${response.data.link}`;
      await navigator.clipboard.writeText(shareUrl);
      showToast("Brain Share link copied to clipboard");
    } catch (err) {
      console.error("Share failed", err);
    }
  }

  async function handleMoveCollection(contentId: string, collectionId: string | null) {
    try {
      await axios.put(
        `${BACKEND_URL}/api/v1/content/${contentId}`,
        { collectionId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      refresh();
      refreshCollections();
      showToast(collectionId ? "Moved to collection 📁" : "Removed from collection");
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to move memory");
    }
  }

  // Navigation Items Config
  const NAV_ITEMS: NavItemConfig[] = [
    {
      id: "home",
      label: "Home",
      count: contents.filter((item) => item.type !== "shared_brain").length,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: "collections",
      label: "Collections",
      count: collections.filter((c) => !c.parentId).length,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
    },
    {
      id: "tags",
      label: "Tags",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 7h.01M7 3h5a1 1 0 01.707.293l7 7a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-7-7A1 1 0 013 8V4a1 1 0 011-1z" />
        </svg>
      ),
    },
    {
      id: "favorites",
      label: "Favorites",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
    },
    {
      id: "settings",
      label: "Settings",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Reset pagination to page 1 on filter, search, tab, or collection changes
  useEffect(() => {
    if (!highlightedCardId) {
      setCurrentPage(1);
    }
  }, [selectedCollection, activeTab, searchQuery, typeFilter]);

  const sharedBrains = useMemo(() => {
    const raw = contents.filter((item) => item.type === "shared_brain");
    const seen = new Set<string>();
    return raw.filter((item) => {
      const hash = item.link?.split("/share/")[1] || item.title;
      if (!hash || seen.has(hash)) return false;
      seen.add(hash);
      return true;
    });
  }, [contents]);

  const sourceContents = useMemo(() => {
    const raw = currentWorkspace === "personal"
      ? contents
      : (sharedWorkspaceData?.content || []);
    return raw.filter((item) => item.type !== "shared_brain");
  }, [currentWorkspace, contents, sharedWorkspaceData]);

  const activeBaseContents = useMemo(() => {
    if (activeTab === "collections" && selectedCollection) {
      return sourceContents.filter((item) => item.collectionId === selectedCollection._id);
    }
    return sourceContents;
  }, [sourceContents, activeTab, selectedCollection]);

  // Multi-level ancestor breadcrumb trail for selected collection
  const breadcrumbs = useMemo(() => {
    if (!selectedCollection) return [];
    const trail: Collection[] = [];
    let curr: Collection | undefined = selectedCollection;
    const visited = new Set<string>();
    while (curr && !visited.has(curr._id)) {
      visited.add(curr._id);
      trail.unshift(curr);
      curr = collections.find((c) => c._id === curr?.parentId);
    }
    return trail;
  }, [selectedCollection, collections]);

  // Direct child collections (subfolders) for current selected collection
  const childSubfolders = useMemo(() => {
    if (!selectedCollection) return [];
    return collections.filter((c) => c.parentId === selectedCollection._id);
  }, [selectedCollection, collections]);

  const isItemPdf = (item: Content) => {
    if (item.type === "pdf") return true;
    const l = (item.link || "").toLowerCase();
    const t = (item.title || "").toLowerCase();
    return l.includes(".pdf") || l.includes("/pdf") || l.includes("arxiv.org/pdf") || l.includes("drive.google.com") || t.endsWith(".pdf");
  };

  // Compute item counts for the filter dropdown options
  const filterCounts = useMemo<FilterCounts>(() => {
    const counts: FilterCounts = {
      all: activeBaseContents.length,
      video: 0,
      twitter: 0,
      pdf: 0,
      article: 0,
      has_note: 0,
    };
    activeBaseContents.forEach((item) => {
      if (item.type === "youtube" || item.type === "video") counts.video++;
      else if (item.type === "twitter") counts.twitter++;
      else if (isItemPdf(item)) counts.pdf++;
      else counts.article++;

      if (item.description && item.description.trim() !== "") counts.has_note++;
    });
    return counts;
  }, [activeBaseContents]);

  // Filtering content by search query and selected filter option
  const filteredContents = activeBaseContents.filter((item) => {
    // 1. Search Query Filter
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchesSearch = item.title?.toLowerCase().includes(q) || item.link?.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    // 2. Type / Note Filter Option
    if (typeFilter === "video") {
      return item.type === "youtube" || item.type === "video";
    }
    if (typeFilter === "twitter") {
      return item.type === "twitter";
    }
    if (typeFilter === "pdf") {
      return isItemPdf(item);
    }
    if (typeFilter === "article") {
      return !isItemPdf(item) && (item.type === "article" || (item.type !== "youtube" && item.type !== "video" && item.type !== "twitter" && item.type !== "shared_brain"));
    }
    if (typeFilter === "has_note") {
      return Boolean(item.description && item.description.trim() !== "");
    }
    return true;
  });

  // Responsive Column Distribution (Adds +1 column when side panel is closed to preserve card size)
  const [numCols, setNumCols] = useState(4);
  useEffect(() => {
    const updateCols = () => {
      const w = window.innerWidth;
      const isDesktop = w >= 1024;

      if (!isDesktop) {
        if (w >= 640) setNumCols(2);
        else setNumCols(1);
        return;
      }

      // On desktop, adjust column count based on whether the sidebar is open
      if (sidebarOpen) {
        if (w >= 2100) setNumCols(5);
        else if (w >= 1400) setNumCols(4);
        else if (w >= 1080) setNumCols(3);
        else setNumCols(2);
      } else {
        // When side panel is closed (+260px available width), add 1 more card space per row!
        if (w >= 2100) setNumCols(6);
        else if (w >= 1400) setNumCols(5);
        else if (w >= 1080) setNumCols(4);
        else setNumCols(3);
      }
    };
    updateCols();
    window.addEventListener("resize", updateCols);
    return () => window.removeEventListener("resize", updateCols);
  }, [sidebarOpen]);

  // Sort chronologically ascending (_id ascending) so any newly added item goes to the last
  const sortedContents = [...filteredContents].sort((a, b) => (a._id > b._id ? 1 : a._id < b._id ? -1 : 0));

  // 5 rows visible for cards only: items per page = numCols * 5 rows
  const ROWS_PER_PAGE = 5;
  const itemsPerPage = Math.max(1, numCols * ROWS_PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(sortedContents.length / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedContents = sortedContents.slice(startIndex, startIndex + itemsPerPage);

  const columns: (typeof sortedContents)[] = Array.from({ length: numCols }, () => []);
  paginatedContents.forEach((item, idx) => {
    columns[idx % numCols].push(item);
  });

  return (
    <div className={`h-screen w-screen ${isDark ? "bg-[#191919] text-gray-200" : "bg-white text-gray-900"} font-sans flex overflow-hidden relative transition-colors duration-300`}>

      {/* ── Left Navigation Panel (Sidebar Drawer / Flex Sibling) ──── */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onSelectTab={(tabId) => {
          setActiveTab(tabId);
          if (tabId === "collections") {
            navigateToCollection(null);
          }
        }}
        items={NAV_ITEMS}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        currentWorkspace={currentWorkspace}
        onWorkspaceSelect={setCurrentWorkspace}
        sharedBrains={sharedBrains}
        onDeleteBrain={(brainId) => {
          handleDelete(brainId);
          if (currentWorkspace !== "personal") {
            setCurrentWorkspace("personal");
          }
        }}
      />

      {/* ── Hover Navigation Preview (Floats without pushing content) ── */}
      <SidebarPreview
        visible={previewOpen && !sidebarOpen}
        onMouseEnter={() => {
          if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
          setPreviewOpen(true);
        }}
        onMouseLeave={() => {
          setPreviewOpen(false);
        }}
        items={NAV_ITEMS}
        activeTab={activeTab}
        onSelectTab={(tabId) => {
          setActiveTab(tabId);
          setPreviewOpen(false);
        }}
        onLockSidebar={() => {
          setSidebarOpen(true);
          setPreviewOpen(false);
        }}
        isDark={isDark}
      />

      {/* ── Main Workspace Window (TopBar + Content Area) ──────────── */}
      <div className={`flex-1 h-full flex flex-col min-w-0 ${isDark ? "bg-[#191919]" : "bg-white"} overflow-hidden relative transition-all duration-300 ease-out`}>

        {/* Top Header Bar */}
        <TopBar
          onHamburgerClick={() => {
            setSidebarOpen((prev) => !prev);
            setPreviewOpen(false);
          }}
          onHamburgerMouseEnter={handleHamburgerMouseEnter}
          onHamburgerMouseLeave={handleHamburgerMouseLeave}
          isSidebarOpen={sidebarOpen}
          onAddMemory={() => setModalOpen(true)}
          onShareBrain={handleShare}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeFilter={typeFilter}
          onFilterChange={setTypeFilter}
          filterCounts={filterCounts}
          isDark={isDark}
          title={
            currentWorkspace !== "personal" && sharedWorkspaceData
              ? `${sharedWorkspaceData.username}'s Brain`
              : activeTab === "collections"
              ? selectedCollection ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => navigateToCollection(null)}
                      className={`transition-colors cursor-pointer ${
                        isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-purple-700 font-medium"
                      }`}
                    >
                      Collections
                    </button>
                    <span className={isDark ? "text-gray-600" : "text-gray-400"}>/</span>
                    <span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-900 font-bold"}`}>
                      {selectedCollection.title}
                    </span>
                  </div>
                ) : (
                  "Collections"
                )
              : activeTab === "tags"
              ? "Tags"
              : activeTab === "favorites"
              ? "Favorites"
              : activeTab === "settings"
              ? "Settings"
              : undefined
          }
          onOpenTree={() => setIsTreeDrawerOpen(true)}
        />

        {/* Viewport Canvas */}
        <main className="flex-1 w-full h-full overflow-y-auto p-6 sm:p-10 relative">
          {sharedWorkspaceError ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-center">
              <h2 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>Unable to access brain</h2>
              <p className="text-sm text-gray-500 mb-6 max-w-sm">{sharedWorkspaceError}</p>
              <button
                onClick={() => setCurrentWorkspace("personal")}
                className="px-4 py-2 rounded-md bg-purple-600 text-white text-xs font-semibold"
              >
                Return to Personal Brain
              </button>
            </div>
          ) : (loading && currentWorkspace === "personal" && contents.length === 0) || sharedWorkspaceLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="flex items-center gap-2 text-xs text-gray-500 font-mono animate-pulse">
                <span className="w-2 h-2 rounded-full bg-gray-500" />
                {sharedWorkspaceLoading ? "Syncing external brain..." : "Loading workspace..."}
              </div>
            </div>
          ) : activeTab === "collections" && !selectedCollection && currentWorkspace === "personal" ? (
            /* Collections Hub Overview */
            <CollectionsHub
              collections={collections}
              contents={contents}
              onSelectCollection={(col) => navigateToCollection(col)}
              onCreateCollectionClick={() => {
                setEditingCollection(null);
                setIsCollectionModalOpen(true);
              }}
              onEditCollection={(col) => {
                setEditingCollection(col);
                setIsCollectionModalOpen(true);
              }}
              onDeleteCollection={async (col) => {
                if (window.confirm(`Delete collection "${col.title}"? Any saved items will remain safely in your General Vault.`)) {
                  await deleteCollection(col._id);
                  refresh();
                  refreshCollections();
                  showToast("Collection deleted");
                }
              }}
              onShareCollection={(col) => {
                setSharingCollection(col);
                setIsShareCollectionModalOpen(true);
              }}
              isDark={isDark}
            />
          ) : (
            /* Normal Card Feed (Home or Inside Collection Folder or Shared Brain) */
            <div className="w-full flex flex-col gap-6">
              {/* External Shared Workspace Banner */}
              {currentWorkspace !== "personal" && sharedWorkspaceData && (
                <div className={`p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border ${isDark ? "bg-purple-950/25 border-purple-500/20 text-white" : "bg-purple-50 border-purple-200 text-purple-950"
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                      <img
                        width="64"
                        height="64"
                        src="https://img.icons8.com/pastel-glyph/64/brain-3--v1.png"
                        alt="brain-3--v1"
                        className={`w-6 h-6 object-contain ${isDark ? "invert brightness-125" : "brightness-0 opacity-80"}`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold">
                          {sharedWorkspaceData.username}'s Brain
                        </h2>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                          {filteredContents.length} {filteredContents.length === 1 ? "memory" : "memories"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Shared workspace connection curated by @{sharedWorkspaceData.username}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Collection Folder Header Breadcrumb */}
              {activeTab === "collections" && selectedCollection && (
                <div className={`flex flex-col gap-4 pb-5 border-b select-none ${isDark ? "border-white/5" : "border-gray-200"}`}>
                  {/* Top Bar: Breadcrumb + Action Buttons */}
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => navigateToCollection(null)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                          isDark
                            ? "bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 border-purple-500/20"
                            : "bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-800 border-purple-200 shadow-xs"
                        }`}
                      >
                        <CollectionIcon icon={DEFAULT_COLLECTION_ICON} className="w-3.5 h-3.5" />
                        <span>All Collections</span>
                      </button>

                      {breadcrumbs.map((crumb) => {
                        const isCurrent = crumb._id === selectedCollection._id;
                        return (
                          <div key={crumb._id} className="flex items-center gap-1.5">
                            <span className={isDark ? "text-gray-500 text-xs" : "text-gray-400 text-xs font-bold"}>/</span>
                            {isCurrent ? (
                              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-xs ${
                                isDark
                                  ? "bg-purple-500/15 border-purple-500/25 text-white"
                                  : "bg-purple-100 border-purple-300 text-purple-950 font-extrabold"
                              }`}>
                                <CollectionIcon icon={crumb.icon} className="w-4 h-4" />
                                <span>{crumb.title}</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => navigateToCollection(crumb)}
                                className={`text-xs font-semibold transition-colors cursor-pointer hover:underline px-1.5 py-1 ${
                                  isDark ? "text-gray-400 hover:text-purple-300" : "text-gray-600 hover:text-purple-700"
                                }`}
                              >
                                {crumb.title}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSharingCollection(selectedCollection);
                          setIsShareCollectionModalOpen(true);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                          isDark ? "border-white/10 hover:bg-white/10 text-gray-300" : "border-gray-200 hover:bg-gray-100 text-gray-700"
                        }`}
                      >
                        <span>🔗</span>
                        <span>{selectedCollection.shareHash ? "Shared" : "Share"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalOpen(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>+</span>
                        <span>Add to Folder</span>
                      </button>
                    </div>
                  </div>

                  {/* Subfolders Grid (Tree View) */}
                  {childSubfolders.length > 0 && (
                    <div className="flex flex-col gap-2.5 pt-2">
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        <span className="flex items-center gap-1">
                          <CollectionIcon icon={DEFAULT_COLLECTION_ICON} className="w-3.5 h-3.5" />
                          Subfolders
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 text-[10px]">
                          {childSubfolders.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {childSubfolders.map((sub) => {
                          const directFiles = sourceContents.filter(item => item.collectionId === sub._id).length;
                          const nestedFolders = collections.filter(c => c.parentId === sub._id).length;
                          return (
                            <div
                              key={sub._id}
                              onClick={() => navigateToCollection(sub)}
                              className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center gap-2.5 group select-none shadow-sm ${isDark
                                  ? "bg-[#18181b]/90 border-white/10 hover:border-purple-500/50 hover:bg-[#202024] hover:shadow-lg"
                                  : "bg-white border-gray-200 hover:border-purple-400 hover:shadow-md"
                                }`}
                            >
                              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform p-1.5">
                                <CollectionIcon icon={sub.icon} className="w-6 h-6" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className={`text-xs font-bold truncate ${isDark ? "text-gray-200 group-hover:text-purple-300" : "text-gray-900 group-hover:text-purple-700"}`}>
                                  {sub.title}
                                </h4>
                                <p className="text-[10px] text-gray-400 truncate mt-0.5">
                                  {nestedFolders > 0 ? `${nestedFolders} folders • ` : ""}{directFiles} {directFiles === 1 ? "file" : "files"}
                                </p>
                              </div>
                              <span className="text-gray-500 group-hover:text-purple-400 text-xs transition-colors shrink-0">
                                →
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Feed of Memories inside this folder */}
              {filteredContents.length === 0 ? (
                childSubfolders.length > 0 ? (
                  <div className="w-full py-12 flex flex-col items-center justify-center text-center p-6 rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl mb-3">
                      📂
                    </div>
                    <p className="text-sm font-semibold text-gray-300">
                      All files in this folder are organized into subfolders
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Click any subfolder above to view its documents and files
                    </p>
                  </div>
                ) : (
                  <EmptyState
                    isSearch={searchQuery.trim() !== "" || typeFilter !== "all"}
                    searchQuery={searchQuery}
                    onAddClick={() => setModalOpen(true)}
                    isDark={isDark}
                  />
                )
              ) : (
                <div
                  className="grid gap-6 items-start transition-all duration-300"
                  style={{
                    gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))`
                  }}
                >
                  {columns.map((colItems, colIdx) => (
                    <div key={colIdx} className="flex flex-col gap-6">
                      {colItems.map(({ _id, type, link, title, description, collectionId }) => (
                        <div
                          key={_id}
                          id={`card-${_id}`}
                          className={`transition-all duration-500 rounded-2xl ${
                            highlightedCardId === _id
                              ? "ring-4 ring-purple-500 shadow-[0_0_35px_rgba(168,85,247,0.7)] scale-[1.02] animate-pulse"
                              : ""
                          }`}
                        >
                          <Card
                            _id={_id}
                            type={type}
                            link={link}
                            title={title}
                            description={description}
                            collectionId={collectionId}
                            collections={collections}
                            onMoveCollection={handleMoveCollection}
                            onDelete={handleDelete}
                            onCopyToast={showToast}
                            isDark={isDark}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* 5-Row Pagination Controls (Cards Only) */}
              {filteredContents.length > 0 && totalPages > 1 && (
                <div
                  className={`mt-6 pt-5 pb-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 select-none ${
                    isDark ? "border-white/10 text-gray-400" : "border-gray-200 text-gray-600"
                  }`}
                >
                  <div className="text-xs font-medium">
                    Showing{" "}
                    <span className={isDark ? "text-gray-200 font-bold" : "text-gray-900 font-bold"}>
                      {startIndex + 1}–{Math.min(startIndex + itemsPerPage, sortedContents.length)}
                    </span>{" "}
                    of{" "}
                    <span className={isDark ? "text-gray-200 font-bold" : "text-gray-900 font-bold"}>
                      {sortedContents.length}
                    </span>{" "}
                    cards
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={safeCurrentPage <= 1}
                      onClick={() => {
                        setCurrentPage((p) => Math.max(1, p - 1));
                        document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed ${
                        isDark
                          ? "border-white/10 hover:bg-white/10 text-gray-300 disabled:hover:bg-transparent"
                          : "border-gray-200 hover:bg-gray-100 text-gray-700 disabled:hover:bg-transparent"
                      }`}
                    >
                      ← Prev
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
                        .reduce<(number | string)[]>((acc, p, idx, arr) => {
                          if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                            acc.push("...");
                          }
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((item, idx) => {
                          if (typeof item === "string") {
                            return (
                              <span key={`dots-${idx}`} className="px-1 text-xs text-gray-500">
                                ...
                              </span>
                            );
                          }
                          const isCurrent = item === safeCurrentPage;
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => {
                                setCurrentPage(item);
                                document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                                isCurrent
                                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                                  : isDark
                                  ? "hover:bg-white/10 text-gray-400 hover:text-white"
                                  : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                              }`}
                            >
                              {item}
                            </button>
                          );
                        })}
                    </div>

                    <button
                      type="button"
                      disabled={safeCurrentPage >= totalPages}
                      onClick={() => {
                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                        document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed ${
                        isDark
                          ? "border-white/10 hover:bg-white/10 text-gray-300 disabled:hover:bg-transparent"
                          : "border-gray-200 hover:bg-gray-100 text-gray-700 disabled:hover:bg-transparent"
                      }`}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

      </div>

      {/* ── Modals & Notifications ───────────────────────────────── */}
      <CreateContentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        collections={collections}
        defaultCollectionId={selectedCollection ? selectedCollection._id : null}
        onSuccess={(msg?: string, importedCollection?: Collection) => {
          showToast(msg || "Memory saved successfully");
          refresh();
          refreshCollections();
          if (importedCollection) {
            navigateToCollection(importedCollection);
          }
        }}
      />

      <CollectionModal
        open={isCollectionModalOpen}
        onClose={() => {
          setIsCollectionModalOpen(false);
          setEditingCollection(null);
        }}
        initialCollection={editingCollection}
        onSave={async (title, icon) => {
          if (editingCollection) {
            await updateCollection(editingCollection._id, title, icon);
            showToast("Collection updated 📁");
          } else {
            await createCollection(title, icon);
            showToast("Collection created 🎉");
          }
        }}
        isDark={isDark}
      />

      <ShareCollectionModal
        open={isShareCollectionModalOpen}
        onClose={() => {
          setIsShareCollectionModalOpen(false);
          setSharingCollection(null);
        }}
        collection={sharingCollection}
        onToggleShare={async (id, share) => {
          const link = await shareCollection(id, share);
          if (sharingCollection) {
            setSharingCollection({
              ...sharingCollection,
              shareHash: link ? link.split("/share/c/")[1] : undefined,
            });
          }
          return link;
        }}
        onCopyToast={showToast}
        isDark={isDark}
      />

      <FolderTreeDrawer
        open={isTreeDrawerOpen}
        onClose={() => setIsTreeDrawerOpen(false)}
        collections={collections}
        contents={contents}
        selectedCollection={selectedCollection}
        scopedCollection={activeTab === "collections" && selectedCollection ? selectedCollection : null}
        onSelectCollection={(col) => {
          navigateToCollection(col);
        }}
        onSelectContent={(item) => {
          if (item.collectionId) {
            const parent = collections.find((c) => c._id === item.collectionId);
            navigateToCollection(parent || null);
          } else {
            navigateToCollection(null);
            setActiveTab("home");
          }
          setIsTreeDrawerOpen(false);
          setHighlightedCardId(item._id);

          // Find the exact page this card lands on so it is rendered and highlighted
          const destItems = sourceContents
            .filter((c) => (item.collectionId ? c.collectionId === item.collectionId : true))
            .sort((a, b) => (a._id > b._id ? 1 : a._id < b._id ? -1 : 0));
          const itemIdx = destItems.findIndex((c) => c._id === item._id);
          if (itemIdx !== -1) {
            const targetPage = Math.floor(itemIdx / itemsPerPage) + 1;
            setCurrentPage(targetPage);
          }

          setTimeout(() => {
            const el = document.getElementById(`card-${item._id}`);
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 250);
          setTimeout(() => {
            setHighlightedCardId(null);
          }, 2800);
        }}
        isDark={isDark}
      />

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
