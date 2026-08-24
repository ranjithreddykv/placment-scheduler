# Placement Week Scheduler

A coordinator tool for running a college placement week: 35 companies, 800 students, 20 rooms, 4 days. It generates a realistic dataset, builds a constraint-aware interview schedule, and replans with **minimal disruption** when things go wrong mid-week — a company arrives late, a panel drops out, a student withdraws, or a room goes down.

Built for a Mirai Labs Software Developer Intern take-home assessment. MERN stack, no unnecessary infrastructure.

## 1. Project Overview

Placement week scheduling is a constraint satisfaction problem: every interview needs a student, a company, a day, a time, a room, and a panel, none of which can double-book. On top of that, real placement weeks get disrupted — and a coordinator needs to know exactly what changed, who's affected, and why anything couldn't be scheduled, without the whole week's plan being torn up and rebuilt.

This project does three things:

1. **Generates a realistic dataset** — CGPA-gated shortlisting, tiered company priorities, and demand sized to genuinely contend for the fixed room supply (not an easy, everyone-gets-in dataset, and not an impossible one either).
2. **Builds a schedule with a greedy, constraint-aware algorithm** that never violates a hard constraint, and reports *why* every unscheduled interview couldn't be placed.
3. **Replans under disruption** by freezing everything unaffected and only touching what the disruption actually invalidated — then shows a full before/after diff.

## 2. Features

- Realistic dataset generation (35 companies / 800 students / 20 rooms / 4 days) with reproducible seeding
- Constraint-aware greedy scheduler (student, room, panel, company-window, arrival-delay, withdrawal, room-outage constraints — all hard, never violated)
- Every unscheduled interview carries a specific reason — nothing is silently dropped
- Four disruption types: company delay, panel drop, student withdrawal, room outage
- Minimal-disruption replanning: unaffected interviews are frozen and never touched
- Human-readable change diff after every replan, with a notify list per change
- Schedule version history (every replan is a new version, viewable independently)
- Coordinator dashboard: KPIs, a room×time schedule grid, conflict panel, disruption simulator, replan result modal, interview detail modal
- Metrics computed live from actual schedule data — nothing hardcoded

## 3. Architecture

```
React (Vite, Tailwind)
        │  Axios (REST)
        ▼
Express REST API  (controllers → routes)
        │
        ▼
Scheduling / Replanning Services   (services/scheduler, services/replanner, services/generator)
        │
        ▼
MongoDB  (Mongoose)
```

The scheduling and replanning logic is deliberately kept **out of Express controllers** — it lives in plain, testable JS modules under `server/src/services/`. Controllers are thin: parse the request, call a service, return the result. This is what makes the algorithm explainable in isolation (and testable without spinning up HTTP).

```text
server/src/
├── models/            Student, Company, Room, Interview, ScheduleVersion
├── services/
│   ├── generator/      realistic dataset generation
│   ├── scheduler/       initial (from-scratch) schedule building + metrics
│   └── replanner/       minimal-disruption replanning
├── controllers/ + routes/   thin REST layer
├── utils/               pure, reusable primitives (time math, availability, metrics math)
└── config/              constants (days, hours, lunch, enums) — the "rules of the world"
```

## 4. Data Model

**Student** — `studentId, name, cgpa, branch, graduationYear, shortlistedCompanies[{companyId, shortlistedAt}], status (ACTIVE/WITHDRAWN)`

**Company** — `companyId, name, category, cgpaCutoff, priorityTier (TIER_1/2/3), interviewDuration, panels[{panelId, status}], operatingSlots[{day, startTime, endTime}], arrivalDelay, delayedDay, status`

**Room** — `roomId, name, capacity, status, unavailableFrom/unavailableTo/unavailableDay`

**Interview** — one student × one company: `day, startTime, endTime, roomId, panelId, status (SCHEDULED/UNSCHEDULED/COMPLETED/CANCELLED), unscheduledReason, original{Day,StartTime,EndTime,RoomId,PanelId}` — the `original*` fields are set once at initial scheduling and never touched again, so the UI can always show "moved from X to Y" no matter how many replans have happened since.

**ScheduleVersion** — one row per generation/replan: `version, trigger, triggerDescription, changes[]` (the diff), `metrics`, `summary` (moved/unchanged/students affected/replan cost/disruption level).

## 5. Scheduling Algorithm

A **greedy, constraint-aware heuristic** — not an exact solver. Implemented in `services/scheduler/`:

1. **`generateRequirements`** — one requirement per (active student, shortlisted, non-cancelled company) pair.
2. **`sortRequirements`** — orders requirements by a priority score: company tier, company selectivity (CGPA cutoff), the student's own interview load (students with more interviews to fit get placed first, since they have the tightest constraints), and company volume. This is a single static sort, not a re-evaluated priority queue — that keeps the algorithm one readable pass.
3. **`findAvailableSlot`** — for each requirement, walks the company's operating days/times in chronological order and takes the *first* feasible (day, room, panel) combination. Because candidates are generated earliest-first, this naturally minimizes student waiting time without scoring every possible option.
4. Anything that can't be placed becomes `UNSCHEDULED` with one of: `NO_ROOM_AVAILABLE`, `NO_PANEL_AVAILABLE`, `STUDENT_CONFLICT`, `COMPANY_WINDOW_EXHAUSTED`, `NO_FEASIBLE_SLOT` — never silently dropped.

All slot bookings are tracked in an in-memory `ScheduleState` (`utils/availability.js`) during generation, so the tight inner loop (thousands of candidate checks) never touches MongoDB — the whole schedule is built in memory and bulk-inserted once.

## 6. Replanning Algorithm

Implemented in `services/replanner/`, following: **freeze → detect affected → reschedule affected → diff.**

1. **`detectAffectedInterviews`** — pure predicates, one per disruption type, that identify exactly which `SCHEDULED` interviews the disruption invalidates (e.g. company delay only flags that company's interviews on the delayed day that now start before the new arrival window).
2. **`freezeUnaffected`** — splits the schedule into frozen vs. affected, and rebuilds a `ScheduleState` containing *only* the frozen bookings. This is the mechanism that guarantees unaffected interviews are never touched: they're not even candidates for reassignment, and nothing new can collide with them.
3. **`rescheduleAffected`** — re-sorts affected requirements by the same priority score as initial scheduling, then re-slots each one. Where it makes sense (panel drop, room outage), it first tries a `preferred` slot — the interview's old day/time, just with the broken resource swapped out — before falling back to a full search. This is what keeps a panel drop from reshuffling everyone's timing when only the room/panel actually needs to change.
4. **`generateDiff`** — builds the before/after diff, notify list per change (student, company coordinator, old/new panel, placement coordinator), and rolls up into `calculateChangeCost` for a LOW/MEDIUM/HIGH disruption label.

**Deliberate scope decision:** the replanner never bumps an *unaffected* interview to make room for an affected one. If an affected interview can't be placed without disturbing something frozen, it becomes `UNSCHEDULED` with a reason rather than cascading the disruption to a third party. This is simpler to explain and arguably more correct — a company's own delay shouldn't cost some unrelated student their slot with a different company.

### Replanning cost function

```
replanCost = movedInterviews × 10
           + movedStudents × 5
           + waitingTimeIncreaseMinutes
           + priorityPenalty            (weighted by moved interviews' company tier)
           + newlyUnscheduled × 100
```

Unscheduled interviews are penalized far more than moved ones — the philosophy is "prefer fewer changes over completely rebuilding the schedule," and a failure to schedule at all is worse than any amount of reshuffling. `replanCost` classifies into LOW (<100) / MEDIUM (<400) / HIGH, shown to the coordinator as the "Schedule disruption" label.

### Transactions

Replan writes (interview updates → company/room/student state → new `ScheduleVersion`) run inside a MongoDB transaction when the connected database supports one (a replica set or Atlas). The zero-config in-memory database is started as a single-node replica set specifically so this works out of the box. If `MONGODB_URI` points at a plain standalone `mongod` (which doesn't support multi-document transactions), the code detects that and falls back to the same writes without a session — the whole new state is always computed in memory *before* any write happens, so a bug can never produce a half-written schedule; the transaction is what upgrades that from "safe by construction" to "atomic," where the target database allows it.

## 7. Constraints

**Hard constraints (never violated):**

- Student overlap — no student has two overlapping interviews
- Room overlap — no room hosts two interviews at once
- Panel overlap — no panel runs two interviews at once
- Company availability — no interview outside the company's operating window
- Company arrival delay — no interview before the (possibly delayed) arrival time
- Withdrawn students receive no interviews
- Unavailable rooms / dropped panels receive no interviews
- Lunch break (13:00–14:00) is never scheduled into

**Soft objectives (optimized, not guaranteed):**

- Minimize student waiting time
- Maximize priority-weighted completion
- Maximize room/panel utilisation
- Minimize schedule changes during replanning
- Minimize unscheduled interviews

When everything can't be satisfied: never violate a hard constraint → minimize unscheduled interviews → preserve high-priority interviews → minimize student disruption → minimize replan churn → report what couldn't be scheduled and why.

## 8. Metrics

All computed from live schedule data (`services/scheduler/calculateMetrics.js`) — nothing hardcoded.

| Metric | Meaning |
|---|---|
| Scheduling Rate | scheduled / total interviews |
| Room / Panel Utilisation | booked minutes ÷ theoretically available minutes (accounting for lunch and outages) |
| Avg Student Waiting Time | mean same-day gap between a student's consecutive interviews, across students who have ≥2 |
| Student Conflicts | overlapping-interview count — a correctness sanity check, always 0 under the hard constraints |
| Priority-Weighted Completion Rate | tier-weighted share of requirements scheduled (a Tier-1 no-show counts for more than a Tier-3 one) |
| Replan Churn | `moved interviews ÷ total scheduled interviews before the replan`, shown as a percentage in each version's diff |

## 9. Trade-offs

**Heuristic, not exact.** The scheduler is a constraint-aware greedy pass, not an ILP/CP-SAT solver. This keeps the system explainable end-to-end (a coordinator — or an interviewer — can read `findAvailableSlot` and understand exactly why an interview landed where it did) and fast enough to replan in real time on every disruption. It does not guarantee a mathematically optimal schedule.

**Dataset demand is intentionally tuned, not left at "realistic-sounding percentages."** Early iterations shortlisted students as a straightforward percentage of each company's CGPA-eligible pool (e.g., mass recruiters take 50–70% of eligible students). At the assignment's fixed scale — 35 companies with up to a handful of panels each, sharing only 20 rooms across 4 days — that produced ~7,800 requirements against a **structural room capacity of ~1,100–1,200 interviews** (20 rooms × 4 days × 8 effective hours), i.e. a 14% scheduling rate. That's mathematically "realistic" but a poor demo: nearly everything fails, and the dominant story becomes "there aren't enough rooms" for every company, not just a believable minority. `services/generator/generateShortlists.js` instead sizes each company's shortlist to a modest oversubscription of *that company's own interview capacity* (panels × operating window ÷ duration), then applies one global demand-scale constant tuned so the resulting schedule lands at a **believable majority-scheduled outcome with a clear, explainable unscheduled tail** (typically ~80% scheduled, room utilisation the dominant bottleneck). This is a deliberate product decision for a coordinator-facing demo, documented here rather than silently baked into a magic number.

**No transactions on a plain standalone MongoDB.** See §6 — transactions are used where the target database supports them, with a safe non-transactional fallback otherwise, rather than requiring every evaluator to stand up a replica set.

**No cascading reassignment.** See §6 — the replanner never displaces an unaffected interview to make room for an affected one.

## 10. Running Locally

Requires Node 18+. No local MongoDB install is required — see below.

```bash
# 1. Backend
cd server
npm install
npm run dev          # starts the API on http://localhost:5000

# 2. Frontend (separate terminal)
cd client
npm install
npm run dev           # starts the dashboard on http://localhost:5173
```

Open `http://localhost:5173` and click **Generate Demo Dataset**, then **Generate Schedule**, on the dashboard. That's the whole setup.

### Database

By default (`MONGODB_URI` unset in `server/.env`), the server starts an **in-memory MongoDB** (via `mongodb-memory-server`, as a single-node replica set so transactions work) automatically the moment it boots — zero setup. That instance lives only for the life of that `node` process; the dashboard's "Generate Demo Dataset" / "Generate Schedule" buttons populate it live, which is the recommended flow above.

To use a real, persistent database instead, set `MONGODB_URI` in `server/.env` to a local `mongod` or an Atlas connection string (see `.env.example`). With that set:

```bash
npm run seed   # generates the dataset + initial schedule directly into that database
npm run dev    # the running server sees the same data (it's a real, external DB)
```

`npm run seed` and `npm run dev` are separate processes — running `seed` without `MONGODB_URI` set will generate and print stats correctly (useful for smoke-testing the generator/scheduler on their own), but that data won't be visible to a subsequently-started `npm run dev`, since each process spins up its *own* fresh in-memory database. This is expected, not a bug — it's why the button-driven flow is the recommended path when you don't have a real MongoDB handy.

### Tests

```bash
cd server
npm test
```

Covers: hard-constraint enforcement (student/room/panel overlap, company arrival, withdrawn students, dropped panels, unavailable rooms), unscheduled-reason completeness, metrics correctness, replan freeze/reschedule/diff behavior — including a full end-to-end suite against a real (in-memory) MongoDB with transactions.

## Project Structure

```
placement-scheduler/
├── client/    React + Vite + Tailwind dashboard
├── server/    Express + Mongoose API, scheduling/replanning services
├── README.md
└── .env.example
```
