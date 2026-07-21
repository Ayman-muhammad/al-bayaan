## Scope
Implement the full spec across DB, UI, navigation, and cross-screen deep-linking. The existing Family Hifdh Circle (`circles`, `family_goals`) is a different feature — I'll keep it and add the new intention-based **Family Cycle** alongside it.

## Phase A — Database (single migration, needs your approval)
New tables (all with GRANTs + RLS scoped to `auth.uid()`):
- `family_cycles`, `family_members`, `cycle_activities`, `cycle_completions`, `cycle_checkins`
- `questions`, `answers`, `scholars` (scholars/answers publicly readable)
- `hifz_progress`, `hifz_sessions`
- `user_quran_prefs`, `family_reminders`
Existing `bookmarks` table will get `highlight_color` + `note` columns if missing.

## Phase B — Purge (code, one pass)
Remove from routes, nav, imports, and files:
- `ArabicCourse.tsx`, `VoiceJournal.tsx`
- Standalone "Ask Question" + "Compare Madhhab" entry points (keep Scholars Q&A which subsumes them)
Update `Index.tsx` view union, `Navbar`, `HeroSection` quick cards, `BottomNav`.

## Phase C — Navigation & Home
- New `BottomNav`: Home · Quran · **Family Cycle (center, larger, pulse)** · Scholars · More
- Home redesign: greeting + Hijri, two live-stream preview cards (new embed IDs), 2×2 quick actions, prayer countdown (reuse `HomePrayerWidget`), streak strip.
- New `LiveStreams.tsx` full player with Makkah/Madinah toggle.

## Phase D — Adhkar
- New `Adhkar.tsx` with Morning (30) and Evening (25) collections, per-item counter, progress bar, references. Reads `?familyCycle=true&type=morning|evening` and shows "Mark as Family Done".

## Phase E — Family Cycle (signature)
- `FamilyCycle.tsx` (new, distinct from existing `FamilyCircle.tsx`):
  - Wizard: intention → members → auto-generated activities with deep-link previews
  - Daily dashboard: Morning/Evening blocks, activity cards with `OPEN` (deep link) + `MARK DONE`
  - Progress ring, streaks, badges, weekly summary
- Deep-link contract: `?familyCycle=<activityId>` on `/quran`, `/adhkar`, `/dhikr` → shows floating "Mark as Family Done" → writes to `cycle_completions` → toast + auto-return.
- Reminders: `family_reminders` table + local scheduler using existing `notifications.ts` chime for morning/evening.

## Phase F — Quran Mushaf reader
Refactor `QuranReader.tsx`:
- Line-based layout using API `line_number` grouping, RTL justified, `font-size:0` container trick
- Font family selector (Uthmani/Amiri/Scheherazade/Indo-Pak/Qalam via Google Fonts in `index.html`)
- Font size 1–10 (Big Text Mode ≥5), line/word spacing, 5 page themes — persisted in `user_quran_prefs`
- Word: tap = sheet (translit/translation/root), long-press = highlight, double-tap ayah = action bar
- Audio karaoke word highlight (best-effort from existing timing where available), 8 reciters
- Global search modal, jump-to-page
- Family mode floating button when `?familyCycle=<id>`

## Phase G — Scholars Q&A
Rewrite `ScholarsQA.tsx` to be Supabase-backed:
- 8 pre-seeded scholars, filter chips, expandable accordion answers with source citations (book/vol/page/publisher/url)
- FAB → ask modal writes to `questions`
- Keep existing local `scholarsQA.ts` as seed data for `answers` table

## Phase H — Hifz
Enhance `HafizMode.tsx`:
- Same Mushaf font engine as reader
- Word masking (tap/double-tap), karaoke sync, repeat pills, test mode fill-in
- Calendar heatmap + SRS due queue backed by `hifz_progress.review_due`

## Phase I — More screen
Regroup settings into sections: Core, Prayer, Family Cycle, App (theme/lang/fonts/page theme), About. Write Quran prefs to `user_quran_prefs`.

## Phase J — Polish
- Update live-stream embed IDs in `LiveStreamSection`
- PWA manifest theme, ensure service worker unchanged (already caches audio)
- Landscape fullscreen for streams, safe-area padding audit

## Delivery order
Since the DB migration blocks everything and needs your approval, I'll ship it first. After you approve, I'll execute B→J in tight batches (2–3 phases per turn) with parallel file writes, so you can preview progress incrementally rather than waiting for one giant unverified drop.

## Technical notes
- Existing `FamilyCircle.tsx` (Hifdh Circle) stays under the `family` view; new Family Cycle lives at a new `cycle` view + is the center bottom-nav slot.
- `bookmarks` already exists per DB inspection — I'll `ALTER` to add missing columns rather than recreate.
- Google Fonts (Amiri, Scheherazade New, Noto Naskh Arabic, Reem Kufi) loaded via `<link>` in `index.html`; Uthmani via KFGQPC web font CDN with Scheherazade fallback.
- Deep-link handling done via `useSearchParams` in each target screen, no route additions needed beyond current SPA.

Reply "go" (or approve the migration when it appears) and I'll ship Phase A immediately, then continue.