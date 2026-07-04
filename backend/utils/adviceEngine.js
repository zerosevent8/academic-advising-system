// utils/adviceEngine.js
// Implements the advice rules based on the student's actual college
// handbook (Section 1.9.6.5 "Minimum and Maximum Credit Load per
// Semester" and 1.9.6.6 "Application for Excess Credit Load").

// Handbook 1.9.6.5 — every student must register between 15 and 24
// credit units per semester (new courses; carry-overs are on top of this).
const MIN_LOAD = 15;
const MAX_LOAD = 24;

function validateInput({ gpa, courseLoad, level, semester }) {
  const errors = [];

  if (gpa === undefined || gpa === null || Number.isNaN(Number(gpa))) {
    errors.push("GPA is required.");
  } else if (gpa < 0 || gpa > 5.0) {
    errors.push("GPA must be between 0.0 and 5.0.");
  }

  if (!Number.isInteger(Number(courseLoad)) || Number(courseLoad) < MIN_LOAD || Number(courseLoad) > MAX_LOAD) {
    errors.push(`Number of credit units this semester must be between ${MIN_LOAD} and ${MAX_LOAD}.`);
  }

  if (!level) {
    errors.push("Current level is required.");
  }

  if (!semester) {
    errors.push("Current semester is required.");
  }

  return errors;
}

// Handbook 1.9.6.6 — Excess Credit Load (ECL) table. A student can apply
// to register beyond the 24-unit ceiling, by an amount that depends on
// their GPA. Below 2.00, no excess is permitted at all.
function getExcessUnits(gpa) {
  if (gpa >= 3.5) return 3;
  if (gpa >= 3.0) return 2;
  if (gpa >= 2.0) return 1;
  return 0;
}

/* ---------- Course code parsing ----------
   Convention: LETTERS + 3 digits. Digit 1 = level, digit 2 = semester
   (1 = first, 2 = second), digit 3+ = serial. E.g. MTH112 = 100L First
   Semester, CSC225 = 200L Second Semester.
   Exception: GST courses use the LAST digit for semester instead of the
   second digit (GST101 = First Semester, by department convention), since
   GST numbering doesn't follow the departmental level/semester pattern.
   Returns null if the code doesn't match this pattern at all. ---------- */
function parseCourseCode(code) {
  if (!code) return null;
  const match = code.trim().toUpperCase().match(/^([A-Z]+)\s*(\d{3,})$/);
  if (!match) return null;
  const prefix = match[1];
  const digits = match[2];
  const levelDigit = parseInt(digits[0], 10);
  if (!levelDigit || levelDigit < 1 || levelDigit > 6) return null;
  const level = String(levelDigit * 100);
  const semDigit = prefix === "GST" ? digits[digits.length - 1] : digits[1];
  let semester = null;
  if (semDigit === "1") semester = "first";
  else if (semDigit === "2") semester = "second";
  return { level, semester };
}

/* Merge carry-over + failed courses into one pool — a failed course IS a
   carry-over course. Dedupe by code, keeping the larger unit value if a
   code appears in both lists. */
function mergeCourseLists(a, b) {
  const map = new Map();
  [...a, ...b].forEach((c) => {
    if (!c.courseCode) return;
    const existing = map.get(c.courseCode);
    if (!existing || c.units > existing.units) map.set(c.courseCode, c);
  });
  return [...map.values()];
}

/* Classify a course relative to the student's current semester. */
function classifyCourseTiming(course, currentSemester) {
  const parsed = parseCourseCode(course.courseCode);
  if (!parsed || !parsed.semester) return { ...course, status: "unknown" };
  if (parsed.semester === currentSemester) return { ...course, status: "registerNow", parsedLevel: parsed.level };
  if (currentSemester === "first" && parsed.semester === "second") {
    return { ...course, status: "laterThisSession", parsedLevel: parsed.level };
  }
  if (currentSemester === "second" && parsed.semester === "first") {
    return { ...course, status: "deferNextLevel", parsedLevel: parsed.level };
  }
  return { ...course, status: "unknown" };
}

/* Group a pool of courses into tiers by credit unit value (descending),
   then greedily fill the given headroom tier by tier. When a tier can
   only PARTIALLY fit (e.g. headroom fits 1 of 3 equally-weighted
   courses), that whole tier is reported as a "tie" rather than silently
   picking specific ones — the student should choose which to register
   themselves, since they carry equal weight. */
function planCapacity(pool, headroom) {
  const sorted = [...pool].sort((a, b) => b.units - a.units);
  const tiers = [];
  sorted.forEach((c) => {
    const last = tiers[tiers.length - 1];
    if (last && last.units === c.units) last.courses.push(c);
    else tiers.push({ units: c.units, courses: [c] });
  });

  let remaining = Math.max(headroom, 0);
  const confirmed = [];
  const deferred = [];
  const ties = [];

  tiers.forEach((tier) => {
    const tierCount = tier.courses.length;
    const fitCount = tier.units > 0 ? Math.floor(remaining / tier.units) : 0;

    if (fitCount >= tierCount) {
      confirmed.push(...tier.courses);
      remaining -= tier.units * tierCount;
    } else if (fitCount > 0) {
      // Ambiguous tie — some but not all of this equal-priority group fit.
      ties.push({ units: tier.units, fitCount, courses: tier.courses });
      remaining -= tier.units * fitCount;
    } else {
      deferred.push(...tier.courses);
      // don't touch `remaining` — a smaller-unit tier further down might still fit
    }
  });

  return { confirmed, deferred, ties, used: Math.max(headroom, 0) - remaining };
}

/* ---------- Easter eggs ----------
   #1 fires alone whenever GPA ≤ 0.5. The full pool of 10 fires (randomly)
   only when GPA ≤ 0.5 AND there's more than one carry-over/failed course
   stacked on top of the academic trouble. ---------- */
const LOW_GPA_JOKES = [
  "bro just go rewrite jamb or go learn hand work, abi barbing go fit you? Or you don think about privet chef?",
  "GPA dey cry, carryover dey multiply like rabbit. Abeg go check if Mai Suya dey recruit, at least suya no go carry over.",
  "Honestly bros, even WAEC go send you apology letter for this one. Maybe agric business go favor you — goat no go ask you for prerequisite.",
  "Ehen, carryover plenty pass railway track. Make I advise you go learn okada riding — first come first serve, no GPA wahala.",
  "Chairman, this GPA na real tatafo. Go una papa shop — at least there you go sabi calculate change correctly unlike this exam.",
  "Lol, school don turn Big Brother house for you, you don dey there too long. Content creation go pay better — \"views\" no get exam.",
  "Egbon, GPA low like generator fuel for December, carryover plenty like NEPA bill. Find one fine hustle, this school ting no dey gree work for you.",
  "Haba, your lecturers go soon start to greet you \"Sir/Ma\" for seniority. Try cobbler apprenticeship — shoe no dey fail anybody.",
  "My capacity, carryover dey follow you like shadow. Abeg consider DJ-ing — nobody go ask you for second semester result for club.",
  "Big man, calculator go dey shake before e show your CGPA. Time to open small chops business — puff-puff no need 2.4 minimum requirement.",
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateAdvice({ gpa, courseLoad, failedCourses = [], carryOverCourses = [], level, semester, isFinalLevel }) {
  const advice = [];
  const combinedPool = mergeCourseLists(carryOverCourses, failedCourses);

  // Rule 1 — GPA threshold (rebalanced for the 0.0–5.0 scale)
  if (gpa <= 0.5) {
    // 🥚 easter egg — couldn't resist
    const joke = combinedPool.length > 1 ? pickRandom(LOW_GPA_JOKES) : LOW_GPA_JOKES[0];
    advice.push({ flag: "low", tag: "Real Talk", title: "Omo... 😹", body: joke });
  } else if (gpa < 1.5) {
    advice.push({
      flag: "low",
      tag: "GPA Alert",
      title: "Improve your study habits",
      body:
        "Your GPA is below 1.5, which puts you at risk of academic probation. It's recommended to consult your academic advisor, prioritize courses with higher credit units, and commit more study time this semester before it affects your standing.",
    });
  } else if (gpa < 2.4) {
    advice.push({
      flag: "warn",
      tag: "Watch Point",
      title: "Room to improve",
      body:
        "Your GPA is below 2.4 — short of Second Class Lower. Reviewing past test scripts and meeting your advisor before the next registration window can help raise it.",
    });
  }

  // Rule 2 — Carry-over & failed course plan (merged pool, semester-aware,
  // GPA-aware Excess Credit Load ceiling)
  if (combinedPool.length > 0) {
    const levelLabel = level ? `${level} Level` : "your level";
    const semesterLabel = semester === "second" ? "Second Semester" : "First Semester";
    const nextLevelLabel = level ? `${Number(level) + 100} Level` : "your next level";

    const classified = combinedPool.map((c) => classifyCourseTiming(c, semester));
    const dueNow = classified.filter((c) => c.status === "registerNow");
    const laterThisSession = classified.filter((c) => c.status === "laterThisSession");
    const deferNextLevel = classified.filter((c) => c.status === "deferNextLevel");
    const unknownCodes = classified.filter((c) => c.status === "unknown").map((c) => c.courseCode);

    const excessUnits = getExcessUnits(gpa);
    const effectiveCeiling = MAX_LOAD + excessUnits;
    const headroom = effectiveCeiling - courseLoad;

    const { confirmed, deferred, ties } = planCapacity(dueNow, headroom);

    const parts = [];

    if (confirmed.length > 0) {
      parts.push(
        `Register now for ${semesterLabel}: ${confirmed.map((c) => `${c.courseCode} (${c.units}u)`).join(", ")}.`
      );
    }

    ties.forEach((tie) => {
      parts.push(
        `You have room for ${tie.fitCount} more at ${tie.units} units each — pick any ${tie.fitCount} you're comfortable with from: ${tie.courses.map((c) => c.courseCode).join(", ")} (all ${tie.units}u, equal priority, so it doesn't matter which).`
      );
    });

    if (deferred.length > 0) {
      const deferList = deferred.map((c) => `${c.courseCode} (${c.units}u)`).join(", ");
      if (excessUnits > 0) {
        parts.push(
          `These don't fit even with your Excess Credit Load allowance: ${deferList}. Based on your GPA, you may apply to your department's exam officer for an Excess Credit Load (ECL) of up to ${excessUnits} extra unit${excessUnits > 1 ? "s" : ""} (raising your ceiling to ${effectiveCeiling} units this semester) — or defer the rest to a later semester.`
        );
      } else {
        parts.push(
          `These don't fit this semester: ${deferList}. Excess Credit Load isn't available at your current GPA (it requires at least 2.00), so you'll need to defer the rest to a later semester instead.`
        );
      }
    } else if (ties.length > 0 && excessUnits > 0) {
      parts.push(
        `If you want to register all of the above instead of picking, you may apply for an Excess Credit Load of up to ${excessUnits} extra unit${excessUnits > 1 ? "s" : ""} based on your GPA.`
      );
    }

    if (laterThisSession.length > 0) {
      const otherSemesterLabel = semester === "first" ? "Second Semester" : "First Semester";
      parts.push(
        `Not due yet — these open later this session in ${otherSemesterLabel}: ${laterThisSession.map((c) => c.courseCode).join(", ")}.`
      );
    }
    if (deferNextLevel.length > 0) {
      if (isFinalLevel) {
        parts.push(
          `${deferNextLevel.map((c) => c.courseCode).join(", ")} would normally roll into ${nextLevelLabel}'s First Semester — but since this is your final level, there's no next level to roll into. You'd need to stay an extra session to access that slot. Speak to your department urgently.`
        );
      } else {
        parts.push(
          `${deferNextLevel.map((c) => c.courseCode).join(", ")} already passed ${levelLabel}'s First Semester window — register them in ${nextLevelLabel}'s First Semester instead.`
        );
      }
    }
    if (unknownCodes.length > 0) {
      parts.push(
        `Couldn't tell which semester these belong to from the code, so they're not included in the capacity plan above — confirm with your department and register separately: ${unknownCodes.join(", ")}.`
      );
    }

    let flag = "good";
    if (deferred.length > 0 || deferNextLevel.length > 0) flag = "low";
    else if (ties.length > 0) flag = "warn";

    advice.push({
      flag,
      tag: "Carry-Over Plan",
      title: "Your carry-over & failed course plan",
      body: parts.join(" "),
    });

    if (isFinalLevel && (deferNextLevel.length > 0 || deferred.length > 0)) {
      advice.push({
        flag: "low",
        tag: "Graduation Risk",
        title: "You may need an extra semester to graduate",
        body:
          "Since you're in your final level and can't clear everything above this semester, you're at real risk of needing an extra semester or session before you can graduate. Meet your department's exam officer or HOD as soon as possible to confirm your clearance status.",
      });
    }
  }

  // All clear
  if (advice.length === 0) {
    advice.push({
      flag: "good",
      tag: "On Track",
      title: "You're doing great — keep it up",
      body: "Your GPA, course load, and course history all look healthy. Maintain your current study routine and continue monitoring your academic progress each semester.",
    });
  }

  return advice;
}

module.exports = { validateInput, generateAdvice };
