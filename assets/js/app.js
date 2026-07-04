/* =========================================================
   app.js — shared helpers used across all pages
   Now wired to the real Express/MongoDB backend (see /backend)
   instead of demo localStorage. Auth uses a JWT stored in
   sessionStorage; student display info is cached alongside it.
   ========================================================= */

// Change this when deploying — point at your live Render URL,
// e.g. "https://academic-advising-system.onrender.com/api"
const API_BASE = "http://localhost:5000/api";

const STORAGE_SESSION_KEY = "studentData"; // matches Appendix A naming
const STORAGE_TOKEN_KEY = "aas_token";

/* ---------- Shared DOM helper used by advisor.js, results.js, dashboard.js ---------- */
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else node.setAttribute(k, v);
  });
  children.forEach((c) => node.appendChild(c));
  return node;
}

/* Merge carry-over + failed courses into one pool — a failed course IS a
   carry-over course. Dedupe by code, keeping the larger unit value if a
   code appears in both lists. Used by advisor.js (planning) and results.js
   (accurate flagged-course count). */
function mergeCourseLists(a, b) {
  const map = new Map();
  [...a, ...b].forEach((c) => {
    if (!c.courseCode) return;
    const existing = map.get(c.courseCode);
    if (!existing || c.units > existing.units) map.set(c.courseCode, c);
  });
  return [...map.values()];
}

function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_SESSION_KEY));
  } catch (e) {
    return null;
  }
}

function setSession(student) {
  sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(student));
}

function clearSession() {
  sessionStorage.removeItem(STORAGE_SESSION_KEY);
  sessionStorage.removeItem(STORAGE_TOKEN_KEY);
}

function getToken() {
  return sessionStorage.getItem(STORAGE_TOKEN_KEY);
}

function setToken(token) {
  sessionStorage.setItem(STORAGE_TOKEN_KEY, token);
}

function requireAuth() {
  const student = getSession();
  if (!student || !getToken()) {
    window.location.href = "signin.html";
  }
  return student;
}

/* ---------- API helper ----------
   Wraps fetch with the API base URL, JSON handling, and the
   Authorization header when a token is present. Throws an Error
   with the backend's message on non-2xx responses so callers can
   just try/catch and show err.message to the user. */
async function apiFetch(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new Error("Couldn't reach the server. Make sure the backend is running.");
  }

  let data = {};
  try {
    data = await response.json();
  } catch (parseErr) {
    // non-JSON response, fall through with empty data
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status}).`);
  }
  return data;
}

/* ---------- Mobile nav toggle ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const linksGroup = document.querySelector(".nav-links-group");
  if (toggle && linksGroup) {
    toggle.addEventListener("click", () => {
      linksGroup.classList.toggle("open");
    });
  }

  // Highlight active nav link + show student name if signed in
  const here = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach((a) => {
    if (a.getAttribute("href") === here) a.classList.add("active");
  });

  const nameSlot = document.querySelector("[data-student-name]");
  const session = getSession();
  if (nameSlot && session) {
    nameSlot.textContent = session.firstName || session.email;
  }

  const logoutBtn = document.querySelector("[data-logout]");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      clearSession();
      window.location.href = "index.html";
    });
  }
});

/* ---------- Animated GPA gauge (hero signature element) ---------- */
function drawGauge(svgEl, value, max = 5.0) {
  if (!svgEl) return;
  const radius = 80;
  const circumference = Math.PI * radius; // half circle
  const pct = Math.max(0, Math.min(1, value / max));
  const track = svgEl.querySelector(".gauge-track");
  const fill = svgEl.querySelector(".gauge-fill");
  if (track) {
    track.setAttribute("stroke-dasharray", `${circumference} ${circumference}`);
  }
  if (fill) {
    fill.setAttribute("stroke-dasharray", `${circumference} ${circumference}`);
    fill.setAttribute("stroke-dashoffset", `${circumference}`);
    requestAnimationFrame(() => {
      fill.style.transition = "stroke-dashoffset 1.4s cubic-bezier(.16,1,.3,1)";
      fill.setAttribute("stroke-dashoffset", `${circumference - circumference * pct}`);
    });
  }
}
