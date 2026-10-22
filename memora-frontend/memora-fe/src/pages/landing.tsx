import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { Logo } from "../icons/logo";
import { YoutubeIcon } from "../icons/youtube";
import { TwitterIcon } from "../icons/twitter";
import { ShareIcon } from "../icons/shareIcon";
import { Delete } from "../icons/delete";
import { PlusIcon } from "../icons/plusicon";

// ---------- scroll reveal ----------

// tells us once an element has scrolled into view, then stops watching it
function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}

// fades + slides its children up when they enter the screen
function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out ${inView ? "opacity-100 translate-y-0" : "motion-safe:opacity-0 motion-safe:translate-y-8"} ${className}`}
    >
      {children}
    </div>
  );
}

// ---------- hero ----------

// each word has its own soft background + dot colour; the last word leads back to "Anything"
const pillWords = [
  { word: "Anything", bg: "#D3E8FF", dot: "#087FE5" },
  { word: "Videos", bg: "#FBD9DB", dot: "#E03E3E" },
  { word: "Tweets", bg: "#E6E6E3", dot: "#191919" },
  { word: "PDFs", bg: "#F9DCC4", dot: "#D9730D" },
  { word: "Articles", bg: "#CFE8D6", dot: "#2E9E5B" },
  { word: "Notes", bg: "#F8EAC0", dot: "#DFAB01" },
];

// Notion-style pill that sits inside the headline: soft capsule, coloured dot, cycling word
function RotatingPill() {
  const [index, setIndex] = useState(0);
  const pill = pillWords[index];

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % pillWords.length), 2200);
    return () => clearInterval(id);
  }, []);

  // em units keep the pill in proportion with whatever size the headline is.
  // items-center centres the dot; self-baseline on the word keeps it on the same line as "Find" and "Instantly."
  // clip-path (not overflow-hidden) hides the sliding word without moving that baseline
  return (
    <span
      style={{ backgroundColor: pill.bg }}
      className="mx-[0.08em] inline-flex items-center gap-[0.3em] whitespace-nowrap rounded-full px-[0.45em] py-[0.16em] font-semibold text-black transition-colors duration-500 [clip-path:inset(0_round_9999px)]"
    >
      <span style={{ backgroundColor: pill.dot }} className="size-[0.36em] shrink-0 rounded-full transition-colors duration-500" />
      {/* changing the key remounts the word, which replays the animation */}
      <span key={index} className="inline-block self-baseline motion-safe:animate-word">
        {pill.word}
      </span>
    </span>
  );
}

// ---------- hero dashboard preview ----------

// the preview is drawn at a real desktop size, then scaled down to fit the screen
const SCREEN_WIDTH = 1440;
const SCREEN_HEIGHT = 860;

function useFitScale(baseWidth: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / baseWidth)));
    observer.observe(element);
    return () => observer.disconnect();
  }, [baseWidth]);

  return { ref, scale };
}

function PdfIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  );
}

function SunIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function ArticleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 8h10M7 12h4M7 16h4M14 12h3v4h-3z" />
    </svg>
  );
}

type ExampleCard =
  | { type: "youtube"; title: string; thumbText: string; thumb: string; channel: string; views: string; duration: string }
  | { type: "twitter"; title: string; name: string; handle: string; avatar: string; text: string; time: string; likes: string; reposts: string }
  | { type: "pdf"; title: string; file: string; pages: number; size: string }
  | { type: "article"; title: string; site: string; cover: string; excerpt: string; readTime: string };

// made-up examples, only used for the landing page preview
const exampleCards: ExampleCard[] = [
  { type: "youtube", title: "Build a Second Brain", thumbText: "SECOND BRAIN IN 12 MIN", thumb: "from-rose-500 to-orange-400", channel: "Productive Minds", views: "1.2M views · 3 weeks ago", duration: "12:04" },
  { type: "twitter", title: "Save less, review more", name: "Dev Notes", handle: "@devnotes", avatar: "from-sky-400 to-indigo-500", text: "Hot take: the best productivity system is the one you actually open every day. Save less, review more. 🧠", time: "2:14 PM · Oct 3, 2026", likes: "1.2K", reposts: "214" },
  { type: "pdf", title: "Machine Learning Notes", file: "ml-notes-week-4.pdf", pages: 24, size: "2.4 MB" },
  { type: "article", title: "Spaced Repetition", site: "learninglab.blog", cover: "from-emerald-400 to-teal-600", excerpt: "Why reviewing at the right moment beats re-reading, and how to build the habit.", readTime: "8 min read" },
  { type: "article", title: "System Design Basics", site: "devweekly.io", cover: "from-amber-400 to-pink-500", excerpt: "Load balancers, caches and queues explained with simple real-world examples.", readTime: "12 min read" },
  { type: "youtube", title: "TypeScript Generics", thumbText: "GENERICS EXPLAINED", thumb: "from-sky-500 to-indigo-600", channel: "Code With Sam", views: "348K views · 2 months ago", duration: "18:32" },
  { type: "twitter", title: "Where you saved it", name: "Priya Codes", handle: "@priyacodes", avatar: "from-purple-500 to-pink-500", text: "Reminder: you don't need to remember everything. You just need to remember where you saved it. 📌", time: "9:41 AM · Sep 28, 2026", likes: "856", reposts: "97" },
  { type: "pdf", title: "DSA Cheat Sheet", file: "dsa-cheatsheet.pdf", pages: 6, size: "780 KB" },
];

const cardIcons = {
  youtube: <YoutubeIcon />,
  twitter: <TwitterIcon />,
  pdf: <PdfIcon />,
  article: <ArticleIcon />,
};

// same layout as the real dashboard Card: icon + title, share + delete, then the content
function DashCard({ card }: { card: ExampleCard }) {
  return (
    <div className="flex h-80 flex-col rounded-md border border-gray-200 bg-white p-4">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-gray-500 [&_svg]:size-5">{cardIcons[card.type]}</span>
          <span className="truncate font-bold text-gray-700">{card.title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-gray-500">
          <ShareIcon size="md" />
          <Delete size="md" />
        </div>
      </div>
      <div className="mt-4 min-h-0 flex-1 overflow-hidden">
        {card.type === "youtube" && <YoutubePreview card={card} />}
        {card.type === "twitter" && <TweetPreview card={card} />}
        {card.type === "pdf" && <PdfPreview card={card} />}
        {card.type === "article" && <ArticlePreview card={card} />}
      </div>
    </div>
  );
}

function YoutubePreview({ card }: { card: Extract<ExampleCard, { type: "youtube" }> }) {
  return (
    <div>
      <div className={`relative aspect-video overflow-hidden rounded-lg bg-linear-to-br p-3 pr-10 ${card.thumb}`}>
        <span className="text-sm font-black leading-tight text-white drop-shadow">{card.thumbText}</span>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-8 w-11 items-center justify-center rounded-lg bg-red-600 shadow-lg">
            <div className="ml-0.5 size-0 border-y-[6px] border-l-10 border-y-transparent border-l-white" />
          </div>
        </div>
        <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1 text-[10px] font-medium text-white">{card.duration}</span>
      </div>
      <div className="mt-3 flex gap-2.5">
        <div className={`size-8 shrink-0 rounded-full bg-linear-to-br ${card.thumb}`} />
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900">{card.title}</div>
          <div className="mt-1 text-xs text-gray-600">{card.channel}</div>
          <div className="text-xs text-gray-600">{card.views}</div>
        </div>
      </div>
    </div>
  );
}

function TweetPreview({ card }: { card: Extract<ExampleCard, { type: "twitter" }> }) {
  return (
    <div className="rounded-xl border border-gray-200 p-3 text-sm">
      <div className="flex items-center gap-2">
        <div className={`size-9 shrink-0 rounded-full bg-linear-to-br ${card.avatar}`} />
        <div className="min-w-0">
          <div className="flex items-center gap-1 font-bold text-gray-900">
            {card.name}
            <span className="flex size-3.5 items-center justify-center rounded-full bg-sky-500 text-[8px] text-white">✓</span>
          </div>
          <div className="text-xs text-gray-600">{card.handle}</div>
        </div>
        <span className="ml-auto text-gray-900 [&_svg]:size-4"><TwitterIcon /></span>
      </div>
      <p className="mt-3 leading-snug text-gray-800">{card.text}</p>
      <div className="mt-3 text-xs text-gray-600">{card.time}</div>
      <div className="mt-3 flex gap-4 border-t border-gray-200 pt-2 text-xs text-gray-600">
        <span><b className="text-gray-900">{card.likes}</b> Likes</span>
        <span><b className="text-gray-900">{card.reposts}</b> Reposts</span>
      </div>
    </div>
  );
}

function PdfPreview({ card }: { card: Extract<ExampleCard, { type: "pdf" }> }) {
  return (
    <div className="flex h-full flex-col">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 px-6 pt-5">
        {/* a mini document page */}
        <div className="h-full rounded-t-sm bg-white p-4 shadow-md">
          <div className="h-2 w-3/4 rounded bg-gray-800" />
          <div className="mt-2 h-1.5 w-1/2 rounded bg-gray-200" />
          <div className="mt-4 space-y-1.5">
            {[100, 92, 96, 80].map((width, i) => <div key={i} className="h-1 rounded bg-gray-200" style={{ width: `${width}%` }} />)}
          </div>
          <div className="mt-3 h-12 rounded bg-purple-200" />
          <div className="mt-3 space-y-1.5">
            {[96, 88, 100, 70].map((width, i) => <div key={i} className="h-1 rounded bg-gray-200" style={{ width: `${width}%` }} />)}
          </div>
        </div>
        <span className="absolute left-2 top-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">PDF</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-gray-600">
        <span className="truncate font-medium text-gray-800">{card.file}</span>
        <span className="shrink-0">{card.pages} pages · {card.size}</span>
      </div>
    </div>
  );
}

function ArticlePreview({ card }: { card: Extract<ExampleCard, { type: "article" }> }) {
  return (
    <div>
      <div className={`relative h-28 overflow-hidden rounded-lg bg-linear-to-br ${card.cover}`}>
        <div className="absolute -right-6 -top-6 size-24 rounded-full bg-white/20" />
        <div className="absolute -bottom-8 left-6 size-20 rounded-full bg-white/10" />
      </div>
      <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-purple-600">{card.site}</div>
      <div className="mt-1 line-clamp-2 font-bold leading-snug text-gray-900">{card.title}</div>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-600">{card.excerpt}</p>
      <div className="mt-2 text-xs text-gray-600">{card.readTime}</div>
    </div>
  );
}

const mockSidebarItems = [
  { label: "Twitter", icon: <TwitterIcon /> },
  { label: "Youtube", icon: <YoutubeIcon /> },
  { label: "PDFs", icon: <PdfIcon /> },
  { label: "Articles", icon: <ArticleIcon /> },
];

// a light-mode copy of the real dashboard, drawn at full desktop size
function DashboardScreen() {
  return (
    <div className="flex h-full flex-col bg-white text-left text-gray-900">
      {/* browser bar */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-gray-200 px-4">
        <span className="size-3 rounded-full bg-red-400" />
        <span className="size-3 rounded-full bg-yellow-400" />
        <span className="size-3 rounded-full bg-green-400" />
        <div className="mx-auto w-96 rounded-md bg-gray-100 py-1 text-center text-xs text-gray-600">memora.app/dashboard</div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 px-5 pt-6">
          <div className="flex items-center gap-2 text-2xl">
            <span className="text-purple-600"><Logo /></span> Memora
          </div>
          <div className="mt-8 space-y-1">
            {mockSidebarItems.map((item, i) => (
              <div key={item.label} className={`flex items-center gap-3 rounded-md px-3 py-2 text-gray-500 [&_svg]:size-5 ${i === 0 ? "bg-gray-200" : ""}`}>
                {item.icon}
                {item.label}
              </div>
            ))}
          </div>
          <div className="mb-5 mt-auto flex items-center gap-3 rounded-lg border border-gray-200 p-2.5">
            <div className="flex size-8 items-center justify-center rounded-full bg-purple-600 text-xs font-semibold text-white">AK</div>
            <div className="min-w-0 text-sm">
              <div className="font-medium">Alex Kumar</div>
              <div className="truncate text-xs text-gray-600">alex@example.com</div>
            </div>
          </div>
        </aside>

        <main className="relative min-w-0 flex-1 overflow-hidden bg-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-bold">All notes</div>
              <div className="text-sm text-gray-600">{exampleCards.length} items saved</div>
            </div>
            <div className="flex gap-3">
              <span className="flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-2 text-sm font-semibold text-white"><ShareIcon size="md" />Share Brain</span>
              <span className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white"><PlusIcon size="md" />Add Content</span>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-4 gap-4">
            {exampleCards.map((card) => <DashCard key={card.title} card={card} />)}
          </div>
          {/* fade at the bottom so it looks like the page keeps scrolling */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-gray-100 to-transparent" />
        </main>
      </div>
    </div>
  );
}

function HeroMockup() {
  const { ref, scale } = useFitScale(SCREEN_WIDTH);

  return (
    <div className="relative mx-auto max-w-6xl">
      <div className="absolute inset-x-10 -top-10 bottom-10 rounded-full bg-purple-500/25 blur-3xl" />

      {/* monitor */}
      <div className="relative rounded-2xl bg-gray-900 p-1.5 shadow-2xl shadow-purple-600/20 ring-1 ring-gray-800 md:rounded-[28px] md:p-3 dark:bg-black dark:ring-gray-700">
        <div ref={ref} className="relative overflow-hidden rounded-xl md:rounded-[18px]" style={{ height: SCREEN_HEIGHT * scale }}>
          <div className="absolute left-0 top-0 origin-top-left" style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, transform: `scale(${scale})` }}>
            <DashboardScreen />
          </div>
        </div>
      </div>
      {/* monitor stand */}
      <div className="mx-auto h-6 w-24 bg-linear-to-b from-gray-300 to-gray-200 [clip-path:polygon(18%_0,82%_0,100%_100%,0_100%)] md:h-12 md:w-44 dark:from-gray-800 dark:to-gray-700" />
      <div className="mx-auto h-2 w-44 rounded-full bg-gray-200 shadow-md md:h-3 md:w-80 dark:bg-gray-700" />

      {/* floating notifications */}
      <div className="absolute -right-6 top-1/4 hidden items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-xl md:flex motion-safe:animate-toast dark:border-gray-800 dark:bg-gray-900">
        <span className="flex size-6 items-center justify-center rounded-full bg-green-500 text-xs text-white">✓</span>
        Saved to your brain
      </div>
      <div className="absolute -left-8 bottom-1/3 hidden items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-xl md:flex motion-safe:animate-float dark:border-gray-800 dark:bg-gray-900">
        <span className="size-2 rounded-full bg-purple-600" />
        Share link copied
      </div>
    </div>
  );
}

function SkeletonLines({ count }: { count: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-2 rounded-full bg-gray-100 dark:bg-gray-800" style={{ width: `${100 - i * 15}%` }} />
      ))}
    </div>
  );
}

// ---------- interactive feature tabs ----------

function SavePreview() {
  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-950">
      <div className="font-semibold">Add content</div>
      <div className="mt-4 space-y-3 text-sm">
        <div className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800">How to build a second brain</div>
        <div className="rounded-lg border border-purple-500 px-3 py-2 ring-4 ring-purple-500/15">
          youtube.com/watch?v=Kd8x2<span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-purple-600 motion-safe:animate-pulse" />
        </div>
        <div className="flex gap-2">
          <span className="rounded-full bg-purple-600 px-3 py-1 text-xs text-white">YouTube</span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-gray-800">Twitter</span>
        </div>
        <div className="rounded-lg bg-purple-600 py-2 text-center font-medium text-white">Submit</div>
      </div>
    </div>
  );
}

// small icons for the Organize tags. The shared YoutubeIcon/TwitterIcon sit in a 30x30 box
// around a smaller drawing, so at 12px they'd look off-centre; these fill their box
function VideoTagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="M10 9.5v5l4.5-2.5z" fill="currentColor" />
    </svg>
  );
}

function XTagIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z" />
    </svg>
  );
}

function OrganizePreview() {
  const items = [
    // pastel backgrounds match the hero pill; text is a deeper shade of the same colour so it stays readable
    { t: "Build a second brain", tag: "Video", bg: "#FBD9DB", text: "#C42B2B", icon: <VideoTagIcon /> },
    { t: "Thread on learning", tag: "Tweet", bg: "#D3E8FF", text: "#0A6CC2", icon: <XTagIcon /> },
    { t: "React docs: hooks", tag: "Docs", bg: "#F9DCC4", text: "#B35F0B", icon: <PdfIcon /> },
    { t: "Design systems 101", tag: "Article", bg: "#CFE8D6", text: "#237A46", icon: <ArticleIcon /> },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item, i) => (
        <div
          key={item.t}
          style={{ animationDelay: `${i * 90}ms` }}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm motion-safe:animate-fade-up dark:border-gray-800 dark:bg-gray-950"
        >
          <span style={{ backgroundColor: item.bg, color: item.text }} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium [&_svg]:size-3">
            {item.icon}
            {item.tag}
          </span>
          <div className="mt-3 text-sm font-medium">{item.t}</div>
          <div className="mt-3"><SkeletonLines count={2} /></div>
        </div>
      ))}
    </div>
  );
}

function SharePreview() {
  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-950">
      <div className="font-semibold">Share your brain</div>
      <p className="mt-1 text-sm text-gray-600">Anyone with the link can view your collection.</p>
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-gray-200 p-1.5 pl-3 text-sm dark:border-gray-800">
        <span className="flex-1 truncate text-gray-600">memora.app/share/x8f2k9</span>
        <span className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white">Copy</span>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-green-600">
        <span className="size-2 rounded-full bg-green-500 motion-safe:animate-ping" />
        Link is live
      </div>
    </div>
  );
}

const featureTabs = [
  { label: "Save", title: "Capture anything in seconds", desc: "Paste a link, pick a type, done. Videos, tweets and articles all land in one place.", preview: <SavePreview /> },
  { label: "Organize", title: "Everything sorted for you", desc: "Content shows up as clean cards, grouped by type, so you can find anything in seconds.", preview: <OrganizePreview /> },
  { label: "Share", title: "Share your brain with one link", desc: "Turn on sharing and send a single public link to your whole collection.", preview: <SharePreview /> },
];

function FeatureTabs() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.3fr]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="space-y-3">
        {featureTabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActive(i)}
            className={`relative w-full overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 ${
              i === active
                ? "border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900"
                : "border-transparent opacity-60 hover:bg-gray-100 hover:opacity-100 dark:hover:bg-gray-900"
            }`}
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-purple-600">{tab.label}</div>
            <div className="mt-1 text-lg font-bold">{tab.title}</div>
            {/* grid-rows trick lets the description smoothly open/close */}
            <div className={`grid transition-all duration-300 ${i === active ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <p className="overflow-hidden text-sm text-gray-600 dark:text-gray-400">
                <span className="block pt-2">{tab.desc}</span>
              </p>
            </div>
            {/* progress bar: when the animation ends we move to the next tab */}
            {i === active && (
              <div
                key={active}
                onAnimationEnd={() => setActive((active + 1) % featureTabs.length)}
                style={{ animationPlayState: paused ? "paused" : "running" }}
                className="absolute bottom-0 left-0 h-0.5 bg-purple-600 motion-safe:animate-progress"
              />
            )}
          </button>
        ))}
      </div>

      <div className="relative flex min-h-80 items-center rounded-3xl bg-linear-to-br from-purple-200 to-gray-100 p-6 md:p-10 dark:from-purple-600/20 dark:to-gray-900">
        <div key={active} className="w-full motion-safe:animate-fade-up">
          {featureTabs[active].preview}
        </div>
      </div>
    </div>
  );
}

// ---------- feature grid ----------

const features = [
  // each card's hover colour: `pastel` fills the card, `deep` (a darker shade of it) is used for the icon box, border and glow
  { t: "Save Anything", d: "YouTube, Twitter/X, articles, docs, links. One click to add to your brain.", pastel: "#D3E8FF", deep: "#0A6CC2", icon: <path d="M6 3h12v18l-6-4-6 4z" /> },
  { t: "Search Instantly", d: "All your content organized as cards. Find any title or link in seconds.", pastel: "#F8EAC0", deep: "#A07A00", icon: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></> },
  { t: "Share Your Brain", d: "One public link shares your whole collection. Perfect for portfolios & teams.", pastel: "#CFE8D6", deep: "#237A46", icon: <><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" /></> },
  { t: "Clean Dashboard", d: "Sidebar + card view keeps YouTube, tweets and notes beautifully separated.", pastel: "#E5DBFF", deep: "#6B4FD8", icon: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></> },
  { t: "Private by Default", d: "JWT-secured. Only you see your content until you hit Share.", pastel: "#FBD9DB", deep: "#C42B2B", icon: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></> },
  { t: "Works in Your Browser", d: "Nothing to download or install. Open Memora in any browser on your laptop, tablet or phone.", pastel: "#F9DCC4", deep: "#B35F0B", icon: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M6.5 6.5h.01M9 6.5h.01" /></> },
];

function FeatureCard({ t, d, icon, pastel, deep }: { t: string; d: string; icon: ReactNode; pastel: string; deep: string }) {
  // store the mouse position as CSS variables so the glow follows the cursor
  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--y", `${e.clientY - rect.top}px`);
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      style={{ "--pastel": pastel, "--deep": deep } as CSSProperties}
      className="group relative h-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--deep)_40%,transparent)] hover:shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:hover:border-[color-mix(in_srgb,var(--pastel)_45%,transparent)] dark:hover:shadow-[0_20px_50px_-20px_color-mix(in_srgb,var(--deep)_70%,transparent)]"
    >
      {/* light mode: pastel fill + a glow in the deeper shade that follows the cursor.
          dark mode: a rich tint of the deeper shade + a pastel glow, so the colour stays vivid on the dark card */}
      <div className="pointer-events-none absolute inset-0 bg-(--pastel) bg-[radial-gradient(300px_circle_at_var(--x)_var(--y),color-mix(in_srgb,var(--deep)_18%,transparent),transparent_70%)] opacity-0 transition duration-300 group-hover:opacity-100 dark:bg-[color-mix(in_srgb,var(--deep)_28%,transparent)] dark:bg-[radial-gradient(300px_circle_at_var(--x)_var(--y),color-mix(in_srgb,var(--pastel)_22%,transparent),transparent_70%)]" />
      <div className="relative">
        <div className="flex size-11 items-center justify-center rounded-xl bg-purple-200 text-purple-600 transition duration-300 group-hover:scale-110 group-hover:bg-(--deep) group-hover:text-white dark:bg-purple-600/20 dark:text-purple-200 dark:group-hover:bg-(--deep) dark:group-hover:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-5">
            {icon}
          </svg>
        </div>
        <h3 className="mt-5 text-lg font-bold transition-colors duration-300 dark:group-hover:text-(--pastel)">{t}</h3>
        <p className="mt-2 text-sm text-gray-600 transition-colors duration-300 group-hover:text-[#5f6266] dark:text-gray-400">{d}</p>
      </div>
    </div>
  );
}

// ---------- quote: words light up as you scroll to it ----------

// each entry is its own line on larger screens; phones wrap the text naturally
const quoteLines = ["Your mind is for having ideas,", "not holding them."];

function ScrollQuote() {
  const { ref, inView } = useInView<HTMLQuoteElement>();
  const lineWords = quoteLines.map((line) => line.split(" "));
  const totalWords = lineWords.flat().length;
  return (
    <blockquote ref={ref} className="mx-auto max-w-4xl pb-12 text-center text-3xl font-bold leading-tight tracking-tight md:text-5xl">
      {lineWords.map((words, lineIndex) => {
        // words keep lighting up one after another across both lines
        const offset = lineWords.slice(0, lineIndex).flat().length;
        return (
          <span key={lineIndex} className="md:block">
            {words.map((word, j) => {
              const i = offset + j;
              const isFirst = i === 0;
              const isLast = i === totalWords - 1;
              return (
                <span
                  key={i}
                  style={{ transitionDelay: `${i * 90}ms` }}
                  className={`transition-colors duration-500 ${inView ? "text-gray-900 dark:text-white" : "text-gray-200 dark:text-gray-800"}`}
                >
                  {/* curly quote marks wrap the quote; they light up together with the first and last word */}
                  {isFirst && "“"}
                  {isLast ? (
                    <>
                      {word.slice(0, -1)}
                      {/* the author hangs from the full stop itself: it starts right below it on larger screens,
                          and ends below it on phones so it doesn't run off the edge */}
                      <span className="relative">
                        {word.slice(-1)}
                        <span className="absolute right-0 top-full mt-4 whitespace-nowrap text-base font-normal leading-normal tracking-normal text-gray-600 [word-spacing:0.15em] md:left-0 md:right-auto">— David Allen</span>
                      </span>
                      ”
                    </>
                  ) : `${word} `}
                </span>
              );
            })}
          </span>
        );
      })}
    </blockquote>
  );
}

// ---------- CTA heading: types itself out when scrolled into view ----------

// each line is split into pieces so single words can have their own colour
type Piece = { text: string; className?: string };

const ctaLines: Piece[][] = [
  // on hover "links" does a little jump while an underline draws in from left to right;
  // the pastel yellow "brain" gets a soft glow while hovered
  [
    { text: "Stop losing " },
    {
      text: "links",
      className:
        "inline-block origin-bottom text-[#A5D8FF] bg-[linear-gradient(currentColor,currentColor)] bg-no-repeat bg-[position:0_100%] bg-[length:0%_0.06em] transition-[background-size] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[length:100%_0.06em] motion-safe:hover:animate-jump",
    },
    { text: "." },
  ],
  [
    { text: "Start building your " },
    { text: "brain", className: "text-[#FFF1A8] transition-[text-shadow] duration-300 hover:[text-shadow:0_0_8px_rgb(255_241_168/0.6),0_0_20px_rgb(255_241_168/0.35)]" },
    { text: "." },
  ],
];
const lineText = (line: Piece[]) => line.map((piece) => piece.text).join("");
const ctaLength = ctaLines.map(lineText).join("").length;

// cuts a line's pieces after `count` letters: `before` is shown, `after` stays invisible
function splitPieces(line: Piece[], count: number) {
  let used = 0;
  return line.map((piece) => {
    const cut = Math.max(0, Math.min(piece.text.length, count - used));
    used += piece.text.length;
    return { ...piece, before: piece.text.slice(0, cut), after: piece.text.slice(cut) };
  });
}

// how long the fully typed heading stays on screen before it's erased and typed again
const HOLD_MS = 3000;

function TypedHeading() {
  const { ref, inView } = useInView<HTMLHeadingElement>();
  // people who turned on "reduce motion" just see the full heading, with no typing loop
  const [reduceMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [typed, setTyped] = useState(reduceMotion ? ctaLength : 0);
  const [erasing, setErasing] = useState(false);

  // loop: type letter by letter → hold the full heading → erase quickly → type again
  useEffect(() => {
    if (!inView || reduceMotion) return;
    let delay: number;
    let step: () => void;
    if (erasing) {
      // remove one letter every 25ms; once empty, switch back to typing
      delay = typed === 0 ? 0 : 25;
      step = typed === 0 ? () => setErasing(false) : () => setTyped(typed - 1);
    } else if (typed < ctaLength) {
      // a short pause before the first letter, then one letter every 55ms
      delay = typed === 0 ? 400 : 55;
      step = () => setTyped(typed + 1);
    } else {
      // fully typed: wait, then start erasing
      delay = HOLD_MS;
      step = () => setErasing(true);
    }
    const id = setTimeout(step, delay);
    return () => clearTimeout(id);
  }, [inView, reduceMotion, typed, erasing]);

  return (
    <h2 ref={ref} aria-label={ctaLines.map(lineText).join(" ")} className="text-3xl font-bold tracking-[-0.03em] md:text-5xl">
      {ctaLines.map((line, i) => {
        const start = ctaLines.slice(0, i).map(lineText).join("").length;
        const length = lineText(line).length;
        const shown = Math.max(0, Math.min(length, typed - start));
        // the caret sits on the line currently being typed, and goes away once everything is typed
        const hasCaret = typed < ctaLength && typed >= start && (typed < start + length || i === ctaLines.length - 1);
        const pieces = splitPieces(line, shown);
        return (
          <span key={i} aria-hidden="true" className="block">
            {pieces.map((piece, j) => piece.before && <span key={j} className={piece.className}>{piece.before}</span>)}
            {hasCaret && <span className="-mr-0.75 inline-block h-[0.85em] w-0.75 translate-y-[0.1em] bg-white motion-safe:animate-pulse" />}
            {/* not-yet-typed letters are invisible but still take up space, so the heading never jumps */}
            <span className="invisible">
              {pieces.map((piece, j) => <span key={j} className={piece.className}>{piece.after}</span>)}
            </span>
          </span>
        );
      })}
    </h2>
  );
}

// ---------- FAQ ----------

const faqs = [
  { q: "Is Memora free?", a: "Yes, core saving, dashboard and sharing are free." },
  { q: "What can I save?", a: "YouTube, Twitter/X, articles, links and text notes." },
  { q: "How does sharing work?", a: "Enable Share and you get a public link to your collection." },
  { q: "Who can see my content?", a: "Only you. Your content stays private until you choose to share it." },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 dark:border-gray-800">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-4 py-5 text-left font-semibold">
        {q}
        <span className={`text-2xl font-light text-purple-600 transition-transform duration-300 ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      <div className={`grid transition-all duration-300 ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <p className="overflow-hidden text-sm text-gray-600 dark:text-gray-400">
          <span className="block pb-5">{a}</span>
        </p>
      </div>
    </div>
  );
}

// ---------- page ----------

const contentTypes = ["YouTube Videos", "Tweets / X", "Articles", "Documentation", "Links", "Notes"];
// one "set" of pills has to be wider than the screen, otherwise a gap shows before the loop restarts.
// 3 copies ≈ 3000px+, enough for very wide monitors
const marqueeSet = [...contentTypes, ...contentTypes, ...contentTypes];

// marquee pills get a fresh random pastel every time the mouse enters them
function paintPastel(e: MouseEvent<HTMLSpanElement>) {
  e.currentTarget.style.backgroundColor = `hsl(${Math.floor(Math.random() * 360)} 85% 88%)`;
}

function clearPastel(e: MouseEvent<HTMLSpanElement>) {
  e.currentTarget.style.backgroundColor = "";
}

export function Landing() {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen overflow-x-clip bg-white font-jakarta text-gray-900 dark:bg-[#0B0E14] dark:text-gray-100">
      {/* NAVBAR */}
      <nav
        className={`sticky top-0 z-50 flex items-center justify-between border-b px-6 py-4 backdrop-blur transition-all duration-300 md:px-12 ${
          scrolled ? "border-gray-200 bg-white/80 shadow-sm dark:border-gray-800 dark:bg-[#0B0E14]/80" : "border-transparent bg-transparent"
        }`}
      >
        <a href="/" className="group flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-lg bg-purple-600 text-white transition duration-300 group-hover:rotate-6 group-hover:scale-105">
            <Logo />
          </div>
          <span className="text-xl font-bold tracking-tight">Memora</span>
        </a>
        <div className="hidden items-center gap-1 rounded-full border border-gray-200 bg-gray-100/80 px-2 py-1.5 text-sm text-[#55585d] shadow-sm md:flex dark:border-gray-700 dark:bg-gray-900/80 dark:text-gray-300">
          {[
            { href: "#how", label: "How it works" },
            { href: "#features", label: "Features" },
            { href: "#types", label: "Content types" },
            { href: "#faq", label: "FAQ" },
          ].map((link) => (
            <a key={link.href} href={link.href} className="rounded-full px-4 py-1.5 transition hover:bg-purple-200 hover:text-purple-600 dark:hover:bg-purple-600/30 dark:hover:text-purple-200">
              {link.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {/* both icons are stacked; the active one spins and scales in while the other spins out */}
          <button
            onClick={() => setDark(!dark)}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="relative flex size-10 items-center justify-center overflow-hidden rounded-lg transition-transform duration-300 hover:scale-110"
          >
            <SunIcon className={`absolute size-5 text-amber-400 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`} />
            <MoonIcon className={`absolute size-5 text-purple-600 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
          </button>
          <Link to="/signin" className="hidden rounded-lg border border-purple-600/30 bg-purple-200/40 px-4 py-2 text-sm font-medium text-purple-600 transition hover:bg-purple-200 hover:shadow-sm sm:block dark:border-purple-600/40 dark:bg-purple-600/20 dark:text-purple-200 dark:hover:bg-purple-600/30">Sign in</Link>
          <Link to="/signup" className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">Get Started</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative px-6 pb-20">
        {/* dotted background that fades out towards the edges */}
        <div className="pointer-events-none absolute inset-0 -top-20 bg-[radial-gradient(var(--color-gray-200)_1px,transparent_1px)] bg-size-[24px_24px] mask-[radial-gradient(ellipse_at_top,black,transparent_70%)] dark:bg-[radial-gradient(rgb(255_255_255/0.08)_1px,transparent_1px)]" />

        {/* fills the first screen (minus the 73px navbar) so the monitor always starts just below the fold */}
        <div className="relative mx-auto flex min-h-[calc(100svh-73px)] max-w-5xl flex-col justify-center py-16 text-center">
          <div>
          {/* the fade-up lives on a wrapper because the badge's own `animation` is used by the steel border */}
          <div className="mb-6 motion-safe:animate-fade-up">
            <div className="steel-border inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-purple-600 dark:text-purple-200">
              <span className="size-1.5 rounded-full bg-purple-600 motion-safe:animate-pulse" />
              YOUR SECOND BRAIN
            </div>
          </div>
          <h1 className="text-5xl font-bold leading-[1.05] tracking-[-0.045em] md:text-7xl">
            <span className="block motion-safe:animate-fade-up" style={{ animationDelay: "100ms" }}>Remember Everything.</span>
            <span className="mt-[0.1em] block motion-safe:animate-fade-up" style={{ animationDelay: "250ms" }}>
              Find <RotatingPill /> Instantly.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-[#7a7d82] [word-spacing:0.1em] motion-safe:animate-fade-up dark:text-gray-400" style={{ animationDelay: "400ms" }}>
            Save YouTube videos, tweets, articles and notes in one place, then share your entire brain with one link.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 motion-safe:animate-fade-up sm:flex-row" style={{ animationDelay: "550ms" }}>
            <Link to="/signup" className="group rounded-xl bg-purple-600 px-7 py-3 font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-purple-600/30">
              Start Saving, It's Free <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <Link to="/signin" className="rounded-xl border border-gray-200 px-7 py-3 font-semibold transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800">
              Live Demo
            </Link>
          </div>
          <p className="mt-4 text-sm text-[#85888c] [word-spacing:0.1em] motion-safe:animate-fade-up dark:text-gray-400" style={{ animationDelay: "650ms" }}>
            No credit card • Free forever plan • 30 sec setup
          </p>
          </div>
        </div>

        <div className="relative mt-20 motion-safe:animate-fade-up" style={{ animationDelay: "800ms" }}>
          <HeroMockup />
        </div>
      </section>

      {/* CONTENT TYPES MARQUEE */}
      <section id="types" className="scroll-mt-24 py-12">
        <p className="px-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Trusted by students, creators & researchers to save 10,000+ links
        </p>
        <div className="mt-6 flex overflow-hidden mask-[linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
          {/* the list is rendered twice and slid by -50% so the loop looks seamless */}
          <div className="flex shrink-0 gap-4 pr-4 motion-safe:animate-marquee hover:[animation-play-state:paused]">
            {[...marqueeSet, ...marqueeSet].map((type, i) => (
              <span
                key={i}
                onMouseEnter={paintPastel}
                onMouseLeave={clearPastel}
                className="cursor-default whitespace-nowrap rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium transition-colors duration-300 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900"
              >
                <span className="mr-2 text-purple-600">●</span>{type}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — interactive tabs */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20 md:px-12">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold tracking-[-0.03em] md:text-5xl">Save it. Find it. Share it.</h2>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Three steps. Zero clutter.</p>
        </Reveal>
        <Reveal delay={150} className="mt-12">
          <FeatureTabs />
        </Reveal>
      </section>

      {/* FEATURES */}
      <section id="features" className="scroll-mt-24 bg-gray-100/60 px-6 py-20 md:px-12 dark:bg-gray-900/40">
        <div className="mx-auto max-w-6xl">
          <Reveal className="text-center">
            <h2 className="text-3xl font-bold tracking-[-0.03em] md:text-5xl">Everything you need to never forget</h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400">One dashboard for all your digital memory.</p>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.t} delay={(i % 3) * 120} className="h-full">
                <FeatureCard {...f} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* QUOTE */}
      <section className="px-6 py-24">
        <ScrollQuote />
      </section>

      {/* CTA */}
      <section className="px-6 pb-20">
        <Reveal className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-purple-600 p-8 text-center text-white md:p-12">
          <div className="absolute -left-20 -top-20 size-72 rounded-full bg-white/10 blur-3xl motion-safe:animate-float" />
          <div className="absolute -bottom-24 -right-16 size-80 rounded-full bg-purple-500/60 blur-3xl motion-safe:animate-float" style={{ animationDelay: "-3s" }} />
          <div className="relative">
            <TypedHeading />
            <p className="mt-4 opacity-90 [word-spacing:0.1em]">Join Memora today and carry your knowledge everywhere.</p>
            <Link to="/signup" className="mt-8 inline-block rounded-xl bg-white px-8 py-3 font-bold text-purple-600 transition duration-300 hover:-translate-y-0.5 hover:shadow-2xl">
              Create Free Account
            </Link>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-6 pb-24">
        <Reveal>
          <h2 className="mb-8 text-center text-3xl font-bold tracking-[-0.03em]">Frequently asked questions</h2>
          {faqs.map((f) => <FaqItem key={f.q} {...f} />)}
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 px-6 py-12 md:px-12 dark:border-gray-800">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-10 md:flex-row">
          <div>
            <div className="flex items-center gap-2 font-bold">
              <span className="flex size-8 items-center justify-center rounded-lg bg-purple-600 text-white"><Logo /></span>
              Memora
            </div>
            <p className="mt-3 max-w-xs text-sm text-gray-600 dark:text-gray-400">Your personal knowledge vault.</p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
            <div className="flex flex-col gap-3">
              <div className="font-semibold">Product</div>
              <a href="#features" className="text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white">Features</a>
              <a href="#how" className="text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white">How it works</a>
              <a href="#faq" className="text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white">FAQ</a>
            </div>
            <div className="flex flex-col gap-3">
              <div className="font-semibold">Account</div>
              <Link to="/signin" className="text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white">Sign in</Link>
              <Link to="/signup" className="text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white">Sign up</Link>
            </div>
            <div className="flex flex-col gap-3">
              <div className="font-semibold">Legal</div>
              <a href="#" className="text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white">Privacy</a>
              <a href="#" className="text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white">Terms</a>
              <a href="#" className="text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white">Contact</a>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-6xl text-sm text-gray-600 dark:text-gray-400">Memora © 2026</div>
      </footer>
    </div>
  );
}
