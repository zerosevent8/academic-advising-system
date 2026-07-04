/* =========================================================
   advisor.js — Input form behaviour
   Validation happens client-side for quick feedback; the actual
   advice rules live server-side in backend/utils/adviceEngine.js
   (POST /api/generate-advice) so logic never drifts between the
   two.
   ========================================================= */

/* ---------- Dynamic course rows (carry-over + failed) ---------- */
function createCourseRow(container, placeholder) {
  const row = el("div", { class: "course-row" });
  const codeInput = el("input", {
    type: "text",
    placeholder: placeholder || "Course code e.g. MTH112",
    "aria-label": "Course code",
  });
  const unitsInput = el("input", {
    type: "number",
    min: "1",
    max: "10",
    placeholder: "Units",
    "aria-label": "Credit units",
  });
  const removeBtn = el("button", {
    type: "button",
    class: "icon-btn",
    "aria-label": "Remove course",
    text: "×",
  });
  removeBtn.addEventListener("click", () => row.remove());
  row.appendChild(codeInput);
  row.appendChild(unitsInput);
  row.appendChild(removeBtn);
  container.appendChild(row);
}

function readCourseRows(container) {
  const rows = [...container.querySelectorAll(".course-row")];
  return rows
    .map((row) => {
      const [codeInput, unitsInput] = row.querySelectorAll("input");
      return {
        courseCode: codeInput.value.trim().toUpperCase(),
        units: Number(unitsInput.value) || 0,
      };
    })
    .filter((c) => c.courseCode !== "");
}

/* ---------- Page wiring ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("advisorForm");
  if (!form) return;

  requireAuth();

  const carryToggleYes = document.getElementById("carryYes");
  const carryToggleNo = document.getElementById("carryNo");
  const carrySection = document.getElementById("carrySection");
  const carryContainer = document.getElementById("carryCourses");
  const failedContainer = document.getElementById("failedCourses");

  function syncCarryVisibility() {
    carrySection.style.display = carryToggleYes.checked ? "block" : "none";
    document
      .querySelectorAll(".radio-card")
      .forEach((c) => c.classList.toggle("checked", c.querySelector("input").checked));
  }
  carryToggleYes.addEventListener("change", syncCarryVisibility);
  carryToggleNo.addEventListener("change", syncCarryVisibility);
  syncCarryVisibility();

  document.getElementById("addCarryCourse").addEventListener("click", () => {
    createCourseRow(carryContainer, "Course code e.g. CMP423");
  });
  document.getElementById("addFailedCourse").addEventListener("click", () => {
    createCourseRow(failedContainer, "Course code e.g. MTH112");
  });
  // Seed one row each
  createCourseRow(carryContainer);
  createCourseRow(failedContainer);

  function showError(fieldId, message) {
    const field = document.getElementById(fieldId).closest(".field");
    field.classList.add("invalid");
    field.querySelector(".field-error").textContent = message;
  }
  function clearErrors() {
    document.querySelectorAll(".field.invalid").forEach((f) => f.classList.remove("invalid"));
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    const gpa = parseFloat(document.getElementById("gpaInput").value);
    const courseLoad = parseInt(document.getElementById("courseLoadInput").value, 10);
    const level = document.getElementById("levelInput").value;
    const semester = document.getElementById("semesterInput").value;
    const isFinalLevel = document.getElementById("finalYes").checked;

    let hasError = false;

    if (Number.isNaN(gpa) || gpa < 0 || gpa > 5.0) {
      showError("gpaInput", "Enter a valid GPA between 0.0 and 5.0.");
      hasError = true;
    }
    if (!Number.isInteger(courseLoad) || courseLoad < 15 || courseLoad > 24) {
      showError("courseLoadInput", "Enter a whole number between 15 and 24 units (your handbook's registration range).");
      hasError = true;
    }
    if (!level) {
      showError("levelInput", "Select your current level.");
      hasError = true;
    }
    if (!semester) {
      showError("semesterInput", "Select your current semester.");
      hasError = true;
    }

    if (hasError) return;

    const submitBtn = document.getElementById("submitBtn");
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loader"></span>';

    const carryOverCourses = carryToggleYes.checked ? readCourseRows(carryContainer) : [];
    const failedCourses = readCourseRows(failedContainer);

    try {
      const data = await apiFetch("/generate-advice", {
        method: "POST",
        body: { gpa, courseLoad, level, semester, isFinalLevel, carryOverCourses, failedCourses },
      });

      const record = {
        id: data.recordId,
        gpa,
        courseLoad,
        level,
        semester,
        isFinalLevel,
        carryOverCourses,
        failedCourses,
        advice: data.advice,
        createdAt: new Date().toISOString(),
      };
      sessionStorage.setItem("aas_last_result", JSON.stringify(record));
      window.location.href = "results.html";
    } catch (err) {
      showError("gpaInput", ""); // clear any stale field errors
      document.querySelectorAll(".field.invalid").forEach((f) => f.classList.remove("invalid"));
      const banner = document.getElementById("formBanner") || createFormBanner(form);
      banner.textContent = err.message;
      banner.classList.add("show");
      submitBtn.disabled = false;
      submitBtn.textContent = "Get my advice";
    }
  });
});

function createFormBanner(form) {
  const banner = el("div", { id: "formBanner", class: "alert alert-error" });
  form.prepend(banner);
  return banner;
}
