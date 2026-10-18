import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { ShareIcon } from "../../icons/shareIcon";
import { Delete } from "../../icons/delete";
import { YoutubeIcon } from "../../icons/youtube";
import { PdfIcon } from "../../icons/pdfIcon";
import type { ContentType } from "../../types/content";
import axios from "axios";
import { BACKEND_URL } from "../../config";

declare global {
    interface Window {
        twttr?: {
            widgets?: {
                load?: (element?: HTMLElement | null) => void;
            };
        };
    }
}

import type { Collection } from "../../types/collection";
import { CollectionIcon, DEFAULT_COLLECTION_ICON } from "../collections/CollectionIcon";

interface CardProps {
    _id: string;
    title: string;
    link: string;
    type: ContentType;
    description?: string;
    collectionId?: string | null;
    collections?: Collection[];
    onMoveCollection?: (contentId: string, collectionId: string | null) => void;
    onDelete?: (id: string) => void;
    onCopyToast?: (msg: string) => void;
    isDark?: boolean;
}

interface LinkMetadata {
    title: string;
    description: string;
    image: string;
    favicon: string;
    domain: string;
}

function getYouTubeEmbedUrl(link: string) {
    try {
        if (link.includes("youtu.be/")) {
            const id = link.split("youtu.be/")[1]?.split("?")[0]?.split("&")[0];
            return `https://youtube.com/embed/${id}`;
        }
        if (link.includes("watch?v=")) {
            const id = link.split("watch?v=")[1]?.split("&")[0];
            return `https://youtube.com/embed/${id}`;
        }
        return link.replace("watch?v=", "embed/");
    } catch {
        return link;
    }
}

function getYouTubeVideoId(link: string): string | null {
    try {
        if (!link) return null;
        if (link.includes("youtu.be/")) {
            return link.split("youtu.be/")[1]?.split("?")[0]?.split("&")[0] || null;
        }
        if (link.includes("watch?v=")) {
            return link.split("watch?v=")[1]?.split("&")[0] || null;
        }
        if (link.includes("embed/")) {
            return link.split("embed/")[1]?.split("?")[0]?.split("&")[0] || null;
        }
        if (link.includes("shorts/")) {
            return link.split("shorts/")[1]?.split("?")[0]?.split("&")[0] || null;
        }
        return null;
    } catch {
        return null;
    }
}

function getPdfViewerUrl(link: string) {
    try {
        const rawUrl = link.startsWith("http") ? link : `https://${link}`;
        const gdMatch = rawUrl.match(/(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/.*[?&]id=)([a-zA-Z0-9_-]+)/);
        if (gdMatch && gdMatch[1]) {
            return `https://drive.google.com/file/d/${gdMatch[1]}/preview`;
        }
        return `https://docs.google.com/gview?url=${encodeURIComponent(rawUrl)}&embedded=true`;
    } catch {
        return link;
    }
}

export const Card = ({
    _id,
    title,
    link,
    type,
    description,
    collectionId,
    collections = [],
    onMoveCollection,
    onDelete,
    onCopyToast,
    isDark
}: CardProps) => {
    const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
    const [imgError, setImgError] = useState(false);
    const [readerOpen, setReaderOpen] = useState(false);
    const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false);
    const [currentCollectionId, setCurrentCollectionId] = useState<string | null | undefined>(collectionId);
    const [isMovingCollection, setIsMovingCollection] = useState(false);
    const moveMenuRef = useRef<HTMLDivElement>(null);
    const [collectionSearch, setCollectionSearch] = useState("");

    // Description / Note states
    const [descText, setDescText] = useState(description || "");
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [isSavingDesc, setIsSavingDesc] = useState(false);
    const [isNoteExpanded, setIsNoteExpanded] = useState(false);
    const [thumbError, setThumbError] = useState(false);
    const [playerOpen, setPlayerOpen] = useState(false);
    const [isFloatingPreviewActive, setIsFloatingPreviewActive] = useState(false);
    const floatingPopupRef = useRef<Window | null>(null);
    const checkClosedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setDescText(description || "");
        setIsNoteExpanded(false);
        setIsEditingDesc(false);
    }, [description]);

    useEffect(() => {
        setCurrentCollectionId(collectionId);
    }, [collectionId]);

    useEffect(() => {
        if (isEditingDesc) {
            const timer = setTimeout(() => {
                const el = textareaRef.current;
                if (el) {
                    el.focus();
                    const len = el.value.length;
                    el.setSelectionRange(len, len);
                }
            }, 60);
            return () => clearTimeout(timer);
        }
    }, [isEditingDesc]);

    // Clean up closed popup monitoring interval on unmount
    useEffect(() => {
        return () => {
            if (checkClosedTimerRef.current) {
                clearInterval(checkClosedTimerRef.current);
            }
        };
    }, []);

    // Close Move-to-Collection menu on click outside
    useEffect(() => {
        if (!isMoveMenuOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (moveMenuRef.current && !moveMenuRef.current.contains(e.target as Node)) {
                setIsMoveMenuOpen(false);
                setCollectionSearch("");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isMoveMenuOpen]);

    // Handle ESC key to dismiss panel, modal, or floating preview blur
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (isMoveMenuOpen) {
                    setIsMoveMenuOpen(false);
                    setCollectionSearch("");
                    return;
                }
                if (isFloatingPreviewActive) {
                    setIsFloatingPreviewActive(false);
                    return;
                }
                if (readerOpen) {
                    setReaderOpen(false);
                    return;
                }
                if (playerOpen) {
                    setPlayerOpen(false);
                    return;
                }
                if (isEditingDesc || isNoteExpanded) {
                    if (isEditingDesc) {
                        setDescText(description || "");
                        setIsEditingDesc(false);
                        if (!description) setIsNoteExpanded(false);
                    } else {
                        setIsNoteExpanded(false);
                    }
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isMoveMenuOpen, isEditingDesc, isNoteExpanded, description, readerOpen, playerOpen, isFloatingPreviewActive]);

    // Twitter widget loader
    useEffect(() => {
        if (type === "twitter") {
            if (window.twttr?.widgets?.load) {
                window.twttr.widgets.load();
            } else {
                const script = document.querySelector('script[src="https://platform.twitter.com/widgets.js"]');
                if (script) {
                    const handleLoad = () => window.twttr?.widgets?.load?.();
                    script.addEventListener('load', handleLoad);
                    return () => script.removeEventListener('load', handleLoad);
                }
            }
        }
    }, [type, link, isDark]);

    // Fetch OG metadata for non-media cards
    useEffect(() => {
        if (type === "youtube" || type === "twitter") return;
        let cancelled = false;
        axios.get(`${BACKEND_URL}/api/v1/content/preview/metadata`, {
            params: { url: link },
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`
            }
        }).then((res) => {
            if (!cancelled) setMetadata(res.data);
        }).catch(() => { });
        return () => { cancelled = true; };
    }, [link, type]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(link);
        if (onCopyToast) {
            onCopyToast("Link copied to clipboard! 🔗");
        } else {
            alert("Url Copied !");
        }
    };

    const handleSaveDescription = async () => {
        try {
            setIsSavingDesc(true);
            await axios.put(
                `${BACKEND_URL}/api/v1/content/${_id}`,
                { description: descText },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    }
                }
            );
            setIsEditingDesc(false);
            setIsNoteExpanded(false);
            if (onCopyToast) onCopyToast("Note saved 📝");
        } catch (err) {
            console.error("Save note failed", err);
            if (onCopyToast) onCopyToast("Failed to save note");
        } finally {
            setIsSavingDesc(false);
        }
    };

    const handleMoveCollectionSelect = async (targetColId: string | null) => {
        if (targetColId === currentCollectionId) {
            setIsMoveMenuOpen(false);
            return;
        }
        setIsMovingCollection(true);
        try {
            if (onMoveCollection) {
                await onMoveCollection(_id, targetColId);
            } else {
                await axios.put(
                    `${BACKEND_URL}/api/v1/content/${_id}`,
                    { collectionId: targetColId },
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem("token")}`
                        }
                    }
                );
                if (onCopyToast) {
                    onCopyToast(targetColId ? "Moved to collection 📁" : "Removed from collection");
                }
            }
            setCurrentCollectionId(targetColId);
            setIsMoveMenuOpen(false);
        } catch (err: any) {
            console.error("Failed to move memory", err);
            if (onCopyToast) onCopyToast(err?.response?.data?.message || "Failed to move memory");
        } finally {
            setIsMovingCollection(false);
        }
    };

    const filteredCollections = useMemo(() => {
        if (!collectionSearch.trim()) return collections;
        return collections.filter(c => c.title.toLowerCase().includes(collectionSearch.toLowerCase().trim()));
    }, [collections, collectionSearch]);

    const openFloatingBrowser = (rawUrl: string, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        try {
            const url = rawUrl.startsWith("http://") || rawUrl.startsWith("https://") ? rawUrl : `https://${rawUrl}`;

            // User requested: "can that new tab little smaller" and "blur the previous tab when the new tab open"
            // Make the floating preview window compact, nicely centered (~70% width, ~72% height, max 980x680)
            const screenW = window.screen.availWidth || window.innerWidth || 1280;
            const screenH = window.screen.availHeight || window.innerHeight || 800;
            const width = Math.min(980, Math.max(680, Math.floor(screenW * 0.70)));
            const height = Math.min(680, Math.max(480, Math.floor(screenH * 0.72)));
            const left = Math.max(0, Math.floor((screenW - width) / 2));
            const top = Math.max(0, Math.floor((screenH - height) / 2));
            const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes,location=yes,menubar=no,toolbar=no`;

            if (checkClosedTimerRef.current) {
                clearInterval(checkClosedTimerRef.current);
                checkClosedTimerRef.current = null;
            }

            const popup = window.open(url, `MemoraPreview_${Date.now()}`, features);
            floatingPopupRef.current = popup;
            setIsFloatingPreviewActive(true);

            if (!popup || popup.closed || typeof popup.closed === "undefined") {
                window.open(url, "_blank", "noopener,noreferrer");
            } else {
                try {
                    popup.focus();
                } catch { }

                // Automatically un-blur the previous tab once the floating window is closed
                checkClosedTimerRef.current = setInterval(() => {
                    try {
                        if (!popup || popup.closed) {
                            if (checkClosedTimerRef.current) {
                                clearInterval(checkClosedTimerRef.current);
                                checkClosedTimerRef.current = null;
                            }
                            setIsFloatingPreviewActive(false);
                            floatingPopupRef.current = null;
                        }
                    } catch {
                        if (checkClosedTimerRef.current) {
                            clearInterval(checkClosedTimerRef.current);
                            checkClosedTimerRef.current = null;
                        }
                        setIsFloatingPreviewActive(false);
                    }
                }, 500);
            }
        } catch (e) {
            console.error("Failed to open floating preview window", e);
            window.open(rawUrl, "_blank");
        }
    };

    const normalizedLink = link.startsWith("http://") || link.startsWith("https://") ? link : `https://${link}`;
    const isLinkPdf = (link || "").toLowerCase().includes(".pdf") ||
        (link || "").toLowerCase().includes("/pdf") ||
        (link || "").toLowerCase().includes("arxiv.org/pdf") ||
        (link || "").toLowerCase().includes("drive.google.com") ||
        (title || "").toLowerCase().endsWith(".pdf") ||
        metadata?.description === "PDF Document";
    const effectiveType = (type === "pdf" || (type === "article" && isLinkPdf)) ? "pdf" : type;
    const isSharedBrain = effectiveType === "shared_brain";
    const isArticle = effectiveType !== "youtube" && effectiveType !== "twitter" && effectiveType !== "pdf" && effectiveType !== "shared_brain" && effectiveType !== "video";
    const hasImage = isArticle && metadata?.image && !imgError;
    const domainName = metadata?.domain || (() => { try { return new URL(normalizedLink).hostname; } catch { return ""; } })();
    const ytVideoId = getYouTubeVideoId(link);
    const ytThumbnailUrl = ytVideoId ? `https://img.youtube.com/vi/${ytVideoId}/hqdefault.jpg` : null;



    const isPanelOpen = isEditingDesc || isNoteExpanded;

    // Collapsed read-only note preview or placeholder button at the bottom of the card
    const renderReadOnlyNote = () => {
        if (!descText) {
            return (
                <div className="w-full mt-auto pt-1 pb-0.5 shrink-0 flex items-center justify-start">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsEditingDesc(true);
                            setIsNoteExpanded(true);
                        }}
                        className={`py-1.5 px-3 rounded-xl border transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold group/addnote active:scale-95 shadow-xs ${isDark
                                ? "bg-white/[0.04] hover:bg-purple-500/15 border-white/10 hover:border-purple-500/40 text-purple-300 hover:text-purple-200"
                                : "bg-gray-50 hover:bg-purple-50 border-gray-200 hover:border-purple-300 text-purple-700 hover:text-purple-900"
                            }`}
                        title="Add note"
                    >
                        <img
                            src="https://img.icons8.com/ios/50/add--v1.png"
                            alt="add--v1"
                            className={`w-4.5 h-4.5 object-contain transition-transform group-hover/addnote:scale-110 ${isDark ? "invert opacity-95" : "opacity-85"
                                }`}
                        />
                        <span>Add note</span>
                    </button>
                </div>
            );
        }

        return (
            <div className="w-full mt-auto pt-1 pb-0.5 shrink-0">
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsNoteExpanded(true);
                        setIsEditingDesc(false);
                    }}
                    className={`group/desc w-full rounded-xl border transition-all duration-200 cursor-pointer p-2.5 flex flex-col gap-1 shadow-xs ${isDark
                            ? "bg-purple-950/20 hover:bg-purple-900/30 border-purple-500/25 hover:border-purple-500/45 text-gray-200"
                            : "bg-purple-50/70 hover:bg-purple-100/80 border-purple-200 hover:border-purple-300 text-gray-800"
                        }`}
                    title="Click to view and edit full note"
                >
                    {/* Header Row: Note tag on left, Open action on right */}
                    <div className="flex items-center justify-between gap-1.5 shrink-0">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-400">
                            Note
                        </span>
                        <span className="text-[10px] font-semibold text-purple-400 group-hover/desc:text-purple-300 flex items-center gap-1 transition-colors">
                            <span>Open</span>
                            <img
                                width="24"
                                height="24"
                                src="https://img.icons8.com/material-outlined/24/external-link.png"
                                alt="external-link"
                                className={`w-3.5 h-3.5 object-contain ${isDark ? "invert opacity-85" : "opacity-75"}`}
                            />
                        </span>
                    </div>

                    {/* Note Snippet: 1 or 2 lines clean display */}
                    <p className={`text-xs leading-snug line-clamp-2 select-none font-normal ${isDark ? "text-gray-300 group-hover/desc:text-gray-100" : "text-gray-700 group-hover/desc:text-gray-900"
                        }`}>
                        {descText}
                    </p>
                </div>
            </div>
        );
    };

    // Upward-Expanding Note Panel (Opens Upward inside card with Edit Button at bottom right)
    const renderUpwardNoteEditor = () => {
        return (
            <div
                onClick={(e) => e.stopPropagation()}
                className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-300 ease-out flex flex-col p-4 rounded-t-2xl rounded-b-2xl border-t shadow-2xl backdrop-blur-md h-[calc(100%-54px)] ${isDark
                        ? "bg-[#181716]/98 border-purple-500/25 text-gray-100 shadow-black/80"
                        : "bg-white/98 border-purple-500/20 text-gray-900 shadow-gray-400/30"
                    } ${isPanelOpen
                        ? "translate-y-0 opacity-100 pointer-events-auto"
                        : "translate-y-full opacity-0 pointer-events-none"
                    }`}
            >
                {/* 1. Edit Mode */}
                {isEditingDesc ? (
                    <>
                        {/* Editor Header */}
                        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10 shrink-0">
                            <span className="text-xs font-semibold text-purple-400">
                                {description ? "Edit Description" : "Add Description"}
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    setDescText(description || "");
                                    setIsEditingDesc(false);
                                    if (!description) setIsNoteExpanded(false);
                                }}
                                className={`p-1 rounded-lg text-xs transition-colors cursor-pointer ${isDark ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                                    }`}
                                title="Cancel (Esc)"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Editor Textarea Container */}
                        <div className={`flex flex-col flex-1 min-h-0 rounded-xl p-3 border shadow-inner transition-all ${isDark
                                ? "bg-[#121212] border-white/10 focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/20"
                                : "bg-gray-50 border-gray-200 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500/20"
                            }`}>
                            <textarea
                                ref={textareaRef}
                                value={descText}
                                onChange={(e) => setDescText(e.target.value)}
                                placeholder="Write your thoughts, takeaways, or key highlights..."
                                className={`w-full flex-1 min-h-0 bg-transparent text-xs outline-none resize-none leading-relaxed overflow-y-auto font-normal ${isDark ? "text-gray-100 placeholder:text-gray-500" : "text-gray-800 placeholder:text-gray-400"
                                    }`}
                            />
                        </div>

                        {/* Bottom Actions: Cancel & Save Note */}
                        <div className="flex items-center justify-end gap-2 pt-2.5 mt-auto shrink-0 border-t border-white/5">
                            <button
                                type="button"
                                onClick={() => {
                                    setDescText(description || "");
                                    setIsEditingDesc(false);
                                    if (!description) setIsNoteExpanded(false);
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${isDark ? "text-gray-400 hover:text-gray-200 hover:bg-white/5" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveDescription}
                                disabled={isSavingDesc}
                                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 active:scale-95 text-white shadow-md hover:shadow-purple-500/25 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                            >
                                {isSavingDesc ? (
                                    <>
                                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <span>Save Note</span>
                                )}
                            </button>
                        </div>
                    </>
                ) : (
                    /* 2. Expanded / Open Note Reading Mode */
                    <>
                        {/* Note Reading Header */}
                        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10 shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="p-1 rounded-md bg-purple-500/15 text-purple-400 text-xs">📝</span>
                                <span className="text-xs font-semibold tracking-wide text-purple-400">
                                    Description
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsNoteExpanded(false)}
                                className={`p-1 rounded-lg text-xs transition-colors cursor-pointer ${isDark ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                                    }`}
                                title="Close note (Esc)"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Note Full Text Box */}
                        <div className={`flex-1 min-h-0 rounded-xl p-3 border overflow-y-auto leading-relaxed text-xs shadow-inner select-text ${isDark
                                ? "bg-[#121212]/70 border-white/10 text-gray-200"
                                : "bg-gray-50 border-gray-200 text-gray-800"
                            }`}>
                            <p className="whitespace-pre-wrap leading-relaxed">{descText}</p>
                        </div>

                        {/* Bottom Bar with Close and Edit Button at Bottom Right */}
                        <div className="flex items-center justify-between pt-2.5 mt-auto shrink-0 border-t border-white/5">
                            <button
                                type="button"
                                onClick={() => setIsNoteExpanded(false)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${isDark ? "text-gray-400 hover:text-gray-200 hover:bg-white/5" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                <span>✕</span>
                                <span>Close</span>
                            </button>
                            {/* Edit Button Come Bottom Right */}
                            <button
                                type="button"
                                onClick={() => setIsEditingDesc(true)}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 active:scale-95 text-white shadow-md hover:shadow-purple-500/25 transition-all cursor-pointer flex items-center gap-1.5 ml-auto"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                <span>Edit</span>
                            </button>
                        </div>
                    </>
                )}
            </div>
        );
    };

    if (type === "shared_brain") {
        return null;
    }

    return (
        <>
            <div className={`rounded-2xl border p-5 shadow-sm transition-[shadow,transform] duration-300 ease-out flex flex-col w-full group relative overflow-hidden h-[360px] ${isPanelOpen ? "" : "hover:shadow-xl hover:-translate-y-1"
                } ${isDark
                    ? "bg-[#1e1d1b] border-white/10 text-gray-100 hover:border-purple-500/40 shadow-black/40"
                    : "bg-white border-gray-200/80 text-gray-800"
                }`}>
                {/* Card Header (pinned and always visible) */}
                <div className={`flex items-start justify-between gap-3 shrink-0 pb-3 border-b ${isDark ? "border-white/10" : "border-gray-100"
                    }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-2 rounded-xl shrink-0 ${(effectiveType === "youtube" || effectiveType === "video") ? (isDark ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-50 text-emerald-500") :
                                effectiveType === "twitter" ? (isDark ? "bg-white/[0.08] text-white" : "bg-neutral-100 text-neutral-900") :
                                    effectiveType === "pdf" ? (isDark ? "bg-red-500/20 text-red-400" : "bg-red-50 text-red-600") :
                                        isSharedBrain ? (isDark ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-50 text-emerald-600") :
                                            (isDark ? "bg-purple-500/15 text-purple-400" : "bg-purple-50 text-purple-600")
                            }`}>
                            {(effectiveType === "youtube" || effectiveType === "video") && (
                                <img
                                    width="24"
                                    height="24"
                                    src="https://img.icons8.com/softteal-line/24/video.png"
                                    alt="video"
                                    className={`w-5 h-5 object-contain transition-all ${isDark ? "brightness-125 drop-shadow-[0_0_6px_rgba(72,184,166,0.35)]" : "brightness-95 contrast-125"
                                        }`}
                                />
                            )}
                            {effectiveType === "twitter" && (
                                <img
                                    width="50"
                                    height="50"
                                    src="https://img.icons8.com/ios/50/twitterx--v2.png"
                                    alt="twitterx--v2"
                                    className={`w-5 h-5 object-contain transition-all ${isDark ? "invert brightness-125" : "opacity-90"
                                        }`}
                                />
                            )}
                            {effectiveType === "pdf" && (
                                <img
                                    src="https://img.icons8.com/fluency-systems-regular/48/pdf-2.png"
                                    alt="pdf-2"
                                    className="w-5 h-5 object-contain transition-all"
                                    style={{
                                        filter: isDark
                                            ? "invert(1) brightness(1.2)"
                                            : "invert(24%) sepia(85%) saturate(3400%) hue-rotate(345deg) brightness(92%)"
                                    }}
                                />
                            )}
                            {isSharedBrain && (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            )}
                            {isArticle && (
                                metadata?.favicon ? (
                                    <img src={metadata.favicon} alt="" className="w-5 h-5 rounded-sm" />
                                ) : (
                                    <svg className={`w-5 h-5 ${isDark ? "text-purple-400" : "text-purple-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                )
                            )}
                        </div>
                        <div className="min-w-0">
                            <h3 className={`truncate font-bold text-base transition-colors ${isDark ? "text-gray-100 group-hover:text-purple-400" : "text-gray-800 group-hover:text-purple-600"
                                }`} title={title}>
                                {title}
                            </h3>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[11px] font-semibold capitalize ${isDark ? "text-gray-400" : "text-gray-400"}`}>
                                    {isSharedBrain ? "Memora Vault" : (domainName || effectiveType)}
                                </span>
                                {currentCollectionId && collections && (() => {
                                    const matchedCol = collections.find(c => c._id === currentCollectionId);
                                    if (!matchedCol) return null;
                                    return (
                                        <span
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/15 text-purple-400 border border-purple-500/20 truncate max-w-[130px]"
                                            title={`Collection: ${matchedCol.title}`}
                                        >
                                            <CollectionIcon icon={matchedCol.icon} className="w-3 h-3 shrink-0" />
                                            <span className="truncate">{matchedCol.title}</span>
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className={`flex items-center gap-1 shrink-0 relative ${isDark ? "text-gray-400" : "text-gray-500"}`} ref={moveMenuRef}>
                        {/* Move to Collection Dropdown Button */}
                        {(onMoveCollection || (collections && collections.length > 0)) && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMoveMenuOpen(!isMoveMenuOpen);
                                }}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDark ? "hover:bg-white/10 hover:text-white" : "hover:bg-gray-100 hover:text-gray-700"
                                    } ${isMoveMenuOpen ? (isDark ? "text-purple-400 bg-purple-500/15" : "text-purple-700 bg-purple-100") : ""}`}
                                title="Move to Collection"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                            </button>
                        )}

                        <button
                            onClick={handleCopy}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDark ? "hover:bg-white/10 hover:text-white" : "hover:bg-gray-100 hover:text-gray-600"
                                }`}
                            title="Copy Link"
                        >
                            <ShareIcon size="md" />
                        </button>
                        {onDelete && (
                            <button
                                onClick={() => onDelete(_id)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDark ? "hover:bg-red-500/20 hover:text-red-400" : "hover:bg-red-50 hover:text-red-500"
                                    }`}
                                title="Delete Memory"
                            >
                                <Delete size="md" />
                            </button>
                        )}

                        {isMoveMenuOpen && (
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className={`absolute right-0 top-9 z-50 w-52 rounded-xl border p-1 backdrop-blur-xl shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-100 ${isDark ? "bg-[#18181b]/95 border-white/10 text-gray-200" : "bg-white/95 border-gray-200 text-gray-800 shadow-xl"
                                    }`}
                            >
                                {/* Quick search input if 4+ collections */}
                                {collections.length >= 4 && (
                                    <div className="p-1 pb-1.5">
                                        <div className="relative flex items-center">
                                            <svg className="w-3.5 h-3.5 absolute left-2 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            <input
                                                type="text"
                                                autoFocus
                                                placeholder="Move to..."
                                                value={collectionSearch}
                                                onChange={(e) => setCollectionSearch(e.target.value)}
                                                className={`w-full pl-7 pr-5 py-1 text-xs rounded-lg border-0 focus:outline-none transition-all ${isDark
                                                        ? "bg-white/5 text-gray-200 placeholder-gray-500 focus:bg-white/10"
                                                        : "bg-gray-100 text-gray-800 placeholder-gray-400 focus:bg-gray-200/70"
                                                    }`}
                                            />
                                            {collectionSearch && (
                                                <button
                                                    type="button"
                                                    onClick={() => setCollectionSearch("")}
                                                    className="absolute right-1.5 text-[11px] text-gray-400 hover:text-white cursor-pointer"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Root Vault option */}
                                <button
                                    type="button"
                                    disabled={isMovingCollection}
                                    onClick={() => handleMoveCollectionSelect(null)}
                                    className={`w-full px-2 py-1.5 rounded-lg text-xs font-medium text-left transition-colors flex items-center justify-between cursor-pointer ${!currentCollectionId
                                            ? isDark ? "bg-purple-600/15 text-purple-300 font-semibold" : "bg-purple-100 text-purple-800 font-bold"
                                            : isDark ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-100 text-gray-700"
                                        }`}
                                >
                                    <span className="flex items-center gap-2 truncate">
                                        <CollectionIcon icon={DEFAULT_COLLECTION_ICON} className="w-4 h-4 shrink-0" />
                                        <span className="truncate">General Vault</span>
                                    </span>
                                    {!currentCollectionId && <span className="text-purple-400 font-bold text-xs ml-1.5">✓</span>}
                                </button>

                                {/* Subtle 1px divider */}
                                <div className={`my-1 border-t ${isDark ? "border-white/5" : "border-gray-100"}`} />

                                {/* Collections List */}
                                <div className={`max-h-52 overflow-y-auto flex flex-col gap-0.5 [scrollbar-width:thin] ${isDark
                                        ? "[scrollbar-color:rgba(255,255,255,0.15)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/30"
                                        : "[scrollbar-color:rgba(0,0,0,0.15)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400"
                                    }`}>
                                    {filteredCollections.length === 0 ? (
                                        <div className="px-2 py-3 text-center text-xs text-gray-400">
                                            {collectionSearch ? "No folders found" : "No folders"}
                                        </div>
                                    ) : (
                                        filteredCollections.map((c) => {
                                            const isSelected = currentCollectionId === c._id;
                                            return (
                                                <button
                                                    key={c._id}
                                                    type="button"
                                                    disabled={isMovingCollection}
                                                    onClick={() => handleMoveCollectionSelect(c._id)}
                                                    className={`w-full px-2 py-1.5 rounded-lg text-xs font-medium text-left transition-colors flex items-center justify-between cursor-pointer ${isSelected
                                                            ? isDark ? "bg-purple-600/15 text-purple-300 font-semibold" : "bg-purple-100 text-purple-800 font-bold"
                                                            : isDark ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-100 text-gray-700"
                                                        }`}
                                                >
                                                    <span className="flex items-center gap-2 min-w-0 flex-1">
                                                        <CollectionIcon icon={c.icon} className="w-4 h-4 shrink-0" />
                                                        <span className="truncate">{c.title}</span>
                                                    </span>
                                                    {isSelected && <span className="text-purple-400 font-bold text-xs ml-1.5">✓</span>}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Card Content Body */}
                <div className="pt-2 flex flex-col flex-1 min-h-0 overflow-hidden">
                    {(effectiveType === "youtube" || effectiveType === "video") && (
                        <div className="flex flex-col gap-2.5 w-full flex-1 min-h-0 justify-between">
                            <div className="flex flex-col gap-2 min-h-0 flex-1">
                                {/* 1. Video Thumbnail / Preview */}
                                <div
                                    onClick={() => setPlayerOpen(true)}
                                    className={`relative w-full rounded-xl overflow-hidden bg-black/60 border border-white/10 group/thumb cursor-pointer shadow-md transition-all duration-300 flex-1 ${descText ? "min-h-[80px] max-h-[95px]" : "min-h-[110px] max-h-[130px]"
                                        }`}
                                >
                                    {effectiveType === "youtube" && ytThumbnailUrl && !thumbError ? (
                                        <img
                                            src={ytThumbnailUrl}
                                            alt={title}
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
                                            onError={() => setThumbError(true)}
                                        />
                                    ) : effectiveType === "video" ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-950/40 via-[#18181b] to-black gap-1.5 p-2.5">
                                            <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-500 border border-emerald-500/20">
                                                <img
                                                    width="24"
                                                    height="24"
                                                    src="https://img.icons8.com/softteal-line/24/video.png"
                                                    alt="video"
                                                    className="w-5 h-5 object-contain brightness-125 drop-shadow-[0_0_6px_rgba(72,184,166,0.35)]"
                                                />
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-mono">Video File</span>
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-950/40 via-[#18181b] to-black gap-1.5 p-2.5">
                                            <div className="p-2 rounded-xl bg-red-600/20 text-red-500 border border-red-500/20">
                                                <YoutubeIcon />
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-mono">YouTube Video</span>
                                        </div>
                                    )}

                                    {/* Play Button Overlay */}
                                    <div className="absolute inset-0 bg-black/20 group-hover/thumb:bg-black/50 transition-colors flex items-center justify-center">
                                        <div className={`rounded-xl ${effectiveType === "video" ? "bg-emerald-600/90" : "bg-red-600/90"} text-white flex items-center justify-center shadow-lg transition-all duration-300 group-hover/thumb:scale-110 ${descText ? "w-8 h-8" : "w-10 h-10"
                                            }`}>
                                            <svg className={`${descText ? "w-3.5 h-3.5" : "w-4 h-4"} fill-current ml-0.5`} viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Video Title */}
                                <h4 className={`text-xs font-bold truncate shrink-0 tracking-tight ${isDark ? "text-gray-100" : "text-gray-800"}`} title={title}>
                                    {title}
                                </h4>

                                {/* 3. Action Buttons Row */}
                                <div className="flex items-center gap-2 shrink-0 mb-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setPlayerOpen(true)}
                                        className="flex-1 py-1 px-2.5 rounded-lg bg-red-600 hover:bg-red-700 active:scale-95 text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                                    >
                                        <span>▶</span>
                                        <span>Watch Video</span>
                                    </button>
                                    <a
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`py-1 px-2.5 rounded-lg active:scale-95 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer border ${isDark ? "bg-white/10 hover:bg-white/20 text-gray-200 border-transparent" : "bg-white hover:bg-gray-50 text-gray-700 border-gray-200 shadow-xs"
                                            }`}
                                        title="Open Original Link"
                                    >
                                        <span>Open</span>
                                        <img
                                            width="24"
                                            height="24"
                                            src="https://img.icons8.com/material-outlined/24/external-link.png"
                                            alt="external-link"
                                            className={`w-3.5 h-3.5 object-contain ${isDark ? "invert opacity-85" : "opacity-75"}`}
                                        />
                                    </a>
                                </div>
                            </div>

                            {/* 4. Read-only note or placeholder (proper box with all borders & padding intact) */}
                            <div className="pt-1.5 shrink-0">
                                {renderReadOnlyNote()}
                            </div>
                        </div>
                    )}

                    {effectiveType === "twitter" && (
                        <div className="flex flex-col gap-2 w-full flex-1 min-h-0 justify-between">
                            {/* Twitter Embed Container with hidden scrollbars and clean framing */}
                            <div className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden rounded-xl border flex justify-center [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-1 ${isDark ? "bg-black/40 border-white/10 text-white" : "bg-white border-gray-200 text-black"
                                }`}>
                                <div className="w-full max-w-full flex justify-center">
                                    <blockquote className="twitter-tweet m-0" data-theme={isDark ? "dark" : "light"} data-dnt="true">
                                        <a href={link.replace("x.com", "twitter.com")}></a>
                                    </blockquote>
                                </div>
                            </div>

                            {/* Action Buttons Row matching Video & PDF cards for perfect symmetry */}
                            <div className="flex items-center gap-2 shrink-0">
                                <a
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 py-1 px-2.5 rounded-lg bg-sky-500 hover:bg-sky-600 active:scale-95 text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                                >
                                    <img
                                        width="50"
                                        height="50"
                                        src="https://img.icons8.com/ios/50/twitterx--v2.png"
                                        alt="twitterx--v2"
                                        className="w-3.5 h-3.5 object-contain invert brightness-125"
                                    />
                                    <span>View on X</span>
                                </a>
                                <a
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`py-1 px-2.5 rounded-lg active:scale-95 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer border ${isDark ? "bg-white/10 hover:bg-white/20 text-gray-200 border-transparent" : "bg-white hover:bg-gray-50 text-gray-700 border-gray-200 shadow-xs"
                                        }`}
                                    title="Open Original Link"
                                >
                                    <span>Open</span>
                                    <img
                                        width="24"
                                        height="24"
                                        src="https://img.icons8.com/material-outlined/24/external-link.png"
                                        alt="external-link"
                                        className={`w-3.5 h-3.5 object-contain ${isDark ? "invert opacity-85" : "opacity-75"}`}
                                    />
                                </a>
                            </div>

                            {/* Read-only note or placeholder */}
                            {renderReadOnlyNote()}
                        </div>
                    )}

                    {effectiveType === "pdf" && (
                        <div className="flex flex-col gap-2 h-full w-full flex-1 min-h-0 justify-between">
                            <div className={`flex-1 min-h-0 flex flex-col rounded-xl border overflow-hidden transition-colors ${isDark
                                    ? "bg-red-950/10 border-red-500/20 text-gray-200 hover:border-red-500/40"
                                    : "bg-gradient-to-b from-red-50/50 to-orange-50/30 border-red-100/50 text-gray-600 hover:border-red-300"
                                }`}>
                                {/* PDF Smart Thumbnail */}
                                <div
                                    onClick={() => setReaderOpen(true)}
                                    className={`w-full flex-1 min-h-[95px] overflow-hidden relative flex flex-col items-center justify-center gap-2 cursor-pointer group/pdf-thumb ${isDark
                                            ? 'bg-gradient-to-br from-red-950/40 via-[#18181b] to-black'
                                            : 'bg-gradient-to-br from-red-50 via-white to-red-50/30'
                                        }`}
                                    title="Click to read PDF document"
                                >
                                    {(() => {
                                        const gdMatch = link.match(/(?:\/file\/d\/|[?&]id=)([a-zA-Z0-9_-]+)/);
                                        const pdfImageUrl = gdMatch ? `https://drive.google.com/thumbnail?id=${gdMatch[1]}&sz=w800` : metadata?.image;

                                        if (pdfImageUrl && !imgError) {
                                            return (
                                                <img
                                                    src={pdfImageUrl}
                                                    alt={title}
                                                    referrerPolicy="no-referrer"
                                                    className="w-full h-full object-cover object-top origin-top transition-transform duration-300 group-hover/pdf-thumb:scale-105"
                                                    onError={() => setImgError(true)}
                                                />
                                            );
                                        }
                                        return (
                                            <>
                                                <div className={`p-2.5 rounded-2xl shadow-sm ${isDark ? 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-red-900/20'
                                                        : 'bg-red-100 text-red-600 border border-red-200 shadow-red-200/50'
                                                    }`}>
                                                    <PdfIcon className="w-7 h-7" />
                                                </div>
                                                <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-red-400/80" : "text-red-600/80"}`}>
                                                    PDF Document
                                                </span>
                                            </>
                                        );
                                    })()}
                                </div>

                                {/* Action Buttons */}
                                <div className={`p-1.5 shrink-0 border-t ${isDark ? "border-white/5" : "border-red-100/50"}`}>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setReaderOpen(true)}
                                            className="flex-1 py-1 px-2.5 rounded-lg bg-red-600 hover:bg-red-700 active:scale-95 text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                                        >
                                            <img
                                                width="64"
                                                height="64"
                                                src="https://img.icons8.com/glyph-neue/64/read.png"
                                                alt="read"
                                                className="w-4.5 h-4.5 object-contain invert brightness-125"
                                            />
                                            <span>Read</span>
                                        </button>
                                        <a
                                            href={link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`py-1 px-2.5 rounded-lg active:scale-95 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer border ${isDark ? "bg-white/10 hover:bg-white/20 text-gray-200 border-transparent" : "bg-white hover:bg-gray-50 text-gray-700 border-gray-200 shadow-xs"
                                                }`}
                                            title="Open Original Link"
                                        >
                                            <span>Open</span>
                                            <img
                                                width="24"
                                                height="24"
                                                src="https://img.icons8.com/material-outlined/24/external-link.png"
                                                alt="external-link"
                                                className={`w-3.5 h-3.5 object-contain ${isDark ? "invert opacity-85" : "opacity-75"}`}
                                            />
                                        </a>
                                    </div>
                                </div>
                            </div>
                            {renderReadOnlyNote()}
                        </div>
                    )}

                    {isArticle && (
                        <div className="flex flex-col gap-2 h-full w-full flex-1 min-h-0 justify-between">
                            <div className={`flex-1 min-h-0 flex flex-col rounded-xl border overflow-hidden transition-colors ${isDark
                                    ? "bg-purple-950/10 border-purple-500/20 text-gray-200 hover:border-purple-500/40"
                                    : "bg-gradient-to-b from-purple-50/50 to-indigo-50/30 border-purple-100/50 text-gray-600 hover:border-purple-300"
                                }`}>
                                {/* Visual Image / Thumbnail */}
                                <div
                                    onClick={(e) => openFloatingBrowser(normalizedLink, e)}
                                    className={`w-full flex-1 min-h-[95px] overflow-hidden relative flex flex-col items-center justify-center cursor-pointer group/article-thumb ${isDark ? "bg-black/40" : "bg-gray-100"
                                        }`}
                                    title="Click to preview website in preview window"
                                >
                                    {hasImage ? (
                                        <img
                                            src={metadata!.image}
                                            alt={title}
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover/article-thumb:scale-105"
                                            onError={() => setImgError(true)}
                                        />
                                    ) : (
                                        <div className={`w-full h-full flex flex-col items-center justify-center gap-2 p-3 ${isDark ? "text-purple-400" : "text-purple-600"
                                            }`}>
                                            {metadata?.favicon ? (
                                                <img src={metadata.favicon} alt="" className="w-10 h-10 rounded-xl p-1.5 bg-white/10 object-contain shadow-sm" />
                                            ) : (
                                                <div className="p-2.5 rounded-2xl bg-purple-600/20 text-purple-500 border border-purple-500/20">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                    </svg>
                                                </div>
                                            )}
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-purple-400/80" : "text-purple-600/80"}`}>
                                                {metadata?.domain || "Web Article"}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons: Preview (Left) and Open (Right) */}
                                <div className={`p-1.5 shrink-0 border-t ${isDark ? "border-white/5" : "border-purple-100/50"}`}>
                                    <div className="flex items-center gap-2">
                                        {/* Preview Button (Left side) - Launches Standalone Preview Tab Window (0% blockage) */}
                                        <button
                                            type="button"
                                            onClick={(e) => openFloatingBrowser(normalizedLink, e)}
                                            className="flex-1 py-1 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                                            title="Preview website in new preview window (unblocked, full website)"
                                        >
                                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                            <span>Preview</span>
                                        </button>

                                        {/* Open Button (Right side) */}
                                        <a
                                            href={normalizedLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`py-1 px-2.5 rounded-lg active:scale-95 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer border ${isDark ? "bg-white/10 hover:bg-white/20 text-gray-200 border-transparent" : "bg-white hover:bg-gray-50 text-gray-700 border-gray-200 shadow-xs"
                                                }`}
                                            title="Open Original Link"
                                        >
                                            <span>Open</span>
                                            <img
                                                width="24"
                                                height="24"
                                                src="https://img.icons8.com/material-outlined/24/external-link.png"
                                                alt="external-link"
                                                className={`w-3.5 h-3.5 object-contain ${isDark ? "invert opacity-85" : "opacity-75"}`}
                                            />
                                        </a>
                                    </div>
                                </div>
                            </div>
                            {renderReadOnlyNote()}
                        </div>
                    )}
                </div>

                {/* Upward-Opening Note Panel (Reading / Expanded Mode and Edit Mode) */}
                {renderUpwardNoteEditor()}
            </div>

            {/* Full-Screen PDF Reader Modal Overlay */}
            {readerOpen && typeof document !== "undefined" && createPortal(
                <div
                    onClick={() => setReaderOpen(false)}
                    className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-2xl flex flex-col p-3 sm:p-6 animate-in fade-in duration-200"
                    style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex flex-col h-full w-full"
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-white/10 text-white shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 rounded-xl bg-red-500/20 text-red-400 shrink-0">
                                    <img
                                        src="https://img.icons8.com/fluency-systems-regular/48/pdf-2.png"
                                        alt="pdf-2"
                                        className="w-5 h-5 object-contain invert brightness-125"
                                    />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-base text-white truncate max-w-md sm:max-w-xl">{title}</h3>
                                    <span className="text-xs text-gray-400 block truncate">{domainName || "PDF Document"}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <a
                                    href={normalizedLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                                >
                                    <span>Open Original</span>
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setReaderOpen(false)}
                                    className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-base font-bold flex items-center justify-center w-9 h-9 border border-white/10"
                                    title="Close Reader (ESC)"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Main Full-Height Viewer Container */}
                        <div className="flex-1 w-full mt-3 rounded-2xl overflow-hidden border border-white/10 bg-[#121212] shadow-2xl relative">
                            <iframe
                                src={getPdfViewerUrl(normalizedLink)}
                                className="w-full h-full border-0"
                                title={title}
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Video Player Modal Overlay (YouTube & Native Video) */}
            {playerOpen && typeof document !== "undefined" && createPortal(
                <div
                    onClick={() => setPlayerOpen(false)}
                    className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-2xl flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
                    style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-4xl flex flex-col items-center"
                    >
                        <div className="w-full flex justify-end mb-4">
                            <button
                                type="button"
                                onClick={() => setPlayerOpen(false)}
                                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold border border-white/20 transition-all cursor-pointer flex items-center gap-2 shadow-md"
                            >
                                <span>Close Video</span>
                                <span className="text-lg leading-none">✕</span>
                            </button>
                        </div>
                        <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col shrink-0">
                            {type === "youtube" ? (
                                <iframe
                                    src={`${getYouTubeEmbedUrl(link)}?autoplay=1`}
                                    title={title}
                                    className="w-full h-full border-0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            ) : (
                                <video
                                    src={normalizedLink}
                                    controls
                                    autoPlay
                                    className="w-full h-full outline-none"
                                    controlsList="nodownload"
                                >
                                    Your browser does not support the video tag.
                                </video>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}



            {/* Blurred Previous Tab Overlay when Floating Preview Window is Open */}
            {isFloatingPreviewActive && typeof document !== "undefined" && createPortal(
                <div
                    onClick={() => setIsFloatingPreviewActive(false)}
                    className="fixed inset-0 z-[9998] bg-black/65 backdrop-blur-2xl flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200 select-none cursor-pointer"
                    style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
                    title="Click anywhere to dismiss blur"
                >
                    {/* Floating Status Notification Glass Card */}
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex flex-col items-center text-center max-w-sm w-full p-6 rounded-2xl bg-[#141416]/90 border border-purple-500/30 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200 cursor-default"
                    >
                        {/* Glowing Icon */}
                        <div className="relative mb-3 flex items-center justify-center">
                            <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner">
                                <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </div>
                            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-purple-500"></span>
                            </span>
                        </div>

                        <h4 className="text-white font-bold text-sm sm:text-base mb-1 truncate max-w-full">
                            {title || "Website Preview Open"}
                        </h4>
                        <p className="text-[11px] text-purple-300/80 mb-3 truncate max-w-full font-mono">
                            {domainName || normalizedLink}
                        </p>
                        <p className="text-xs text-gray-400 mb-5 leading-relaxed">
                            Previous tab is blurred while preview window is active.
                        </p>

                        <div className="flex items-center gap-2.5 w-full">
                            <button
                                type="button"
                                onClick={() => {
                                    try {
                                        floatingPopupRef.current?.focus();
                                    } catch { }
                                }}
                                className="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-semibold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                            >
                                <span>Focus Window</span>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsFloatingPreviewActive(false)}
                                className="py-2 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-gray-300 hover:text-white text-xs font-semibold border border-white/10 transition-all cursor-pointer"
                            >
                                Dismiss
                            </button>
                        </div>

                        <span className="text-[10px] text-gray-500 mt-3.5">
                            Click background or press ESC to dismiss blur
                        </span>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};
