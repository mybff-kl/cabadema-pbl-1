/* =====================================================
   UNLTD 199 - Admin Portal
   Manage staff accounts + register new accounts.
   Front-end prototype: data lives in localStorage.
   (Passwords are NOT stored here; hash them on the real backend.)
   ===================================================== */
(function () {
  "use strict";
  // Refreshing the page resets the demo data (the login session is kept).
  try {
    var navEntry = performance.getEntriesByType("navigation")[0];
    if (navEntry && navEntry.type === "reload") { ["unltdStaffAccounts"].forEach(function (k) { localStorage.removeItem(k); }); }
  } catch (e) { /* ignore */ }


  var STORAGE_KEY = "unltdStaffAccounts";
  var ROLES = ["Front Desk", "Waiter", "Cashier", "Inventory Staff", "Owner"];

  var SEED = [
    { id: 1, name: "Alyssa Lewis",      mobile: "09994567813", email: "alyssa.ls@gmail.com",   role: "Front Desk",      username: "alyssa.lewis",      birthday: "1998-03-14", address: "1234 Taft Ave, Malate, Manila" },
    { id: 2, name: "Amellia King",      mobile: "09991237818", email: "am.king@gmail.com",     role: "Front Desk",      username: "amellia.king",      birthday: "1996-07-22", address: "56 Quezon Blvd, Quiapo, Manila" },
    { id: 3, name: "Ben Scott",         mobile: "09994594117", email: "ben.scott@gmail.com",   role: "Waiter",          username: "ben.scott",         birthday: "1999-11-05", address: "78 Recto Ave, Sampaloc, Manila" },
    { id: 4, name: "Emily Anderson",    mobile: "09999787811", email: "emily.as@gmail.com",    role: "Waiter",          username: "emily.anderson",    birthday: "2001-01-30", address: "210 Roxas Blvd, Ermita, Manila" },
    { id: 5, name: "Michael Rodriguez", mobile: "09994567369", email: "michael.rd@gmail.com",  role: "Cashier",         username: "michael.rodriguez", birthday: "1994-09-18", address: "45 Dapitan St, Sampaloc, Manila" },
    { id: 6, name: "Noah Martinez",     mobile: "09994510612", email: "noah.mez@gmail.com",    role: "Inventory Staff", username: "noah.martinez",     birthday: "1997-05-09", address: "9 Pedro Gil St, Paco, Manila" },
    { id: 7, name: "Royce Nelson",      mobile: "09994567744", email: "royce.neln@gmail.com",  role: "Inventory Staff", username: "royce.nelson",      birthday: "2000-12-02", address: "132 Juan Luna St, Binondo, Manila" },
    { id: 8, name: "Carylle Doe",       mobile: "09994523678", email: "carylle.d@gmail.com",   role: "Owner",           username: "carylle.doe",       birthday: "1995-04-27", address: "88 Escolta St, Santa Cruz, Manila" }
  ];
  var MIN_AGE = 18, MAX_AGE = 80;

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function slug(role) { return role.toLowerCase().replace(/\s+/g, "-"); }
  var MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
    if (!m) { return null; }
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : null;
  }
  function ageOf(s) {
    var b = parseDate(s);
    if (!b) { return null; }
    var t = new Date(), age = t.getFullYear() - b.getFullYear();
    if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) { age--; }
    return age;
  }
  function fmtBirthday(s) {
    var b = parseDate(s);
    return b ? MONTH_NAMES[b.getMonth()] + " " + b.getDate() + ", " + b.getFullYear() : "-";
  }
  function fmtStamp(iso) {
    var d = new Date(iso), h = d.getHours();
    return MONTH_NAMES[d.getMonth()].slice(0, 3) + " " + d.getDate() + ", " + d.getFullYear() + " " + (h % 12 || 12) + ":" + String(d.getMinutes()).padStart(2, "0") + " " + (h >= 12 ? "PM" : "AM");
  }
  function dateKey(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function icon(name) { return '<svg class="icon"><use href="#icon-' + name + '"></use></svg>'; }

  /* ---------- storage ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        // older saved demo data: fill in birthday / address from the demo list
        data.forEach(function (s) {
          var d = SEED.filter(function (x) { return x.id === s.id && x.username === s.username; })[0];
          if (d) { if (!s.birthday) { s.birthday = d.birthday; } if (!s.address) { s.address = d.address; } }
        });
        return data;
      }
    } catch (e) { /* ignore */ }
    return SEED.slice();
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(staff)); } catch (e) { /* ignore */ }
  }

  var staff = load();
  var editingId = null;
  var removingId = null;
  var pendingAccount = null;
  var pwTargetId = null;
  var pendingPw = null;

  /* ---------- clock ---------- */
  function tickClock() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, "0"); };
    var h = d.getHours();
    var ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12; // 12-hour clock: 0 -> 12, 13 -> 1
    $("topbar-clock").textContent = h + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds()) + " " + ampm;
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ---------- toasts ---------- */
  var TOAST_ICONS = { success: "check", warning: "alert", danger: "alert", info: "info" };
  function toast(message, type) {
    type = type || "info";
    var el = document.createElement("div");
    el.className = "toast toast--" + type;
    el.innerHTML =
      '<span class="toast-icon">' + icon(TOAST_ICONS[type] || "info") + "</span>" +
      '<span class="toast-text">' + esc(message) + "</span>" +
      '<button type="button" class="toast-close" aria-label="Dismiss">' + icon("close") + "</button>";
    $("toast-stack").appendChild(el);
    function dismiss() {
      el.classList.add("toast--leaving");
      setTimeout(function () { el.remove(); }, 200);
    }
    el.querySelector(".toast-close").addEventListener("click", dismiss);
    setTimeout(dismiss, 3500);
  }

  /* ---------- drawer ---------- */
  var drawer = $("drawer");
  var drawerOverlay = $("drawer-overlay");
  function openDrawer() {
    drawer.classList.add("drawer--open");
    drawer.setAttribute("aria-hidden", "false");
    drawerOverlay.hidden = false;
  }
  function closeDrawer() {
    drawer.classList.remove("drawer--open");
    drawer.setAttribute("aria-hidden", "true");
    drawerOverlay.hidden = true;
  }
  $("menu-button").addEventListener("click", openDrawer);
  $("drawer-close-button").addEventListener("click", closeDrawer);
  drawerOverlay.addEventListener("click", closeDrawer);

  /* ---------- views ---------- */
  function showView(name) {
    $("view-staff").hidden = name !== "staff";
    $("view-register").hidden = name !== "register";
    document.querySelectorAll(".drawer-item[data-view]").forEach(function (b) {
      b.classList.toggle("drawer-item--active", b.getAttribute("data-view") === name);
    });
    closeDrawer();
    window.scrollTo(0, 0);
  }
  window.showView = showView;

  document.querySelectorAll(".drawer-item[data-view]").forEach(function (b) {
    b.addEventListener("click", function () { showView(b.getAttribute("data-view")); });
  });
  $("go-register").addEventListener("click", function () { showView("register"); });

  /* ---------- modals ---------- */
  var overlay = $("modal-overlay");
  function openModal(id) {
    overlay.querySelectorAll(".modal").forEach(function (m) { m.hidden = m.id !== id; });
    overlay.hidden = false;
  }
  function closeModal() {
    overlay.hidden = true;
    overlay.querySelectorAll(".modal").forEach(function (m) { m.hidden = true; });
    editingId = null;
    removingId = null;
    pendingAccount = null;
    pwTargetId = null;
    pendingPw = null;
    $("rc-password").textContent = "";
    $("pwc-otp").value = "";
    setOtpError("");
    ["pw-new", "pw-confirm", "pw-admin"].forEach(function (id) { $(id).value = ""; $(id).type = "password"; });
  }
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay || e.target.closest("[data-close]")) { closeModal(); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") { return; }
    if (!overlay.hidden) { closeModal(); } else { closeDrawer(); }
  });

  /* ---------- staff table ---------- */
  function currentFilter() { return $("role-filter").value; }

  function renderStaff() {
    var filter = currentFilter();
    var list = staff.filter(function (s) { return filter === "all" || s.role === filter; });
    var body = $("staff-body");

    if (!list.length) {
      body.innerHTML =
        '<tr class="table-empty"><td colspan="5"><div class="empty-state">' +
        '<span class="empty-icon">' + icon("users") + "</span>" +
        "<p>No staff accounts found" + (filter !== "all" ? " for " + esc(filter) : "") + ".</p></div></td></tr>";
    } else {
      body.innerHTML = list.map(function (s) {
        return (
          "<tr>" +
          '<td class="cell-name" data-label="Name">' + esc(s.name) + "</td>" +
          '<td data-label="Mobile Number">' + esc(s.mobile) + "</td>" +
          '<td class="cell-email" data-label="Email">' + esc(s.email) + "</td>" +
          '<td data-label="Role"><span class="role-badge role-badge--' + slug(s.role) + '">' + esc(s.role) + "</span></td>" +
          '<td class="cell-actions" data-label="Actions"><div class="row-actions">' +
            '<button type="button" class="action-btn action-btn--edit" data-action="edit" data-id="' + s.id + '" aria-label="Edit ' + esc(s.name) + '">' + icon("edit") + "</button>" +
            '<button type="button" class="action-btn action-btn--delete" data-action="delete" data-id="' + s.id + '" aria-label="Remove ' + esc(s.name) + '">' + icon("trash") + "</button>" +
          "</div></td>" +
          "</tr>"
        );
      }).join("");
    }

    var n = list.length;
    $("staff-count-pill").textContent = n + (n === 1 ? " account" : " accounts");
  }

  function findStaff(id) {
    id = Number(id);
    return staff.filter(function (s) { return s.id === id; })[0];
  }

  $("role-filter").addEventListener("change", renderStaff);

  $("staff-body").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-action]");
    if (!btn) { return; }
    var s = findStaff(btn.getAttribute("data-id"));
    if (!s) { return; }
    if (btn.getAttribute("data-action") === "edit") { openEdit(s); } else { openRemove(s); }
  });

  /* ---------- edit ---------- */
  function openEdit(s) {
    editingId = s.id;
    $("edit-name").textContent = s.name;
    var age = ageOf(s.birthday);
    $("edit-birthday").textContent = fmtBirthday(s.birthday);
    $("edit-age").textContent = age === null ? "-" : age + " years old";
    $("edit-address").textContent = s.address || "-";
    $("edit-pw-changed").textContent = s.passwordChangedAt ? "Changed " + fmtStamp(s.passwordChangedAt) : "Set at registration";
    $("edit-mobile").textContent = s.mobile;
    $("edit-email").textContent = s.email;
    $("edit-role").value = s.role;
    openModal("modal-edit");
  }

  $("edit-confirm").addEventListener("click", function () {
    var s = findStaff(editingId);
    if (!s) { closeModal(); return; }
    var newRole = $("edit-role").value;
    if (newRole === s.role) {
      closeModal();
      toast("No changes were made.", "info");
      return;
    }
    var old = s.role;
    s.role = newRole;
    save();
    renderStaff();
    closeModal();
    toast(s.name + " is now " + newRole + " (was " + old + ").", "success");
  });

  /* ---------- change password (admin only) ---------- */
  // The change is confirmed with a one-time code (OTP). Prototype: any code is accepted; verify it on the server later.
  // DEMO ONLY: the admin's own password is checked here so the verification step can be shown.
  // On the real backend, verify the admin's session and password on the server, and store only hashed passwords.
  var ADMIN_DEMO_PASSWORD = "A123";
  var MAX_AUTH_FAILS = 3, LOCK_MS = 30000;
  var authFails = 0, lockUntil = 0;
  var PW_FIELDS = ["newPassword", "confirmPassword", "adminPassword"];

  function setPwError(field, message) {
    var wrap = $("modal-password").querySelector('[data-field="' + field + '"]');
    wrap.classList.toggle("field--invalid", !!message);
    wrap.querySelector(".field-error").textContent = message || "";
  }

  $("edit-change-password").addEventListener("click", function () {
    var s = findStaff(editingId);
    if (!s) { return; }
    $("pw-name").textContent = s.name;
    $("pw-username").textContent = s.username || "-";
    $("pw-role").textContent = s.role;
    PW_FIELDS.forEach(function (f) { setPwError(f); });
    openModal("modal-password");
    pwTargetId = s.id; // set after openModal
    setTimeout(function () { try { $("pw-new").focus(); } catch (e) { /* ignore */ } }, 30);
  });

  $("modal-password").addEventListener("input", function (e) {
    var wrap = e.target.closest("[data-field]");
    if (wrap) { setPwError(wrap.getAttribute("data-field")); }
  });
  $("modal-password").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); $("pw-submit").click(); }
  });

  $("pw-submit").addEventListener("click", function () {
    var s = findStaff(pwTargetId);
    if (!s) { closeModal(); return; }
    var np = $("pw-new").value, cp = $("pw-confirm").value, ap = $("pw-admin").value;
    var ok = true;
    function fail(f, m) { setPwError(f, m); ok = false; }
    PW_FIELDS.forEach(function (f) { setPwError(f); });

    if (!passwordOk(np)) { fail("newPassword", "Use 8+ characters with uppercase, lowercase, a number and a special character."); }
    else if (s.username && np.toLowerCase().indexOf(s.username.toLowerCase()) !== -1) { fail("newPassword", "The password must not contain the username."); }
    if (!cp) { fail("confirmPassword", "Please re-enter the new password."); }
    else if (cp !== np) { fail("confirmPassword", "Passwords do not match."); }

    var now = Date.now();
    if (now < lockUntil) {
      fail("adminPassword", "Too many wrong attempts. Try again in " + Math.ceil((lockUntil - now) / 1000) + " seconds.");
    } else if (!ap) {
      fail("adminPassword", "Enter your admin password to continue.");
    } else if (ap !== ADMIN_DEMO_PASSWORD) {
      authFails++;
      if (authFails >= MAX_AUTH_FAILS) { authFails = 0; lockUntil = now + LOCK_MS; fail("adminPassword", "Too many wrong attempts. Locked for 30 seconds."); }
      else { fail("adminPassword", "Incorrect admin password."); }
    }
    if (!ok) { return; }
    authFails = 0;
    $("pwc-name").textContent = s.name;
    var id = s.id;
    openModal("modal-password-confirm");
    $("pwc-otp").value = ""; setOtpError("");
    setTimeout(function () { try { $("pwc-otp").focus(); } catch (e) { /* ignore */ } }, 30);
    pendingPw = { id: id }; // the new password is never kept after this step
    pwTargetId = id;
  });

  function setOtpError(msg) {
    var w = $("modal-password-confirm").querySelector('[data-field="otp"]');
    w.classList.toggle("field--invalid", !!msg);
    w.querySelector(".field-error").textContent = msg || "";
  }
  // OTP (prototype): digits only, up to 6. Any number is accepted until there is a real backend.
  $("pwc-otp").addEventListener("input", function () {
    var c = this.value.replace(/\D/g, "").slice(0, 6);
    if (c !== this.value) { this.value = c; }
    setOtpError("");
  });
  $("pwc-otp").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); $("pwc-yes").click(); } });

  $("pwc-back").addEventListener("click", function () {
    var id = pwTargetId;
    openModal("modal-password");
    pwTargetId = id;
    pendingPw = null;
    $("pwc-otp").value = ""; setOtpError("");
  });

  $("pwc-yes").addEventListener("click", function () {
    var s = pendingPw && findStaff(pendingPw.id);
    if (!s) { closeModal(); return; }
    var otp = $("pwc-otp").value;
    if (!/^\d{1,6}$/.test(otp)) { setOtpError("Enter the verification code (numbers only, up to 6 digits)."); return; }
    s.passwordChangedAt = new Date().toISOString();
    save();
    closeModal(); // also wipes the password fields
    toast("Password changed for " + s.name + ".", "success");
  });

  $("modal-password").addEventListener("click", function (e) {
    var b = e.target.closest(".password-toggle[data-target]");
    if (!b) { return; }
    var input = $(b.getAttribute("data-target"));
    var show = input.type === "password";
    input.type = show ? "text" : "password";
    b.querySelector("use").setAttribute("href", show ? "#icon-eye-off" : "#icon-eye");
    b.setAttribute("aria-label", show ? "Hide password" : "Show password");
  });

  /* ---------- remove ---------- */
  function openRemove(s) {
    removingId = s.id;
    $("remove-name").textContent = s.name + ".";
    $("remove-info-name").textContent = s.name;
    $("remove-info-mobile").textContent = s.mobile;
    $("remove-info-email").textContent = s.email;
    $("remove-info-role").textContent = s.role;
    openModal("modal-remove");
  }

  $("remove-yes").addEventListener("click", function () {
    var s = findStaff(removingId);
    if (!s) { closeModal(); return; }
    staff = staff.filter(function (x) { return x.id !== s.id; });
    save();
    renderStaff();
    closeModal();
    toast("Account for " + s.name + " has been removed.", "danger");
  });

  /* ---------- register ---------- */
  var form = $("register-form");

  function setError(field, message) {
    var wrap = form.querySelector('[data-field="' + field + '"]');
    wrap.classList.toggle("field--invalid", !!message);
    wrap.querySelector(".field-error").textContent = message || "";
  }

  var FIELDS = ["firstName", "middleName", "lastName", "birthday", "age", "address", "role", "username", "password", "email", "mobile"];

  // Password rules (edit here to change them)
  var PASSWORD_RULES = [
    { id: "length",  test: function (p) { return p.length >= 8; } },
    { id: "upper",   test: function (p) { return /[A-Z]/.test(p); } },
    { id: "lower",   test: function (p) { return /[a-z]/.test(p); } },
    { id: "number",  test: function (p) { return /\d/.test(p); } },
    { id: "special", test: function (p) { return /[^A-Za-z0-9\s]/.test(p); } }
  ];

  function passwordOk(p) {
    return PASSWORD_RULES.every(function (r) { return r.test(p); });
  }

  var NAME_RE = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .'\-]*$/;
  function cleanName(s) { return s.replace(/\s+/g, " ").trim(); }

  function validate() {
    var v = {
      firstName: cleanName($("reg-first").value),
      middleName: cleanName($("reg-middle").value),
      lastName: cleanName($("reg-last").value),
      birthday: $("reg-birthday").value,
      address: $("reg-address").value.replace(/\s+/g, " ").trim(),
      role: $("reg-role").value,
      username: $("reg-username").value.trim().toLowerCase(),
      password: $("reg-password").value,
      email: $("reg-email").value.trim(),
      mobile: $("reg-mobile").value.trim()
    };
    v.name = [v.firstName, v.middleName, v.lastName].filter(Boolean).join(" ");

    var ok = true;
    function fail(field, msg) { setError(field, msg); ok = false; }
    FIELDS.forEach(function (f) { setError(f); });

    if (v.firstName.length < 2 || !NAME_RE.test(v.firstName)) { fail("firstName", "Enter a valid first name."); }
    if (v.middleName && !NAME_RE.test(v.middleName)) { fail("middleName", "Letters only, please."); }
    if (v.lastName.length < 2 || !NAME_RE.test(v.lastName)) { fail("lastName", "Enter a valid last name."); }
    var age = ageOf(v.birthday);
    v.age = age;
    if (!v.birthday || age === null) { fail("birthday", "Please enter a valid birthday."); }
    else if (parseDate(v.birthday) > new Date()) { fail("birthday", "Birthday cannot be in the future."); }
    else if (age < MIN_AGE) { fail("birthday", "Staff must be at least " + MIN_AGE + " years old."); }
    else if (age > MAX_AGE) { fail("birthday", "Please check the birthday entered."); }
    if (v.address.length < 10) { fail("address", "Enter a complete address (street, barangay, city)."); }
    if (!v.role) { fail("role", "Please select a role."); }

    if (!/^[a-z0-9._-]{4,30}$/.test(v.username)) {
      fail("username", "4-30 characters: letters, numbers, . _ -");
    } else if (staff.some(function (s) { return (s.username || "").toLowerCase() === v.username; })) {
      fail("username", "That username is already taken.");
    }

    if (!passwordOk(v.password)) { fail("password", "Use 8+ characters with uppercase, lowercase, a number and a special character."); }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) {
      fail("email", "Enter a valid email address.");
    } else if (staff.some(function (s) { return s.email.toLowerCase() === v.email.toLowerCase(); })) {
      fail("email", "This email is already registered.");
    }

    if (!/^09\d{9}$/.test(v.mobile)) {
      fail("mobile", "Use an 11-digit number starting with 09.");
    } else if (staff.some(function (s) { return s.mobile === v.mobile; })) {
      fail("mobile", "This mobile number is already registered.");
    }

    return ok ? v : null;
  }

  var rcShowPassword = false;
  function renderRcPassword(p) {
    var pw = p === undefined ? (pendingAccount && pendingAccount.password) : p;
    $("rc-password").textContent = rcShowPassword ? (pw || "") : "\u2022".repeat(Math.max(8, (pw || "").length));
    $("rc-password-icon").setAttribute("href", rcShowPassword ? "#icon-eye-off" : "#icon-eye");
    $("rc-password-toggle").setAttribute("aria-label", rcShowPassword ? "Hide password" : "Show password");
  }
  $("rc-password-toggle").addEventListener("click", function () { rcShowPassword = !rcShowPassword; renderRcPassword(); });

  // Step 1: "Register Account" validates, then asks for confirmation
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = validate();
    if (!v) {
      toast("Please fix the highlighted fields.", "warning");
      return;
    }
    $("rc-name").textContent = v.name;
    $("rc-birthday").textContent = fmtBirthday(v.birthday);
    $("rc-age").textContent = v.age + " years old";
    $("rc-address").textContent = v.address;
    $("rc-username").textContent = v.username;
    rcShowPassword = false;
    renderRcPassword(v.password);
    $("rc-role").textContent = v.role;
    $("rc-email").textContent = v.email;
    $("rc-mobile").textContent = v.mobile;
    openModal("modal-register-confirm");
    pendingAccount = v; // set after openModal so it survives
  });

  // Step 2: Confirm creates the account
  $("register-confirm-yes").addEventListener("click", function () {
    var v = pendingAccount;
    if (!v) { closeModal(); return; }
    var nextId = staff.reduce(function (m, s) { return Math.max(m, s.id); }, 0) + 1;
    staff.push({
      id: nextId, name: v.name,
      firstName: v.firstName, middleName: v.middleName, lastName: v.lastName,
      mobile: v.mobile, email: v.email, role: v.role, username: v.username,
      birthday: v.birthday, address: v.address,
      passwordChangedAt: new Date().toISOString()
    });
    save();
    resetForm();
    $("role-filter").value = "all";
    renderStaff();
    closeModal();
    showView("staff");
    toast("Account created for " + v.name + " (" + v.role + ").", "success");
  });

  function resetForm() {
    form.reset();
    updateAge();
    FIELDS.forEach(function (f) { setError(f); });
    $("reg-password").type = "password";
    $("password-toggle-icon").setAttribute("href", "#icon-eye");
  }

  $("register-cancel").addEventListener("click", function () {
    resetForm();
    showView("staff");
  });

  // clear a field's error as soon as the admin edits it
  form.addEventListener("input", function (e) {
    var wrap = e.target.closest("[data-field]");
    if (wrap) { setError(wrap.getAttribute("data-field")); }
  });

  // birthday: limit to valid range and show the age automatically
  (function () {
    var t = new Date();
    $("reg-birthday").max = dateKey(new Date(t.getFullYear() - MIN_AGE, t.getMonth(), t.getDate()));
    $("reg-birthday").min = dateKey(new Date(t.getFullYear() - MAX_AGE, 0, 1));
  })();
  function updateAge() {
    var a = ageOf($("reg-birthday").value);
    $("reg-age").value = a === null || a < 0 ? "" : String(a);
  }
  $("reg-birthday").addEventListener("input", updateAge);
  $("reg-birthday").addEventListener("change", updateAge);

  // mobile: digits only
  $("reg-mobile").addEventListener("input", function (e) {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 11);
  });

  // show / hide password
  $("password-toggle").addEventListener("click", function () {
    var input = $("reg-password");
    var show = input.type === "password";
    input.type = show ? "text" : "password";
    $("password-toggle-icon").setAttribute("href", show ? "#icon-eye-off" : "#icon-eye");
    this.setAttribute("aria-label", show ? "Hide password" : "Show password");
  });

  /* ---------- log out ---------- */
  $("logout-button").addEventListener("click", function () {
    closeDrawer();
    openModal("modal-logout");
  });
  $("logout-yes").addEventListener("click", function () {
    try { sessionStorage.removeItem("adminLoggedIn"); } catch (e) { /* ignore */ }
    // reset demo data: next login starts again from the SEED list
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    window.location.replace("login.html");
  });

  /* ---------- init ---------- */
  renderStaff();
})();