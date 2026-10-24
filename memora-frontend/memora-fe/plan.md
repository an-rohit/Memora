# Memora Frontend: Plan

What's **done**, what's **left**, **why** each item matters, and **how** to do it.

> **How to read this file**
> - 🟢 = done, 🟡 = started, 🔴 = to do.
> - Many items depend on a backend change. They say which one, e.g. *(needs backend 2.2)*. The backend plan is [`memora-backend/plan.md`](../../memora-backend/plan.md).
> - Paths are relative to `memora-frontend/memora-fe/src/`.
>
> **Last checked against the code and the backend (up to commit `459a61a`):** 2026-10-22. `tsc --noEmit` passes; `eslint .` reports 29 errors and 2 warnings (as of 2026-10-21).

---

## 1. The big picture

```mermaid
flowchart LR
    A["🟢 Done<br/>Pages, collections UI,<br/>sharing, Drive import"] --> B["🔴 F1<br/>Auth & session"]
    B --> C["🔴 F2<br/>Config"]
    C --> D["🟡 F3<br/>Follow backend changes"]
    D --> E["🔴 F4<br/>Performance"]
    E --> F["🔴 F5<br/>Code quality"]
    F --> G["🔴 F6<br/>Security"]
    G --> H["🔴 F7<br/>Testing"]
    H --> I["🔴 F8<br/>Deploy"]
```

**Why this order?** F1 matters right now: backend tokens expire after 7 days (backend 1.2), and the app doesn't handle that yet. F2 is needed before any deploy. F3 keeps the app working while the backend is fixed.

---

## 2. What's done 🟢

| Done | Where |
|---|---|
| Stack: React 19, Vite, TypeScript, Tailwind 4, react-router 7, axios | `package.json` |
| Routes: `/`, `/signup`, `/signin`, `/dashboard`, `/share/:shareLink`, `/share/c/:shareHash`, 404 page | `App.tsx` |
| Landing page, signup and signin pages; token saved in `localStorage` | `pages/landing.tsx`, `pages/signup.tsx`, `pages/signin.tsx` |
| Dashboard: list, delete, move between collections, theme toggle, sidebar (Ctrl+\\) | `pages/dashboard.tsx`, `components/ui/Sidebar.tsx` |
| Add content modal with link preview + Google Drive folder import | `components/ui/createContentModel.tsx` |
| Content card: preview, edit title / description, PDF view | `components/ui/Card.tsx` |
| Collections: create, rename, delete, share modal, folder tree drawer (`parentId`) | `components/collections/*`, `hooks/useCollections.tsx` |
| Share whole brain (copies link to clipboard) | `pages/dashboard.tsx` `handleShare` |
| Public brain page + "save this brain" | `pages/sharedPage.tsx` |
| Public collection page + "save this collection" | `pages/sharedCollectionPage.tsx` |
| Logout (clears token, back to signin) | `components/ui/ProfileMenu.tsx` |
| `tsc --noEmit` passes | — |

### Backend changes so far, and what they mean for the frontend

Every change below was checked against the frontend code. **Nothing in the frontend is broken by them.** Some make a frontend item possible or more urgent.

| Backend change (commit) | What changed in the API | Frontend impact |
|---|---|---|
| Token expiry, `authMiddleware` fix (`8fdb869`) | Tokens expire after **7 days**; expired → 401 `Session expired, please log in again` | Nothing breaks today, but after 7 days requests start failing silently → **F1.1** is now important |
| Signup name taken (`d5a597d`) | 403 → **409** `user already exists` | `signup.tsx` already shows the backend `message` → F3.3 |
| Brain sharing off (`fb927db`) | `{ share: false }` now really turns sharing off (200 `Sharing turned off`); `{ share: "false" }` → 400 | The "Share brain" button still works (it reads `response.data.link`). An off switch can now be built → **F3.2** |
| Public brain view (`e0f18b1`) | Bad or turned-off link → **404** `Share Link not Found` (was 401); notes now only have `_id, link, type, title, description`; response has a `message` | `sharedPage.tsx` and the shared workspace in `dashboard.tsx` only use `username` and `content`, and show the backend `message` on error → no change needed |
| Delete collection (`efb8dd6`) | Deleting a collection whose link is also in All content now works (was 500). The duplicate copy in the collection is removed, the All content copy is kept | No change needed. Deleting those collections from the app now succeeds instead of the collection staying in the sidebar |
| Collection validation (`459a61a`) | Title: 1–200 chars. Icon: one emoji or an `https://img.icons8.com/` link. Bad input → 400 with a clear `message` (an object icon used to be a 500) | Current presets all pass; `CollectionModal.tsx` shows the backend `message` → F3.7 (done), F3.8 (optional) |
| Public collection view (`9cc7265`) | `collection` now has only `_id, title, icon` (no `userId`); notes only have `_id, link, type, title, description` | `sharedCollectionPage.tsx` only uses those fields → no change needed |
| Bulk delete notes *(new route, not committed yet)* | New `POST /content/delete-many` with `{ ids: [...] }` (1–100 ids) → 200 `{ message, deletedCount }`; none of them found → 404; bad input → 400 | New route only, nothing existing changed. The UI for it is still to build → **F3.10** |

---

## 3. F1: Auth & session 🔴

```mermaid
flowchart TD
    R["Any API call"] --> I["axios instance<br/>adds Bearer token"]
    I --> S{"Response 401?"}
    S -- No --> OK["Use the data"]
    S -- Yes --> C["Clear token"]
    C --> L["Redirect to /signin<br/>'Session expired, please log in again'"]
```

| # | Status | What | Why | How |
|---|---|---|---|---|
| F1.1 | 🔴 **important** | Global 401 handling | Tokens now expire after 7 days (backend 1.2 🟢). Only `sharedCollectionPage.tsx` reacts to 401; everywhere else requests just fail silently | One axios **response interceptor**: on 401, remove the token and navigate to `/signin`, showing the backend's `message` (an expired token says `Session expired, please log in again`) |
| F1.2 | 🔴 | One axios instance | The `Authorization: Bearer ...` header is copy-pasted in about 15 places (`Card.tsx`, `dashboard.tsx`, `createContentModel.tsx`, both hooks, `ProfileMenu.tsx`, …) | `api.ts` with `axios.create({ baseURL })` and a request interceptor that adds the token. Replace the copies one file at a time |
| F1.3 | 🔴 | Protect `/dashboard` | Opening `/dashboard` without a token loads the page and every request fails | A small `<RequireAuth>` wrapper in `App.tsx`: no token → `<Navigate to="/signin" />` |
| F1.4 | 🔴 | httpOnly cookie *(later)* | JavaScript can't read the token, so an XSS bug can't steal it | *(needs backend 1.9)* `withCredentials: true` on the axios instance, stop using `localStorage` for the token, call `POST /auth/logout` on logout |

---

## 4. F2: Config 🔴

| # | Status | What | Why | How |
|---|---|---|---|---|
| F2.1 | 🔴 | Backend URL from env | `config.ts` hard-codes `http://localhost:3000`, so a deployed frontend would call the user's own computer | `export const BACKEND_URL=import.meta.env.VITE_BACKEND_URL`, plus `.env.example` with `VITE_BACKEND_URL=http://localhost:3000` |

---

## 5. F3: Follow backend changes 🟡

Do each one **in the same PR** as the backend change, so `main` never breaks.

| # | Status | What | Depends on | How |
|---|---|---|---|---|
| F3.1 | 🔴 | One response shape | backend 3.3 | `useCollections.tsx` reads `data.data.collection \|\| data.collection`; switch every read to `data.data` |
| F3.2 | 🔴 | "Stop sharing my brain" button | backend 2.2 🟢 (done) | **Backend is ready:** `{ share: false }` now turns sharing off (200 `Sharing turned off`), and the old link returns 404. The dashboard only ever sends `{ share: true }`. Add an off switch that sends `{ share: false }` |
| F3.3 | 🔴 | Signup messages | backend 2.5 🟡 | Name taken now returns **409** (done); 201 for "created" is still to come. Check `signup.tsx` shows the backend `message` for both |
| F3.4 | 🔴 | Pagination / "load more" | backend 4.2 | Read `{ items, nextCursor }`; load the next page on scroll or a button |
| F3.5 | 🔴 | Use stored previews | backend 4.4 | Cards read `content.preview` instead of calling `/content/preview/metadata` for every card |
| F3.6 | 🔴 | PATCH instead of PUT | — | `Card.tsx` and `dashboard.tsx` use `axios.put` for partial updates. Switch to `axios.patch`, then the backend can drop its PUT route |
| F3.7 | 🟢 | Collection icons: keep the preset image links | backend 2.7 🟢 (done) | Decision: icons stay as the fixed presets in `components/collections/CollectionIcon.tsx`. The backend accepts **one emoji** (e.g. the default `📁`) **or a built-in icon link starting with `https://img.icons8.com/`** (max 300 chars), so no frontend change is needed. New presets added later must also come from `https://img.icons8.com/`, or the backend returns 400 |
| F3.8 | 🔴 | Collection title limit in the dialog *(optional)* | backend 2.7 🟢 (done) | The backend rejects titles over 200 characters. Add `maxLength={200}` to the title `<input>` in `components/collections/CollectionModal.tsx`, so users can't type past the limit |
| F3.9 | 🔴 | Disable "Share brain" while it's loading *(optional)* | backend 2.2 🟢 | Two very fast clicks send two requests; the second can get a 500 (backend follow-up: 11000 → 409). Disabling the button until the first request finishes avoids it |
| F3.10 | 🔴 | **Select many notes + delete them together** | backend N1 🟢 (`POST /content/delete-many`) | Today notes can only be deleted one by one (`handleDelete` in `pages/dashboard.tsx` → `DELETE /content/:id`). Add:<br/>1. **"Select" mode** on the dashboard: a button that shows a **checkbox** on every `Card` (`components/ui/Card.tsx`, new props e.g. `selectable`, `selected`, `onToggleSelect`).<br/>2. **Selected ids** kept in one `useState<string[]>` in `dashboard.tsx`; clicking a checkbox adds or removes the card's `_id`.<br/>3. A **"Select all"** checkbox that selects every note currently shown (respects the active collection / tab / search filter).<br/>4. A **"Delete selected (N)"** button, disabled when nothing is selected or while the request is running. Ask "Delete N notes?" before sending.<br/>5. Send `axios.post(\`${BACKEND_URL}/api/v1/content/delete-many\`, { ids }, authHeader)`. More than 100 selected → send in chunks of 100 (backend limit).<br/>6. On 200: show `deletedCount` ("3 notes deleted"), clear the selection, leave select mode, call `refresh()`. On 400/404: show the backend `message` |

---

## 6. F4: Performance 🔴

| # | Status | What | Why | How |
|---|---|---|---|---|
| F4.1 | 🔴 | Stop polling every 3 seconds | `useContent.tsx` re-downloads **all** content every 3 s, for every open tab (20 requests a minute per user, growing with the number of notes) | Remove the `setInterval`. The app already calls `refresh()` after add / delete / move; refresh on window focus if needed |
| F4.2 | 🔴 | One preview request per card | Every card calls `/content/preview/metadata`, which makes the server fetch the external site | Short term: cache results in memory by link. Long term: F3.5 |

---

## 7. F5: Code quality 🔴

| # | Status | What | Why | How |
|---|---|---|---|---|
| F5.1 | 🔴 | Fix lint errors | `eslint .` reports 29 errors and 2 warnings, mostly `any` (13 places, e.g. `catch (err: any)` in `dashboard.tsx`, `signup.tsx`, `FolderTreeDrawer.tsx`) | Use `catch (err)` + `axios.isAxiosError(err)` to read `err.response?.data?.message` |
| F5.2 | 🔴 | Remove one-off scripts | `refactor.cjs`, `refactor.js`, `update-pdf.cjs` in `memora-fe/` are codemods that rewrote `Card.tsx` once | Delete them if nobody needs them again |
| F5.3 | 🔴 | Split very large files *(optional)* | `Card.tsx` is 1,369 lines, `landing.tsx` 964, `dashboard.tsx` 863: hard to review | Pull out clear pieces (e.g. note editor, PDF viewer) only when you're already changing that area |

---

## 8. F6: Security 🔴

| # | Status | What | Why | How |
|---|---|---|---|---|
| F6.1 | 🔴 | Only render http/https links | The backend blocks `javascript:` links now (backend 1.1), but notes saved **before** that change may still have one, and shared pages render them as `<a href>` | A small `safeHref(link)` helper: return the link only if `new URL(link).protocol` is `http:` or `https:`, else `#` |

---

## 9. F7: Testing 🔴

| # | Status | What | How |
|---|---|---|---|
| F7.1 | 🔴 | Basic tests | `vitest` + React Testing Library: signin flow, 401 → redirect (F1.1), `safeHref` (F6.1) |
| F7.2 | 🔴 | CI | Run `npm run build` (includes `tsc -b`) and `npm run lint` on every PR, next to the backend checks |

---

## 10. F8: Deploy 🔴

| Step | Status | Why |
|---|---|---|
| `build` script | 🟢 | Already exists: `tsc -b && vite build` |
| `VITE_BACKEND_URL` set in the host | 🔴 | Needs F2.1 |
| SPA fallback (all paths → `index.html`) | 🔴 | Without it, opening a shared link like `/share/c/abc` directly gives the host's 404 |
| Host on Vercel / Netlify | 🔴 | Its URL becomes the backend's `FRONTEND_URL` for CORS (backend 1.5) |

---

## 11. After launch: screens for the startup features

These follow the backend's Phase 7 list: create / move sub-collections by hand, password reset, share-link view count, collection description and lesson order, delete account and export, trash, members and roles, search.
