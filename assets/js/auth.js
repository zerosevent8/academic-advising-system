/* =========================================================
   auth.js — Sign Up / Sign In, wired to the real backend
   Calls POST /api/auth/signup and POST /api/auth/signin
   (see backend/routes/auth.js), stores the returned JWT for
   subsequent authenticated requests.
   ========================================================= */

function showAlert(box, message, type) {
  box.textContent = message;
  box.className = "alert " + (type === "info" ? "alert-success" : "alert-error") + " show";
}

function setFormBusy(form, busy) {
  const btn = form.querySelector("button[type=submit]");
  if (!btn) return;
  btn.disabled = busy;
  if (busy) {
    btn.dataset.originalText = btn.textContent;
    btn.innerHTML = '<span class="loader"></span>';
  } else if (btn.dataset.originalText) {
    btn.textContent = btn.dataset.originalText;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const alertBox = document.getElementById("authAlert");
      alertBox.className = "alert alert-error";

      const firstName = document.getElementById("firstName").value.trim();
      const lastName = document.getElementById("lastName").value.trim();
      const email = document.getElementById("email").value.trim().toLowerCase();
      const matric = document.getElementById("matric").value.trim();
      const password = document.getElementById("password").value;

      if (!firstName || !lastName || !email || !password) {
        showAlert(alertBox, "Please fill in every field to create your account.");
        return;
      }
      if (password.length < 6) {
        showAlert(alertBox, "Your password should be at least 6 characters.");
        return;
      }

      setFormBusy(signupForm, true);

      // Show waking-up message after 4s if still waiting
      const wakeTimer = setTimeout(() => {
        if (signupForm.querySelector("button[type=submit]").disabled) {
          showAlert(alertBox, "Waking up the server — this can take up to 60 seconds on first use. Please wait\u2026", "info");
        }
      }, 4000);

      try {
        const data = await apiFetch("/auth/signup", {
          method: "POST",
          auth: false,
          body: { firstName, lastName, email, matric, password },
        });
        clearTimeout(wakeTimer);
        setToken(data.token);
        setSession({ id: data.student.id, firstName: data.student.firstName, email: data.student.email });
        window.location.href = "advisor.html";
      } catch (err) {
        clearTimeout(wakeTimer);
        showAlert(alertBox, err.message);
        setFormBusy(signupForm, false);
      }
    });
  }

  const signinForm = document.getElementById("signinForm");
  if (signinForm) {
    signinForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const alertBox = document.getElementById("authAlert");
      alertBox.className = "alert alert-error";

      const email = document.getElementById("email").value.trim().toLowerCase();
      const password = document.getElementById("password").value;

      setFormBusy(signinForm, true);

      const wakeTimer = setTimeout(() => {
        if (signinForm.querySelector("button[type=submit]").disabled) {
          showAlert(alertBox, "Waking up the server — this can take up to 60 seconds on first use. Please wait\u2026", "info");
        }
      }, 4000);

      try {
        const data = await apiFetch("/auth/signin", {
          method: "POST",
          auth: false,
          body: { email, password },
        });
        clearTimeout(wakeTimer);
        setToken(data.token);
        setSession({ id: data.student.id, firstName: data.student.firstName, email: data.student.email });
        window.location.href = "advisor.html";
      } catch (err) {
        clearTimeout(wakeTimer);
        showAlert(alertBox, err.message);
        setFormBusy(signinForm, false);
      }
    });
  }
});
