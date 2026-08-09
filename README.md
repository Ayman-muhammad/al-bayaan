<div align="center">

<img src="src/assets/icons/icon-quran.png" width="120" alt="Al-Bayan logo" />

# البياني · Al-Bayan

**An offline-capable, bilingual Quran, Hifz and family-worship platform for the global Muslim community.**

React 18 · TypeScript · Vite · Tailwind · shadcn/ui · Supabase (Postgres + RLS + Edge Functions) · Gemini via Lovable AI Gateway · PWA

<img src="src/assets/kaaba-hero.jpg" width="100%" alt="Al-Bayan hero — Masjid Al-Haram" />

</div>

---

## Table of contents

1. [What it is](#what-it-is)
2. [Feature map](#feature-map)
3. [Architecture](#architecture)
4. [Data model](#data-model)
5. [Security model](#security-model)
6. [Offline &amp; PWA strategy](#offline--pwa-strategy)
7. [Project structure](#project-structure)
8. [Local development](#local-development)
9. [Admin operations](#admin-operations)
10. [Engineering conventions](#engineering-conventions)
11. [Roadmap](#roadmap)

---

## What it is

Al-Bayan is a mobile-first Progressive Web App built around one idea: **worship should never hit a dead end.**
A user who receives a family assignment ("read Al-Mulk 1–15 tonight") taps once, lands in the Mushaf reader on
the exact range, and the moment they finish the range the system records the completion for the whole family —
no manual bookkeeping, no context switching, no leaving the app.

Every subsystem — Quran reader, Hifz trainer, Adhkar counters, prayer times, Scholars Q&A — is wired into the
same progress ledger, so a single action can advance a personal streak, a family cycle and an achievement at once.

| | |
|---|---|
| <img src="src/assets/quran-open.jpg" width="420" alt="Mushaf reader" /> | <img src="src/assets/medina-mosque.jpg" width="420" alt="Madinah" /> |
| **Mushaf reader** — physical 604-page layout, 5 Arabic fonts, tajweed colouring, word-by-word translation, tafsir and tadabbur prompts. | **Live Haramain** — 24/7 Makkah &amp; Madinah embeds, fully admin-configurable at runtime. |

---

## Feature map

<div align="center">
<img src="src/assets/icons/icon-quran.png" width="56" alt="" />
<img src="src/assets/icons/icon-hafiz.png" width="56" alt="" />
<img src="src/assets/icons/icon-audio.png" width="56" alt="" />
<img src="src/assets/icons/icon-prayer.png" width="56" alt="" />
<img src="src/assets/icons/icon-family.png" width="56" alt="" />
<img src="src/assets/icons/icon-scholars.png" width="56" alt="" />
<img src="src/assets/icons/icon-dhikr.png" width="56" alt="" />
<img src="src/assets/icons/icon-journey.png" width="56" alt="" />
</div>

| Domain | Capability | Key modules |
|---|---|---|
| **Quran** | 604-page Mushaf engine with prefetch + cache, surah reader, tajweed colouring, word-by-word &amp; full translation toggles, tafsir overlays, tadabbur questions, 5 page themes, global search (surah / Arabic text / English keyword), per-ayah audio with reciter, repeat and speed controls | `lib/mushafPages.ts`, `lib/quranPrefs.ts`, `components/QuranReader.tsx`, `components/MushafPage*.tsx` |
| **Hifz** | Word masking, karaoke audio sync, repeat pills, test mode, spaced-repetition review queue, calendar heatmap | `components/HafizMode.tsx`, `hifz_progress`, `hifz_sessions` |
| **Family Cycle** | Intention wizard → member roster → auto-generated morning/evening activities → deep-linked in-app completion (`familyMode`) → relay portion splitting → streaks, badges, weekly summary | `components/FamilyCycle.tsx`, `lib/familyMode.ts`, `components/FamilyDoneButton.tsx`, `lib/familyReminders.ts` |
| **Worship utilities** | Location-based prayer times with offline fallback, live Qibla compass, 6 muezzin presets with offline adhan playback, post-adhan du'a, Adhkar collections with per-item counters | `lib/adhan.ts`, `lib/prayerCache.ts`, `components/PrayerTimes.tsx`, `components/Adhkar.tsx` |
| **Knowledge** | Scholars Q&A with multilingual answers (Arabic, English, Kiswahili, Somali, Amharic), structured citations (book / volume / page / publisher / URL), ask-a-question flow; AI companion with streaming answers and madhab comparison | `components/ScholarsQA.tsx`, `lib/sources.ts`, `supabase/functions/islamic-chat` |
| **Engagement** | Noor Meter (animated crescent spiritual index), XP/level dashboard, daily challenges, achievement medallions, inactivity nudges, 30-day journeys | `lib/noorCalculator.ts`, `components/Dashboard.tsx`, `components/DailyChallenges.tsx` |
| **Platform** | Installable PWA with engagement-gated prompt, offline download manager, dark mode by default (system-adaptive), full RTL, Google / email / phone auth with IndexedDB session vault, admin panel | `public/sw.js`, `lib/downloadManager.ts`, `lib/mobileAuth.ts`, `components/AdminPanel.tsx` |

---

## Architecture

The app is a **single-page client with a thin, policy-enforced backend**. There is no bespoke API server:
the browser talks to Postgres through the Data API (guarded entirely by Row Level Security) and to Edge
Functions only where a secret or a model call is involved.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  Browser (PWA shell)                                                         │
│                                                                              │
│  React 18 + Vite + Tailwind + shadcn/ui                                      │
│  ├─ Contexts:  Auth · Theme (dark-first) · Language (en/ar + RTL)            │
│  ├─ Feature components (Quran · Hifz · Family Cycle · Prayer · Q&A)         │
│  ├─ lib/  pure domain logic — no JSX, unit-testable                          │
│  │     mushafPages · quranPrefs · familyMode · adhan · noorCalculator …      │
│  └─ Local persistence                                                        │
│        localStorage → prefs, caches      IndexedDB → sessions, audio, text   │
│                                                                              │
│  Service worker (public/sw.js) — app shell, Quran text, adhan & audio caches │
└───────────┬───────────────────────────────────────────┬──────────────────────┘
            │ supabase-js (anon key + user JWT)          │ functions.invoke()
            ▼                                            ▼
┌───────────────────────────────────┐      ┌─────────────────────────────────────┐
│  Postgres (Supabase)              │      │  Edge Functions (Deno)              │
│  · RLS on every public table      │      │  · islamic-chat → Gemini via        │
│  · SECURITY DEFINER RPCs for      │      │    Lovable AI Gateway (streaming)   │
│    privileged, validated writes   │      │  · secrets never reach the client   │
│  · triggers: achievements, invite  │     └─────────────────────────────────────┘
│    codes, activity log, updated_at │
└───────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────┐      ┌─────────────────────────────────────┐
│  Storage: avatars (private)       │      │  Third-party reads (cached)          │
└───────────────────────────────────┘      │  alquran.cloud · mp3quran.net ·      │
                                           │  YouTube live embeds                 │
                                           └─────────────────────────────────────┘
```

### Design decisions worth defending

| Decision | Rationale |
|---|---|
| **RLS-first, no API layer** | Every access rule lives next to the data, so a new client (or a leaked anon key) cannot widen access. Privileged operations that need multi-row invariants go through `SECURITY DEFINER` RPCs (`create_family_circle`, `join_circle_by_code`) with input validation inside the function. |
| **Domain logic in `src/lib`, UI in `src/components`** | Pure modules are trivially testable and reused across screens (e.g. `familyMode.ts` powers the reader, Adhkar and Dhikr bridges identically). |
| **Config over deploy** | Content that changes on a human timescale — live stream links and embed params, reciters, reminder offsets — is stored in the database and edited from the Admin Panel, not hard-coded. |
| **Offline as a first-class path, not a fallback** | Prayer times, adhan audio, downloaded surahs and cached Mushaf pages all have deterministic local sources; screens render from cache first and reconcile after the network resolves. |
| **Deep links as the integration contract** | Cross-feature flows are expressed as URL state (`?familyCycle=<activityId>&surah=…&fromAyah=…&toAyah=…`), which keeps features decoupled, shareable and restorable after a cold start. |
| **Session durability on low-end Android** | Mobile OSes evict `localStorage` aggressively, so sessions are mirrored into IndexedDB (`lib/mobileAuth.ts`) and rehydrated on boot — a fix driven by real Tecno Spark-class device testing. |

---

## Data model

Grouped by bounded context. All tables live in `public`, all have RLS enabled, and every table carries explicit
`GRANT`s for the roles its policies allow.

```text
auth.users
   ├─ profiles ............... display name, avatar, language, reciter (email column blocked at API level)
   ├─ user_stats ............. streaks, ayahs read, recitations, days active
   ├─ user_roles ............. app_role enum (admin | moderator | user) — never on profiles
   ├─ achievements ........... unlocked badges (code-unique per user)
   ├─ user_events ............ auth/telemetry funnel events
   ├─ bookmarks .............. polymorphic favourites (ayah | audio | chat)
   ├─ reading_progress · memorization_progress · hifz_progress · hifz_sessions
   ├─ user_quran_prefs ....... font, size, spacing, page theme, translation/tafsir toggles
   └─ family_reminders ....... morning/evening offsets, sound, days

Family Cycle (intention-based, personal roster)
   family_cycles → family_members → cycle_activities → cycle_completions
                                 └→ cycle_checkins (morning/evening streak)

Hifdh Circles (multi-account, invite-based)
   circles → circle_members → goals → circle_progress
          └→ family_goals → family_goal_contributions
          └→ circle_activity (append-only audit feed)

Knowledge
   scholars → answers → questions (anonymous submissions supported)

Operations
   live_streams .............. admin-editable embeds: youtube_id, embed_params, labels, order, active
```

Notable database logic:

- `has_role(uuid, app_role)` — `SECURITY DEFINER` helper used by every admin policy, avoiding recursive RLS.
- `create_family_circle` / `join_circle_by_code` — atomic, validated membership writes.
- `on_family_contribution` — trigger that closes a goal and mints achievements for all contributors.
- `get_family_leaderboard`, `get_circle_invite_code`, `get_my_email` — membership- or admin-checked reads for
  data that is deliberately unreadable through the Data API.

---

## Security model

- **Roles are never stored on the user or profile row.** A dedicated `user_roles` table plus a
  `SECURITY DEFINER` `has_role()` function eliminates the classic privilege-escalation path.
- **Column-level denial for sensitive fields.** `circles.invite_code` and `profiles.email` are revoked at the
  Data API level; they are reachable only through admin-checked or self-checked functions.
- **Least-privilege `EXECUTE`.** Internal trigger and helper functions are revoked from `PUBLIC`; only the
  intentional, self-scoping RPCs remain callable by signed-in users.
- **Anonymous questions stay anonymous.** RLS hides submitter identity from everyone except the submitter.
- **Secrets never reach the client.** Model keys and service credentials live in Edge Function environment
  variables; the browser only ever holds the publishable anon key.
- **Input validation at the boundary.** RPC arguments are length- and null-checked in SQL; Edge Function bodies
  are schema-validated before use.

---

## Offline &amp; PWA strategy

| Layer | Content | Mechanism |
|---|---|---|
| App shell | HTML, JS, CSS, icons | Service worker precache (`public/sw.js`, versioned) |
| Quran text | Downloaded surahs / juz | IndexedDB via `lib/downloadManager.ts`, resumable |
| Audio | Reciter tracks, adhan presets | Dedicated runtime caches (`ADHAN_CACHE`) |
| Prayer times | 30-day computed schedule | `lib/prayerCache.ts` + on-device calculation fallback |
| Preferences | Reader, theme, language, reminders | `localStorage`, reconciled with `user_quran_prefs` when online |
| Session | Auth tokens | IndexedDB vault (`lib/mobileAuth.ts`) |

The install prompt is **engagement-gated** (second visit or 30 seconds of use) with a separate instructional
sheet for iOS, where `beforeinstallprompt` does not exist.

---

## Project structure

```text
src/
├── assets/                 generated Islamic artwork — icons, badges, backgrounds (no emoji in UI)
├── components/
│   ├── admin/              LiveStreamsAdmin — runtime configuration surfaces
│   ├── ui/                 shadcn/ui primitives (design-token driven)
│   └── *.tsx               feature screens: QuranReader, HafizMode, FamilyCycle, ScholarsQA, …
├── contexts/               AuthContext · ThemeContext · LanguageContext
├── data/                   static datasets: surah metadata, adhkar, seed Q&A
├── hooks/                  useAudioPlayer, use-mobile, use-toast
├── integrations/supabase/  generated client + types (do not edit)
├── lib/                    domain logic (mushafPages, familyMode, adhan, liveStreams, noorCalculator, …)
├── pages/                  Index (view router) · Auth · AuthCallback · NotFound
└── test/                   vitest setup and specs
supabase/
├── functions/islamic-chat/ streaming AI companion
└── config.toml
public/
├── sw.js                   versioned service worker
└── manifest.json           PWA manifest
```

All colours, gradients and shadows are **semantic design tokens** in `src/index.css` and `tailwind.config.ts`;
components never hard-code colour utilities, which is what makes dark mode and the five Mushaf page themes
work without per-component overrides.

---

## Local development

```bash
# Requirements: Node 18+ (or Bun), a Supabase project
npm install
cp .env.example .env        # if present; otherwise create .env as below
npm run dev                 # http://localhost:8080
```

`.env` (publishable values only — never commit service-role keys):

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
VITE_SUPABASE_PROJECT_ID=<project ref>
```

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production bundle |
| `npm run preview` | Serve the production build (use this to exercise the service worker) |
| `npm run lint` | ESLint across the workspace |
| `npm run test` | Vitest suite |

Schema changes are applied as migrations against the Supabase project; the generated
`src/integrations/supabase/types.ts` and `client.ts` are build artefacts and must not be edited by hand.

---

## Admin operations

Admins are users with an `admin` row in `user_roles`. The panel (menu → **Admin Panel**) exposes:

- **Users** — roster with search by name or id.
- **Admins** — current privileged accounts.
- **Events** — recent telemetry / auth funnel events.
- **Streams** — create, reorder, hide or edit live broadcasts: labels and subtitles in English and Arabic,
  YouTube link or bare video ID (pasted watch / `youtu.be` / embed / live URLs are normalised automatically),
  the "Watch on YouTube" link, and embed parameters via toggle chips
  (`modestbranding`, `playsinline`, `rel=0`, `iv_load_policy=3`, `controls`, `loop`, captions) or a raw
  parameter string. A live preview of the resulting embed URL is shown before saving, and the public section
  picks changes up on next load — with a cached copy for offline visits.

---

## Engineering conventions

- **TypeScript strict-friendly**: domain types are declared once in `src/lib` and reused by the UI.
- **No business logic in components**: screens compose hooks and `lib` functions.
- **Tokens, not literals**: no `bg-[#…]`, `text-white`, or ad-hoc colour utilities.
- **Accessibility**: 44–56 px touch targets, `aria-label` on icon-only controls, full keyboard reachability,
  RTL verified for every Arabic surface.
- **Islamic content standards**: ﷺ after the Prophet's name; every hadith citation carries an authenticity
  grading (Sahih / Hasan / Da'if); Quran and hadith references always name the primary source.
- **SEO/meta**: descriptive title and description, single `h1`, semantic landmarks, lazy-loaded imagery.

---

## Roadmap

- Karaoke word-level timing for every reciter (currently best-effort where timing data exists).
- Push-based family reminders via Web Push in addition to the local scheduler.
- Circle-level analytics for teachers and study groups.
- Expanded Q&A corpus and reviewer workflow for submitted questions.

---

<div align="center">
<img src="src/assets/badges/badge-master.png" width="72" alt="" />

**Al-Bayan** — built with iḥsān. Contributions and corrections to religious content are especially welcome.
</div>
