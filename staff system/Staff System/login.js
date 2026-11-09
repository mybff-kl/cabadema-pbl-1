/* =====================================================
   UNLTD 199 - Unified Staff Login Script
   ================================================     */
if (typeof byId === "undefined") {
  var byId = function (id) { return document.getElementById(id); };
}
if (typeof saveSessionValue === "undefined") {
  var saveSessionValue = function (key, value) {
    try { sessionStorage.setItem(key, String(value)); } catch (error) {}
  };
}
if (typeof loadSessionValue === "undefined") {
  var loadSessionValue = function (key, fallback) {
    try { var value = sessionStorage.getItem(key); return value === null ? fallback : value; }
    catch (error) { return fallback; }
  };
}
if (typeof goTo === "undefined") {
  var goTo = function (path) { window.location.href = path; };
}

var USERS_DB = {
  "front desk": {
    pass: "FD123",
    nextPage: "frontdesk.html",
    sessionKey: "fdLoggedIn"
  },
  "waiter": {
    pass: "W123",
    nextPage: "waiter.html",
    sessionKey: "waiterLoggedIn"
  },
  "owner": {
    pass: "O123",
    nextPage: "owner.html",
    sessionKey: "OwnerLoggedIn"
  },
  "cashier": {
    pass: "C123",
    nextPage: "cashier.html",
    sessionKey: "cashierLoggedIn"
  },
  "admin": {
    pass: "A123",
    nextPage: "admin.html",
    sessionKey: "adminLoggedIn"
  },
  "inventory staff": {
    pass: "IS123",
    nextPage: "inventory.html",
    sessionKey: "inventoryLoggedIn"
  }
  

};

function setUpPasswordToggle() {
  var passwordInput = byId("password-input");
  var toggleButton = byId("toggle-password-button");

  if (!passwordInput || !toggleButton) return;

  passwordInput.addEventListener("input", function () {
    if (passwordInput.value.length > 0) {
      toggleButton.style.display = "flex";
    } else {
      toggleButton.style.display = "none";
      passwordInput.type = "password";
      toggleButton.setAttribute("aria-pressed", "false");
      toggleButton.setAttribute("aria-label", "Show password");
      toggleButton.textContent = "";
    }
  });

  toggleButton.addEventListener("click", function () {
    var isHidden = passwordInput.type === "password";

    passwordInput.type = isHidden ? "text" : "password";
    toggleButton.setAttribute("aria-pressed", String(isHidden));
    toggleButton.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
    toggleButton.textContent = "";

    passwordInput.focus();
  });
}

function setFieldError(fieldName, message) {
  var errorText = byId(fieldName + "-error");
  var wrap = byId(fieldName + "-wrap");

  if (errorText) {
    errorText.textContent = message || "";
    errorText.hidden = !message;
  }
  if (wrap) {
    wrap.classList.toggle("input-wrap--error", Boolean(message));
  }
}

function setLoginError(message) {
  var errText = byId("login-error-text");
  var errBox = byId("login-error");
  if (errText) errText.textContent = message || "";
  if (errBox) errBox.hidden = !message;
}

function clearAllErrors() {
  setFieldError("username", "");
  setFieldError("password", "");
  setLoginError("");
}

function handleLogin(event) {
  event.preventDefault();
  clearAllErrors();

  var username = byId("username-input").value.trim().toLowerCase();
  var password = byId("password-input").value;

  var hasError = false;
  if (username === "") {
    setFieldError("username", "Please enter your username.");
    hasError = true;
  }
  if (password === "") {
    setFieldError("password", "Please enter your password.");
    hasError = true;
  }
  if (hasError) {
    (username === "" ? byId("username-input") : byId("password-input")).focus();
    return;
  }

  var matchedUser = null;
  if (USERS_DB.hasOwnProperty(username) && USERS_DB[username].pass === password) {
    matchedUser = USERS_DB[username];
  }

  if (!matchedUser) {
    setLoginError("Incorrect username or password. Please try again.");
    byId("password-input").value = "";
    byId("password-input").focus();
    return;
  }

  saveSessionValue(matchedUser.sessionKey, "yes");
  goTo(matchedUser.nextPage);
}

// Forgot Password Modal Handlers
function openForgotPopup() {
  var overlay = byId("forgot-overlay");
  var okBtn = byId("forgot-ok-button");
  if (overlay) overlay.hidden = false;
  if (okBtn) okBtn.focus();
}

function closeForgotPopup() {
  var overlay = byId("forgot-overlay");
  var forgotBtn = byId("forgot-button");
  if (overlay) overlay.hidden = true;
  if (forgotBtn) forgotBtn.focus();
}

document.addEventListener("DOMContentLoaded", function () {
  if (loadSessionValue("fdLoggedIn", "") === "yes") { goTo("frontdesk.html"); return; }
  if (loadSessionValue("waiterLoggedIn", "") === "yes") { goTo("waiter.html"); return; }
  if (loadSessionValue("OwnerLoggedIn", "") === "yes") { goTo("owner.html"); return; }
  if (loadSessionValue("cashierLoggedIn", "") === "yes") { goTo("cashier.html"); return; }
  if (loadSessionValue("adminLoggedIn", "") === "yes") { goTo("admin.html"); return; }
  if (loadSessionValue("inventoryLoggedIn", "") === "yes") { goTo("inventory.html"); return; }

  setUpPasswordToggle();
  
  var loginForm = byId("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  var userInput = byId("username-input");
  var passInput = byId("password-input");

  if (userInput) {
    userInput.addEventListener("input", function () { setFieldError("username", ""); setLoginError(""); });
  }
  if (passInput) {
    passInput.addEventListener("input", function () { setFieldError("password", ""); setLoginError(""); });
  }

  // Forgot Password Elements Binding
  var forgotBtn = byId("forgot-button");
  var forgotOkBtn = byId("forgot-ok-button");
  var forgotOverlay = byId("forgot-overlay");

  if (forgotBtn) {
    forgotBtn.addEventListener("click", openForgotPopup);
  }
  if (forgotOkBtn) {
    forgotOkBtn.addEventListener("click", closeForgotPopup);
  }
  if (forgotOverlay) {
    forgotOverlay.addEventListener("click", function (event) {
      if (event.target === forgotOverlay) closeForgotPopup();
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && forgotOverlay && !forgotOverlay.hidden) {
      closeForgotPopup();
    }
  });
});