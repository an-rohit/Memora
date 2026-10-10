import { useCallback, useEffect, useRef, useState } from "react";
import { CrossIcon } from "../../icons/crossIcon";
import { Button } from "./Button";
import axios from "axios";
import { BACKEND_URL } from "../../config";
import type { ContentType } from "../../types/content";

import { YoutubeIcon } from "../../icons/youtube";
import { TwitterIcon } from "../../icons/twitter";
import { PdfIcon } from "../../icons/pdfIcon";

interface ContentModalProps {
    open: boolean;
    onClose: () => void;
    type?: ContentType;
    onSuccess?: () => void;
}

interface LinkMetadata {
    title: string;
    description: string;
    image: string;
    favicon: string;
    domain: string;
}

const TYPES: { label: string; value: ContentType; renderIcon: () => React.ReactNode }[] = [
    { label: "YouTube", value: "youtube", renderIcon: () => <YoutubeIcon /> },
    { label: "Twitter / X", value: "twitter", renderIcon: () => <TwitterIcon /> },
    { label: "Video File", value: "video", renderIcon: () => (
        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
    ) },
    { label: "Article", value: "article", renderIcon: () => (
        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
    ) },
    { label: "PDF Doc", value: "pdf", renderIcon: () => <PdfIcon className="w-4 h-4 text-red-500" /> },
];

function isValidUrl(str: string): boolean {
    try {
        const url = new URL(str.startsWith("http") ? str : `https://${str}`);
        return !!url.hostname.includes(".");
    } catch {
        return false;
    }
}

export function CreateContentModal({ open, onClose, type: initialType = "youtube", onSuccess }: ContentModalProps) {
    const titleRef = useRef<HTMLInputElement | null>(null);
    const linkRef = useRef<HTMLInputElement | null>(null);
    const descRef = useRef<HTMLTextAreaElement | null>(null);
    const [type, setType] = useState<ContentType>(initialType);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
    const [fetchingMeta, setFetchingMeta] = useState(false);
    const [titleManuallyEdited, setTitleManuallyEdited] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (open) {
            setMetadata(null);
            setFetchingMeta(false);
            setTitleManuallyEdited(false);
            setError(null);
            setIsDropdownOpen(false);
        }
    }, [open]);

    const fetchMetadata = useCallback(async (url: string) => {
        if (!isValidUrl(url)) return;
        try {
            setFetchingMeta(true);
            const response = await axios.get(`${BACKEND_URL}/api/v1/content/preview/metadata`, {
                params: { url },
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });
            const data: LinkMetadata = response.data;
            setMetadata(data);
            // Auto-fill title only if user hasn't manually edited it and the title is meaningful (not just domain)
            const isMeaningfulTitle = data.title && data.domain && data.title.toLowerCase() !== data.domain.toLowerCase();
            if (!titleManuallyEdited && isMeaningfulTitle && titleRef.current) {
                titleRef.current.value = data.title;
            }
        } catch {
            // Silently fail — metadata is optional enrichment
        } finally {
            setFetchingMeta(false);
        }
    }, [titleManuallyEdited]);

    const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawVal = e.target.value.trim();
        const val = rawVal.toLowerCase();

        if (val.includes(".pdf") || val.includes("/pdf") || val.includes("arxiv.org/pdf")) {
            setType("pdf");
        } else if (val.includes("youtube.com") || val.includes("youtu.be")) {
            setType("youtube");
        } else if (val.includes(".mp4") || val.includes(".webm") || val.includes(".ogg")) {
            setType("video");
        } else if (val.includes("x.com") || val.includes("twitter.com")) {
            setType("twitter");
        } else if (isValidUrl(rawVal)) {
            setType("article");
        }

        // Debounce metadata fetch
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            if (rawVal && isValidUrl(rawVal)) {
                fetchMetadata(rawVal);
            } else {
                setMetadata(null);
            }
        }, 500);
    };

    async function addContent(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const title = titleRef.current?.value?.trim();
        const link = linkRef.current?.value?.trim();
        const description = descRef.current?.value?.trim() || "";

        if (!title || !link) {
            setError("Please fill in both title and link URL.");
            return;
        }

        try {
            setLoading(true);
            await axios.post(
                `${BACKEND_URL}/api/v1/content`,
                { link, type, title, description },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    }
                }
            );

            if (onSuccess) onSuccess();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to add memory. Please check URL.");
        } finally {
            setLoading(false);
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#111] rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl w-full max-w-lg overflow-hidden p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto transform transition-all">
                {/* Header */}
                <div className="flex items-center justify-between pb-5 border-b border-gray-100 dark:border-white/10">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Add New Memory</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Save videos, tweets, articles or PDFs to your second brain</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                    >
                        <CrossIcon />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={addContent} className="mt-6 flex flex-col gap-5">
                    {error && (
                        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Content Type Selector */}
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-2">
                            Select Type
                        </label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm focus:border-purple-500 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all cursor-pointer"
                            >
                                <div className="flex items-center gap-2">
                                    {type === "article" && metadata?.favicon ? (
                                        <img src={metadata.favicon} alt="" className="w-5 h-5 rounded-sm object-contain bg-white p-0.5" />
                                    ) : (
                                        TYPES.find(t => t.value === type)?.renderIcon()
                                    )}
                                    <span className="font-medium">{TYPES.find(t => t.value === type)?.label}</span>
                                </div>
                                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            
                            {isDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 p-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {TYPES.map((t) => (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => {
                                                setType(t.value);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                                                type === t.value
                                                    ? "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                                            }`}
                                        >
                                            {t.value === "article" && metadata?.favicon ? (
                                                <img src={metadata.favicon} alt="" className="w-5 h-5 rounded-sm object-contain bg-white p-0.5" />
                                            ) : (
                                                t.renderIcon()
                                            )}
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Link Input */}
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1.5">
                            URL / Link
                        </label>
                        <div className="relative">
                            <input
                                ref={linkRef}
                                type="text"
                                onChange={handleLinkChange}
                                placeholder="https://youtube.com/..., https://arxiv.org/pdf/... or PDF URL"
                                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm focus:border-purple-500 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-500/20 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                            />
                            {fetchingMeta && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Live Metadata Preview */}
                    {metadata && (metadata.title || metadata.image) && (
                        <div className="rounded-xl border border-purple-100 dark:border-purple-500/20 bg-gradient-to-br from-purple-50/60 to-indigo-50/40 dark:from-purple-500/10 dark:to-indigo-500/10 p-3 flex gap-3 items-start animate-in fade-in duration-300">
                            {metadata.image && (
                                <img
                                    src={metadata.image}
                                    alt="Preview"
                                    className="w-16 h-16 rounded-lg object-cover shrink-0 border border-gray-200 dark:border-white/10"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-1">
                                    {metadata.favicon && (
                                        <img src={metadata.favicon} alt="" className="w-3.5 h-3.5 rounded-sm bg-white" />
                                    )}
                                    <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                                        {metadata.domain || "Preview"}
                                    </span>
                                </div>
                                {metadata.title && (
                                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 line-clamp-1">{metadata.title}</p>
                                )}
                                {metadata.description && (
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{metadata.description}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Title Input */}
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1.5">
                            Memory Title
                            {metadata?.title && !titleManuallyEdited && (
                                <span className="ml-2 text-[10px] font-medium text-purple-500 dark:text-purple-400 normal-case tracking-normal">
                                    ✨ Auto-filled from link
                                </span>
                            )}
                        </label>
                        <input
                            ref={titleRef}
                            type="text"
                            onChange={() => setTitleManuallyEdited(true)}
                            placeholder="e.g. Building Next-Gen Web Apps with React"
                            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm focus:border-purple-500 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-500/20 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                        />
                    </div>

                    {/* Description Input */}
                    {type !== "twitter" && (
                        <div>
                            <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1.5">
                                Personal Notes / Description <span className="font-normal lowercase">(optional)</span>
                            </label>
                            <textarea
                                ref={descRef}
                                rows={2}
                                placeholder="Add your thoughts or summary here..."
                                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm focus:border-purple-500 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-500/20 outline-none transition-all resize-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
                            />
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-2 flex justify-end gap-3">
                        <Button
                            variant="secondary"
                            text="Cancel"
                            size="md"
                            onClick={onClose}
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center min-w-[140px]"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                "Save Memory"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}



