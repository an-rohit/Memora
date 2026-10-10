import { useEffect, useState, useRef } from "react";
import { ShareIcon } from "../../icons/shareIcon";
import { Delete } from "../../icons/delete";
import { YoutubeIcon } from "../../icons/youtube";
import { TwitterIcon } from "../../icons/twitter";
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

interface CardProps {
    _id: string;
    title: string;
    link: string;
    type: ContentType;
    description?: string;
    onDelete: (id: string) => void;
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
      return `https://www.youtube.com/embed/${id}`;
    }
    if (link.includes("watch?v=")) {
      const id = link.split("watch?v=")[1]?.split("&")[0];
      return `https://www.youtube.com/embed/${id}`;
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
    if (rawUrl.includes("drive.google.com/file/d/")) {
      const fileId = rawUrl.split("drive.google.com/file/d/")[1]?.split("/")[0];
      if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
      }
    }
    return `https://docs.google.com/gview?url=${encodeURIComponent(rawUrl)}&embedded=true`;
  } catch {
    return link;
  }
}

export const Card = ({ _id, title, link, type, description, onDelete, onCopyToast, isDark }: CardProps) => {
    const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
    const [imgError, setImgError] = useState(false);
    const [readerOpen, setReaderOpen] = useState(false);
    
    // Description state
    const [descText, setDescText] = useState(description || "");
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [isSavingDesc, setIsSavingDesc] = useState(false);
    const [isNoteExpanded, setIsNoteExpanded] = useState(false);
    const [thumbError, setThumbError] = useState(false);
    const [playerOpen, setPlayerOpen] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustTextareaHeight = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.max(68, el.scrollHeight)}px`;
    };

    useEffect(() => {
        setDescText(description || "");
        setIsNoteExpanded(false);
    }, [description]);

    useEffect(() => {
        if (isEditingDesc) {
            const timer = setTimeout(() => {
                adjustTextareaHeight();
                const el = textareaRef.current;
                if (el) {
                    el.focus();
                    const len = el.value.length;
                    el.setSelectionRange(len, len);
                    el.scrollTop = el.scrollHeight;
                }
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isEditingDesc]);

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
        }).catch(() => {});
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
            if (onCopyToast) onCopyToast("Description saved 📝");
        } catch (err) {
            console.error("Save description failed", err);
            if (onCopyToast) onCopyToast("Failed to save description");
        } finally {
            setIsSavingDesc(false);
        }
    };


    const isSharedBrain = type === "shared_brain";
    const isArticle = type !== "youtube" && type !== "twitter" && type !== "pdf" && type !== "shared_brain" && type !== "video";
    const hasImage = isArticle && metadata?.image && !imgError;
    const domainName = metadata?.domain || (() => { try { return new URL(link.startsWith("http") ? link : `https://${link}`).hostname; } catch { return ""; } })();
    const ytVideoId = getYouTubeVideoId(link);
    const ytThumbnailUrl = ytVideoId ? `https://img.youtube.com/vi/${ytVideoId}/hqdefault.jpg` : null;

    return (
        <>
        <div className={`rounded-2xl border p-5 shadow-sm hover:shadow-xl transition-[shadow,transform] duration-300 ease-out flex flex-col w-full hover:-translate-y-1 group relative overflow-hidden h-auto ${
            isDark 
                ? "bg-[#1e1d1b] border-white/10 text-gray-100 hover:border-purple-500/40 shadow-black/40" 
                : "bg-white border-gray-200/80 text-gray-800"
        }`}>
            {/* Card Header */}
            <div className={`flex items-start justify-between gap-3 shrink-0 pb-3 border-b ${
                isDark ? "border-white/10" : "border-gray-100"
            }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-xl shrink-0 ${
                        type === "youtube" ? (isDark ? "bg-red-500/15 text-red-400" : "bg-red-50 text-red-500") :
                        type === "twitter" ? (isDark ? "bg-sky-500/15 text-sky-400" : "bg-sky-50 text-sky-500") : 
                        type === "pdf" ? (isDark ? "bg-red-500/20 text-red-400" : "bg-red-50 text-red-600") :
                        type === "video" ? (isDark ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-50 text-emerald-500") :
                        isSharedBrain ? (isDark ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-50 text-emerald-600") :
                        (isDark ? "bg-purple-500/15 text-purple-400" : "bg-purple-50 text-purple-600")
                    }`}>
                        {type === "youtube" && <YoutubeIcon />}
                        {type === "twitter" && <TwitterIcon />}
                        {type === "pdf" && <PdfIcon className="w-5 h-5 text-red-500" />}
                        {type === "video" && (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
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
                        <h3 className={`truncate font-bold text-base transition-colors ${
                            isDark ? "text-gray-100 group-hover:text-purple-400" : "text-gray-800 group-hover:text-purple-600"
                        }`} title={title}>
                            {title}
                        </h3>
                        <span className={`text-[11px] font-semibold capitalize ${isDark ? "text-gray-400" : "text-gray-400"}`}>
                            {isSharedBrain ? "Memora Vault" : (domainName || type)}
                        </span>
                    </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 text-gray-400">
                    <button 
                        onClick={handleCopy}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isDark ? "hover:bg-white/10 hover:text-white" : "hover:bg-gray-100 hover:text-gray-600"
                        }`}
                        title="Copy Link"
                    >
                        <ShareIcon size="md"/>
                    </button>
                    <button 
                        onClick={() => onDelete(_id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isDark ? "hover:bg-red-500/20 hover:text-red-400" : "hover:bg-red-50 hover:text-red-500"
                        }`}
                        title="Delete Memory"
                    >
                        <Delete size="md"/>
                    </button>
                </div>
            </div>

            {/* Card Content Body */}
            <div className={`pt-3 flex flex-col ${type === "youtube" || type === "video" ? "w-full" : "flex-1 min-h-0 overflow-hidden"}`}>
                {(type === "youtube" || type === "video") && (() => {
                    // Split text into initial 2-line head and remaining tail for clean symmetrical preview
                    const lines = descText.split("\n");
                    const hasLineBreaks = lines.length > 2;
                    let headText = descText;
                    let tailText = "";

                    if (hasLineBreaks) {
                        headText = lines.slice(0, 2).join("\n");
                        tailText = lines.slice(2).join("\n");
                    } else if (descText.length > 70) {
                        const breakIdx = descText.lastIndexOf(" ", 70);
                        const splitAt = breakIdx > 35 ? breakIdx : 70;
                        headText = descText.slice(0, splitAt);
                        tailText = descText.slice(splitAt);
                    }

                    const isLongText = Boolean(tailText);

                    return (
                    <div className="flex flex-col gap-2.5 w-full">
                        {/* 1. Video Thumbnail / Preview — 16:9 Aspect Ratio (Stable & Fixed in normal flow) */}
                        <div 
                            onClick={() => setPlayerOpen(true)}
                            className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/60 border border-white/10 group/thumb cursor-pointer shrink-0 shadow-md"
                        >
                            {type === "youtube" && ytThumbnailUrl && !thumbError ? (
                                <img
                                    src={ytThumbnailUrl}
                                    alt={title}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
                                    onError={() => setThumbError(true)}
                                />
                            ) : type === "video" ? (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-950/40 via-[#18181b] to-black gap-2 p-4">
                                    <div className="p-3 rounded-2xl bg-emerald-600/20 text-emerald-500 border border-emerald-500/20">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <span className="text-xs text-gray-400 font-mono">Video File</span>
                                </div>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-950/40 via-[#18181b] to-black gap-2 p-4">
                                    <div className="p-3 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/20">
                                        <YoutubeIcon />
                                    </div>
                                    <span className="text-xs text-gray-400 font-mono">YouTube Video</span>
                                </div>
                            )}
                            
                            {/* Play Button Overlay */}
                            <div className="absolute inset-0 bg-black/20 group-hover/thumb:bg-black/50 transition-colors flex items-center justify-center">
                                <div className={`w-10 h-10 rounded-2xl ${type === "video" ? "bg-emerald-600/90" : "bg-red-600/90"} text-white flex items-center justify-center shadow-lg transition-transform group-hover/thumb:scale-110`}>
                                    <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z"/>
                                    </svg>
                                </div>
                            </div>

                            <span className="absolute bottom-1.5 right-1.5 text-[9px] font-bold uppercase tracking-wider bg-black/80 backdrop-blur-xs text-white px-1.5 py-0.5 rounded-md border border-white/10">
                                16:9
                            </span>
                        </div>

                        {/* 2. Video Title (Stable & Fixed in normal flow) */}
                        <h4 className="text-xs font-bold text-gray-100 truncate shrink-0 tracking-tight" title={title}>
                            {title}
                        </h4>

                        {/* 3. Description Note & Editor Section (Dual Persistent Grid Slots for Smooth Transitions) */}
                        <div className="w-full">
                            {/* 1. Edit Mode Accordion Slot */}
                            <div 
                                className="grid transition-all duration-250 ease-out overflow-hidden"
                                style={{
                                    gridTemplateRows: isEditingDesc ? "1fr" : "0fr",
                                    opacity: isEditingDesc ? 1 : 0,
                                    transitionProperty: "grid-template-rows, opacity",
                                    transitionDuration: "250ms",
                                    transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                                    pointerEvents: isEditingDesc ? "auto" : "none"
                                }}
                            >
                                <div className="overflow-hidden min-h-0">
                                    <div className="flex flex-col rounded-xl bg-[#141414] border border-white/10 focus-within:border-purple-500/40 focus-within:ring-1 focus-within:ring-purple-500/20 p-2.5 shadow-inner">
                                        <textarea
                                            ref={textareaRef}
                                            value={descText}
                                            onChange={(e) => {
                                                setDescText(e.target.value);
                                                adjustTextareaHeight();
                                            }}
                                            placeholder="Write a note about this video..."
                                            rows={2}
                                            className="w-full bg-transparent text-xs text-gray-200 placeholder:text-gray-500/80 outline-none resize-none leading-relaxed font-normal overflow-hidden"
                                        />
                                        <div className="flex items-center justify-end gap-2 pt-2 mt-1 border-t border-white/5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDescText(description || "");
                                                    setIsEditingDesc(false);
                                                    setIsNoteExpanded(false);
                                                }}
                                                className="px-2.5 py-1 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSaveDescription}
                                                disabled={isSavingDesc}
                                                className="px-3 py-1 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
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
                                    </div>
                                </div>
                            </div>

                            {/* 2. View Mode Accordion Slot */}
                            {descText ? (
                                <div 
                                    className="grid transition-all duration-250 ease-out overflow-hidden"
                                    style={{
                                        gridTemplateRows: isEditingDesc ? "0fr" : "1fr",
                                        opacity: isEditingDesc ? 0 : 1,
                                        transitionProperty: "grid-template-rows, opacity",
                                        transitionDuration: "250ms",
                                        transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                                        pointerEvents: isEditingDesc ? "none" : "auto"
                                    }}
                                >
                                    <div className="overflow-hidden min-h-0">
                                        <div
                                            onClick={() => {
                                                if (isLongText) {
                                                    setIsNoteExpanded((prev) => !prev);
                                                }
                                            }}
                                            className={`group/desc text-xs text-gray-300 leading-relaxed p-2.5 rounded-xl bg-[#141414] hover:bg-[#181818] border border-white/5 hover:border-purple-500/30 transition-colors ${
                                                isLongText ? "cursor-pointer" : ""
                                            }`}
                                            title={isLongText ? (isNoteExpanded ? "Click to collapse note" : "Click to expand note") : undefined}
                                        >
                                            {/* Head Text (Lines 1-2, always solid at top) */}
                                            <p className="text-gray-300/90 text-xs leading-relaxed whitespace-pre-wrap">
                                                {headText}
                                            </p>

                                            {/* Tail Text (Smooth 250ms Grid Accordion unfolding strictly downward) */}
                                            {isLongText && (
                                                <div 
                                                    className="grid transition-all duration-250 ease-out overflow-hidden"
                                                    style={{
                                                        gridTemplateRows: isNoteExpanded ? "1fr" : "0fr",
                                                        transitionProperty: "grid-template-rows",
                                                        transitionDuration: "250ms",
                                                        transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)"
                                                    }}
                                                >
                                                    <div className="overflow-hidden min-h-0">
                                                        <p className="text-gray-300/90 text-xs leading-relaxed whitespace-pre-wrap pt-0.5">
                                                            {tailText}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-white/5 text-[10px] text-gray-500">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-purple-400/80">Saved Note</span>
                                                    {isLongText && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setIsNoteExpanded((prev) => !prev);
                                                            }}
                                                            className="font-semibold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                                                        >
                                                            {isNoteExpanded ? "Show less" : "Read more"}
                                                        </button>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsEditingDesc(true);
                                                    }}
                                                    className="text-purple-400 hover:text-purple-300 transition-colors cursor-pointer font-semibold flex items-center gap-1 bg-purple-500/10 hover:bg-purple-500/20 px-2 py-0.5 rounded-md border border-purple-500/20"
                                                    title="Edit description"
                                                >
                                                    <span>✎ Edit</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Empty State: + Add note Action */
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingDesc(true)}
                                        className="inline-flex items-center gap-1.5 text-xs text-purple-400/90 hover:text-purple-300 font-medium py-1 px-2.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-colors cursor-pointer"
                                    >
                                        <span>+ Add note</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    );
                })()}

                {type === "twitter" && (
                    <div className={`max-h-[300px] overflow-y-auto overflow-x-hidden rounded-xl border flex justify-center ${
                        isDark ? "bg-[#181715] border-white/10 text-white" : "bg-white border-gray-200 text-black"
                    } scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent`}> 
                        <div className="w-full max-w-full scale-[0.98] origin-top">
                            <blockquote className="twitter-tweet m-0" data-theme={isDark ? "dark" : "light"}>
                                <a href={link.replace("x.com", "twitter.com")}></a>
                            </blockquote>
                        </div>
                    </div>
                )}

                {type === "pdf" && (
                    <div className="h-full flex flex-col rounded-xl border border-red-500/20 bg-gradient-to-b from-[#221515] via-[#1a1818] to-[#141212] overflow-hidden p-4 justify-between">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center shrink-0">
                                    <PdfIcon className="w-7 h-7 text-red-500" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 block">PDF Document</span>
                                    <h4 className="text-sm font-bold text-white line-clamp-1 mt-0.5">{title}</h4>
                                    <span className="text-[11px] text-gray-400 block truncate">{domainName}</span>
                                </div>
                            </div>
                            
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-300 leading-relaxed flex items-start gap-2">
                                <span className="text-red-400 text-sm">📄</span>
                                <span className="line-clamp-2">Click below to open full distraction-free document reader or original link.</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setReaderOpen(true)}
                                className="flex-1 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                            >
                                <span>Read Document 📖</span>
                            </button>
                            <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-gray-200 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                                title="Open Original Link"
                            >
                                <span>Link ↗️</span>
                            </a>
                        </div>
                    </div>
                )}

                {isArticle && (
                    <a 
                        href={link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`h-full flex flex-col rounded-xl border overflow-hidden transition-colors ${
                            isDark 
                                ? "bg-purple-950/20 border-purple-500/20 text-gray-200 hover:border-purple-500/40" 
                                : "bg-gradient-to-b from-purple-50/50 to-indigo-50/30 border-purple-100/50 text-gray-600 hover:border-purple-300"
                        }`}
                    >
                        {/* OG Image */}
                        {hasImage && (
                            <div className="w-full h-40 shrink-0 overflow-hidden bg-gray-100">
                                <img
                                    src={metadata!.image}
                                    alt={title}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    onError={() => setImgError(true)}
                                />
                            </div>
                        )}

                        {/* Text Content */}
                        <div className={`flex flex-col justify-between flex-1 p-4 ${hasImage ? "" : ""}`}>
                            <div className="flex flex-col gap-2">
                                {/* Domain Badge */}
                                <div className="flex items-center gap-1.5">
                                    {metadata?.favicon && (
                                        <img src={metadata.favicon} alt="" className="w-3.5 h-3.5 rounded-sm" />
                                    )}
                                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-purple-400" : "text-purple-600"}`}>
                                        {metadata?.domain || "Bookmarked Link"}
                                    </span>
                                </div>

                                <p className={`text-sm font-semibold line-clamp-2 ${isDark ? "text-gray-100" : "text-gray-800"}`}>
                                    {title}
                                </p>

                                {metadata?.description && (
                                    <p className={`text-xs line-clamp-3 leading-relaxed ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                        {metadata.description}
                                    </p>
                                )}
                            </div>

                            <div className={`inline-flex items-center gap-2 text-xs font-semibold pt-3 ${
                                isDark ? "text-purple-400" : "text-purple-600"
                            }`}>
                                <span>Open Link</span>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </div>
                        </div>
                    </a>
                )}

                {isSharedBrain && (
                    <div className={`h-full flex flex-col rounded-xl border overflow-hidden p-4 justify-between transition-colors ${
                        isDark 
                            ? "border-emerald-500/20 bg-gradient-to-b from-emerald-950/20 via-[#1a1818] to-[#141212]" 
                            : "border-emerald-200 bg-gradient-to-b from-emerald-50 to-white shadow-sm"
                    }`}>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                                    isDark ? "bg-emerald-500/15 border-emerald-500/20 text-emerald-500" : "bg-emerald-100 border-emerald-200 text-emerald-600"
                                }`}>
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                                        Shared Brain Vault
                                    </span>
                                    <a 
                                        href={link} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className={`text-sm font-bold hover:underline line-clamp-1 mt-0.5 cursor-pointer transition-colors ${
                                            isDark ? "text-emerald-100 hover:text-emerald-400" : "text-gray-900 hover:text-emerald-700"
                                        }`}
                                    >
                                        {title}
                                    </a>
                                </div>
                            </div>
                            
                            <div className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2 ${
                                isDark ? "bg-white/5 border-white/5 text-gray-300" : "bg-white border-emerald-100 text-gray-600 shadow-sm"
                            }`}>
                                <span className="text-emerald-500 text-sm">🧠</span>
                                <span className="line-clamp-2">{description || "Explore this shared knowledge collection."}</span>
                            </div>
                        </div>

                        <div className={`flex items-center gap-2 pt-3 mt-2 border-t ${isDark ? "border-white/10" : "border-emerald-100"}`}>
                            <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                            >
                                <span>Open Vault ↗️</span>
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Full-Screen PDF Reader Modal Overlay */}
        {readerOpen && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xl flex flex-col p-3 sm:p-6 animate-in fade-in duration-200">
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10 text-white shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-red-500/20 text-red-400 shrink-0">
                            <PdfIcon className="w-5 h-5 text-red-400" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-base text-white truncate max-w-md sm:max-w-xl">{title}</h3>
                            <span className="text-xs text-gray-400 block truncate">{domainName || "PDF Document"}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <a
                            href={link}
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
                        src={getPdfViewerUrl(link)}
                        className="w-full h-full border-0"
                        title={title}
                    />
                </div>
            </div>
        )}

        {/* Video Player Modal Overlay (YouTube & Native Video) */}
        {playerOpen && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
                <div className="w-full max-w-4xl flex justify-end mb-4">
                    <button
                        type="button"
                        onClick={() => setPlayerOpen(false)}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold border border-white/20 transition-all cursor-pointer flex items-center gap-2 shadow-md"
                    >
                        <span>Close Video</span>
                        <span className="text-lg leading-none">✕</span>
                    </button>
                </div>
                <div className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col shrink-0">
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
                            src={link} 
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
        )}
        </>
    );
};
