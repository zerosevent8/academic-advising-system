/* =========================================================
   dashboard.js — lists past advice sessions from the real backend
   (GET /api/advice-history)
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  const list = document.getElementById("historyList");
  if (!list) return;

  const session = requireAuth();
  const nameSlot = document.querySelector("[data-student-name]");
  if (nameSlot && session) nameSlot.textContent = session.firstName || session.email;

  list.appendChild(el("div", { class: "empty-state", id: "historyLoading" }, [el("p", { text: "Loading your history…" })]));

  let history = [];
  try {
    const data = await apiFetch("/advice-history");
    history = data.records || [];
  } catch (err) {
    document.getElementById("historyLoading").remove();
    list.appendChild(
      el("div", { class: "empty-state" }, [
        el("h3", { text: "Couldn't load your history" }),
        el("p", { text: err.message }),
        el("a", { href: "advisor.html", class: "btn btn-primary", text: "Get advice now" }),
      ])
    );
    return;
  }

  document.getElementById("historyLoading").remove();

  if (history.length === 0) {
    list.appendChild(
      el("div", { class: "empty-state" }, [
        el("h3", { text: "No advice sessions yet" }),
        el("p", { text: "Once you run the advisor form, your past results will appear here." }),
        el("a", { href: "advisor.html", class: "btn btn-primary", text: "Get advice now" }),
      ])
    );
    return;
  }

  history.forEach((record) => {
    const date = new Date(record.createdAt);
    const card = el("div", { class: "card" }, [
      el("div", { class: "icon icon-navy", text: "📋" }),
      el("h3", { text: `GPA ${record.gpa.toFixed(2)} · ${record.courseLoad} units` }),
      el("p", {
        text: `${record.advice.length} advice item${record.advice.length > 1 ? "s" : ""} generated on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}.`,
      }),
      el("span", { class: "rule-tag", text: record.advice.map((a) => a.tag).join(" · ") }),
    ]);
    list.appendChild(card);
  });
});
