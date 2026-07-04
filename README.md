# University Undergraduate Web-Based Academic Advising System

Built from the project document "Development of University Undergraduate Web Based
Academic Advising System" (MOUAU/CMP/21/113700). MERN-stack architecture: a static
frontend you can open immediately, plus an Express/MongoDB backend scaffold that
matches the system design in Chapter 4.

## What's included

```
/                     ← frontend (open index.html in a browser, no build step)
  index.html          Welcome / landing page
  signin.html         Sign in
  signup.html         Create account
  advisor.html        GPA / course load / carry-over / failed courses input form
  results.html        Generated advice
  dashboard.html      Advice history
  assets/css/styles.css
  assets/js/          app.js, auth.js, advisor.js, results.js, dashboard.js

backend/              Express + MongoDB API (Chapter 4.2 architecture)
  server.js
  routes/auth.js          POST /api/auth/signup, /api/auth/signin
  routes/advice.js        POST /api/generate-advice, GET /api/advice-history
  models/Student.js       Data Dictionary (Chapter 4.4) as a Mongoose schema
  models/AdviceRecord.js  History of every advice session
  middleware/auth.js      JWT route protection
  utils/adviceEngine.js   The Chapter 4.6 algorithm, shared logic
  .env.example
  package.json
```

## Running it — frontend + backend together

The frontend is now wired to the real Express/MongoDB backend — sign-up,
sign-in, advice generation, history, and feedback all go through real API
calls (`assets/js/app.js`'s `apiFetch` helper), not localStorage demo data.
That means **the backend must be running** for the site to work.

**1. Start the backend first:**
```bash
cd backend
npm install
cp .env.example .env   # fill in your MongoDB Atlas URI + a JWT secret
npm start
```
You should see `Connected to MongoDB` and `Server running on port 5000`.

**2. Serve the frontend** (from the project root, in a separate terminal):
```bash
python3 -m http.server 8081
```
Open `http://localhost:8081` in a browser.

**3. Update the API URL if needed.** `assets/js/app.js` has:
```js
const API_BASE = "http://localhost:5000/api";
```
Change this when you deploy the backend somewhere live (e.g. Render) —
everything else (`auth.js`, `advisor.js`, `results.js`, `dashboard.js`) reads
from this one constant, so it's the only place that needs updating.

**Note on ports:** the backend's CORS is set up to automatically allow any
`localhost`/`127.0.0.1` port, so it doesn't matter which port you serve the
frontend on (8080, 8081, whatever's free) — no `.env` changes needed for
that. `CLIENT_ORIGIN` in `.env` is only used as a second allowed origin for
when you deploy the frontend somewhere with a fixed URL.

The advice rules are implemented identically on both sides historically
(`backend/utils/adviceEngine.js` is now the only copy — the frontend calls it
via `POST /api/generate-advice` rather than computing advice itself), so
there's nothing to keep in sync anymore.

## The advisory rules

All advice logic lives in **one place** — `backend/utils/adviceEngine.js` —
called via `POST /api/generate-advice`. The frontend no longer computes
advice itself (it used to, in an earlier version of this project; that
duplicate copy was removed once the real backend was wired up, so the two
can never drift apart).

**Registration range:** every student must register **15–24 credit units**
of new (current-level) courses per semester — this is enforced by the form
itself, not just suggested (`MIN_LOAD` / `MAX_LOAD` in `adviceEngine.js`).

**Excess Credit Load (ECL):** a student may apply to register beyond the
24-unit ceiling for carry-over/failed courses, by an amount that scales with
their GPA (`getExcessUnits`):

| GPA | Extra units allowed |
|---|---|
| ≥ 3.50 | +3 |
| 3.00–3.49 | +2 |
| 2.00–2.99 | +1 |
| < 2.00 | none |

| Condition | Advice |
|---|---|
| GPA ≤ 0.5 | 🥚 Easter egg — a random joke (see below) if 2+ carry-over/failed courses are listed, otherwise a single fixed one |
| GPA < 1.5 | Flagged for improvement — at risk of academic probation |
| GPA 1.5–2.39 | Watch point — below Second Class Lower, advised to improve |
| Carry-over/failed courses fit within 24 + ECL units | Register now |
| Carry-over/failed courses of equal credit-unit value only partially fit | Reported as a **tie** — the student is told to pick which ones themselves, since the system has no basis to choose between equally-weighted courses |
| Carry-over/failed courses exceed 24 + ECL units | Listed as deferred, with the ECL application suggested if the student's GPA qualifies |
| Carry-over/failed course not due yet (offered later this session) | Flagged as "not due yet," no action needed |
| Carry-over/failed course already missed its window this level | Advised to register it in the next level's First Semester instead |
| Course code doesn't match the level/semester pattern | Excluded from capacity planning entirely (not guessed) and flagged for the student to confirm manually |
| Final level + a missed-window or capacity-deferred course | Extra graduation-risk warning — no "next level" exists, so this means an extra session |
| None of the above | "On track" confirmation |

**Failed courses and carry-over courses are merged into one pool** before
planning (a failed course is, functionally, a carry-over) — if the same code
appears in both lists, the larger unit value wins and it's only counted once.

**Course-code semester parsing** (`parseCourseCode` in `adviceEngine.js`):
for a code like `MTH112`, digit 1 = level (100), digit 2 = semester (1 =
First, 2 = Second), rest = serial. `GST` courses are a documented exception
— they use the **last** digit for semester instead of the second digit
(`GST101` = First Semester) since GST numbering doesn't follow the
departmental pattern.

**Tie-breaking (`planCapacity`):** carry-over/failed courses are grouped into
tiers by credit-unit value (highest first) and filled greedily into whatever
room is left under the ceiling. If a tier of equally-weighted courses can
only *partially* fit, the system doesn't silently pick winners — it reports
the whole tier as a tie and tells the student to choose, since there's no
principled reason to prefer one 4-unit course over another 4-unit course.

These numbers (15/24 minimum/maximum, the ECL table) come directly from the
student's college handbook — adjust `MIN_LOAD`, `MAX_LOAD`, and
`getExcessUnits()` at the top of `backend/utils/adviceEngine.js` if your own
institution's numbers differ. The student also provides their current
**level**, **semester**, and whether it's their **final level**, which feeds
into this logic and the graduation-risk warning.

### Feedback

Every advice card has a 👍 Helpful / 👎 Not helpful row. Ratings are stored in
`localStorage` (`aas_feedback`, keyed by `<recordId>_<itemIndex>`) so they
persist across reloads, and can be toggled or changed at any time. The
backend has a matching `Feedback` model and `POST /api/feedback` /
`GET /api/feedback/:adviceRecordId` route ready (`backend/routes/feedback.js`)
for once the frontend is wired to the real API — this lets the department
see which advice rules actually land with students.

### Easter egg

If GPA ≤ 0.5 and the student has more than one carry-over/failed course, one
joke is picked at random from a 10-item pool (`LOW_GPA_JOKES` in
`assets/js/advisor.js` / `backend/utils/adviceEngine.js`) — Nigerian-pidgin
"maybe school isn't for you right now" humor. With 0–1 carry-overs, GPA ≤ 0.5
always shows the same fixed joke instead of a random one.

## Design notes

Palette: deep academic navy (`#0F1A33`) with an honors-gold accent (`#E8A23D`),
echoing graduation regalia rather than a generic SaaS look. Display type is Space
Grotesk, body type is Inter. The signature element is the animated GPA gauge on the
homepage hero, tying the visual identity directly to the system's core metric.
