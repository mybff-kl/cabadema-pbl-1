/* =====================================================
   UNLTD 199 - Inventory Staff Portal
   View inventory levels (search / filter / low-stock alerts)
   and update inventory (add items, adjust stock with a reason).
   Front-end prototype: data lives in localStorage.
   ===================================================== */
(function () {
  "use strict";
  // Refreshing the page resets the demo data (the login session is kept).
  try {
    var navEntry = performance.getEntriesByType("navigation")[0];
    if (navEntry && navEntry.type === "reload") { ["unltdInventoryItems", "unltdInventoryLog"].forEach(function (k) { localStorage.removeItem(k); }); }
  } catch (e) { /* ignore */ }


  var ITEMS_KEY = "unltdInventoryItems";
  var LOG_KEY = "unltdInventoryLog";
  var SESSION_KEY = "inventoryLoggedIn"; // must match sessionKey in login.js
  var LOG_LIMIT = 200;

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function icon(name) { return '<svg class="icon"><use href="#icon-' + name + '"></use></svg>'; }
  function fmt(n) { return Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 }); }
  function round2(n) { return Math.round(n * 100) / 100; }
  function cleanText(s) { return String(s).replace(/\s+/g, " ").trim(); }
  function ago(hours) { return new Date(Date.now() - hours * 3600000).toISOString(); }
  var LOW_PCT = 0.25; // low stock = 25% or less of the full (original) stock level
  function recalc(item) { item.min = round2(item.full * LOW_PCT); return item; }
  function pad2(n) { return String(n).padStart(2, "0"); }
  function ymd(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function todayYmd() { return ymd(new Date()); }
  function addDaysYmd(n) { var d = new Date(); d.setDate(d.getDate() + n); return ymd(d); }
  function daysUntil(s) {
    var p = s.split("-"); var t = new Date(+p[0], +p[1] - 1, +p[2]); var n = new Date(); n.setHours(0, 0, 0, 0);
    return Math.round((t - n) / 86400000);
  }
  function expiryStr(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  function dateStr(iso) { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  function timeStr(iso) { return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }

  /* ---------- demo data ---------- */
  // [name, category, unit, qty, full (original) stock, expires in N days (null = none), updated (hours ago), log reason, log change]
  var SEED_ROWS = [
    ["Pork Belly",           "Meat",                "kg",      42, 60,    4,   3, "Delivery received",  20],
    ["Pork Jowl",            "Meat",                "kg",      18, 30,    3,  26],
    ["Beef Short Rib",       "Meat",                "kg",       8, 40,    5,   5, "Used in kitchen",    -6],
    ["Marinated Chicken",    "Meat",                "kg",      22, 35,    3,  30],
    ["Shrimp",               "Seafood",             "kg",       5, 25,    2,   8, "Spoiled / expired",  -3],
    ["Lettuce",              "Vegetables",          "kg",      12, 20,    4,   2, "Delivery received",  10],
    ["Perilla Leaves",       "Vegetables",          "packs",    6, 40,   -1,   6, "Used in kitchen",    -4],
    ["Kimchi",               "Side Dishes",         "kg",      15, 25,   30,  50],
    ["Rice (Raw)",           "Rice & Noodles",      "sacks",    6, 10,  180,  72],
    ["Ssamjang",             "Sauces & Condiments", "tubs",     9, 15,   90,  96],
    ["Sesame Oil",           "Sauces & Condiments", "bottles",  0, 12,  120,   4, "Used in kitchen",    -2],
    ["Soda (Assorted)",      "Beverages",           "cases",    7, 12,  150,  27],
    ["Soju",                 "Beverages",           "bottles", 48, 72,  365,  48],
    ["Butane Gas Canisters", "Supplies",            "cans",    36, 60, null,   1, "Delivery received",  24],
    ["Paper Napkins",        "Supplies",            "packs",    3, 20, null, 120]
  ];

  function seed() {
    var items = [];
    var log = [];
    SEED_ROWS.forEach(function (r, i) {
      var item = recalc({ id: i + 1, name: r[0], category: r[1], unit: r[2], qty: r[3], full: r[4], expiry: r[5] === null ? "" : addDaysYmd(r[5]), updatedAt: ago(r[6]) });
      items.push(item);
      if (r[7]) {
        log.push({
          id: 0, itemId: item.id, itemName: item.name, unit: item.unit,
          type: r[8] > 0 ? "in" : "out", change: r[8], newQty: item.qty,
          reason: r[7], note: "", at: item.updatedAt
        });
      }
    });
    log.sort(function (a, b) { return new Date(b.at) - new Date(a.at); });
    log.forEach(function (l, i) { l.id = log.length - i; });
    return { items: items, log: log };
  }

  /* ---------- storage ---------- */
  function load() {
    try {
      var items = JSON.parse(localStorage.getItem(ITEMS_KEY));
      var log = JSON.parse(localStorage.getItem(LOG_KEY));
      if (Array.isArray(items) && Array.isArray(log)) {
        items.forEach(function (i) {
          if (!(i.full > 0)) { i.full = Math.max(i.qty, (i.min || 0) * 4, 1); }
          if (typeof i.expiry !== "string") { i.expiry = ""; }
          recalc(i);
        });
        return { items: items, log: log };
      }
    } catch (e) { /* ignore */ }
    return seed();
  }
  function saveAll() {
    try {
      localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
      localStorage.setItem(LOG_KEY, JSON.stringify(log));
    } catch (e) { /* ignore */ }
  }

  var data = load();
  var items = data.items;
  var log = data.log;

  var currentView = "inventory";
  var adjId = null;
  var delId = null;
  var adjType = "in";
  var pendingItem = null;

  /* ---------- stock status ---------- */
  var STATUS_META = {
    "in":  { label: "In Stock",     badge: "available", bar: "" },
    "low": { label: "Low Stock",    badge: "warning",   bar: "stock-bar--low" },
    "out": { label: "Out of Stock", badge: "expired",   bar: "stock-bar--out" }
  };
  var STATUS_ORDER = { out: 0, low: 1, "in": 2 };

  function statusFor(qty, min) {
    if (qty <= 0) { return "out"; }
    if (qty <= min) { return "low"; }
    return "in";
  }
  function statusOf(item) { return statusFor(item.qty, item.min); }
  function findItem(id) {
    id = Number(id);
    return items.filter(function (i) { return i.id === id; })[0];
  }

  /* ---------- clock (12-hour) ---------- */
  function tickClock() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, "0"); };
    var h = d.getHours();
    var ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
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
    setTimeout(dismiss, type === "success" ? 3500 : 5000);
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
    currentView = name;
    $("view-inventory").hidden = name !== "inventory";
    $("view-add").hidden = name !== "add";
    if (name === "add" && typeof populateMenuItems === "function") { populateMenuItems(); }
    $("view-history").hidden = name !== "history";
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
  $("go-add").addEventListener("click", function () { showView("add"); });

  /* ---------- modals ---------- */
  var overlay = $("modal-overlay");
  function openModal(id) {
    overlay.querySelectorAll(".modal").forEach(function (m) { m.hidden = m.id !== id; });
    overlay.hidden = false;
  }
  function closeModal() {
    overlay.hidden = true;
    overlay.querySelectorAll(".modal").forEach(function (m) { m.hidden = true; });
    adjId = null;
    delId = null;
    delPending = null;
    pendingItem = null;
  }
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay || e.target.closest("[data-close]")) { closeModal(); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") { return; }
    if (!overlay.hidden) { closeModal(); } else { closeDrawer(); }
  });

  /* ---------- form helpers ---------- */
  function setError(field, message) {
    var wrap = document.querySelector('[data-field="' + field + '"]');
    wrap.classList.toggle("field--invalid", !!message);
    wrap.querySelector(".field-error").textContent = message || "";
  }

  // numbers only: digits and one dot, max 2 decimals (so a minus sign can never be typed)
  function bindNumeric(el) {
    el.addEventListener("input", function () {
      var v = el.value.replace(/[^\d.]/g, "");
      var dot = v.indexOf(".");
      if (dot !== -1) { v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, "").slice(0, 2); }
      if (v !== el.value) { el.value = v; }
    });
  }
  function parseQty(str) {
    var v = String(str).trim();
    if (v === "" || v === ".") { return NaN; }
    return round2(parseFloat(v));
  }
  ["add-qty", "adj-qty"].forEach(function (id) { bindNumeric($(id)); });

  /* ---------- inventory table ---------- */
  function renderStats() {
    var c = { "in": 0, low: 0, out: 0 };
    items.forEach(function (i) { c[statusOf(i)]++; });
    $("stat-total").textContent = items.length;
    $("stat-in").textContent = c["in"];
    $("stat-low").textContent = c.low;
    $("stat-out").textContent = c.out;
  }

  function filteredItems() {
    var q = cleanText($("inv-search").value).toLowerCase();
    var cat = $("inv-category").value;
    var st = $("inv-status").value;
    return items.filter(function (i) {
      var s = statusOf(i);
      if (cat !== "all" && i.category !== cat) { return false; }
      if (st === "restock" ? s === "in" : (st !== "all" && s !== st)) { return false; }
      if (q && (i.name + " " + i.category).toLowerCase().indexOf(q) === -1) { return false; }
      return true;
    }).sort(function (a, b) {
      return STATUS_ORDER[statusOf(a)] - STATUS_ORDER[statusOf(b)] || a.name.localeCompare(b.name);
    });
  }

  function stockPercent(i) {
    return Math.max(0, Math.min(100, (i.qty / i.full) * 100));
  }

  function expiryCell(i) {
    if (!i.expiry) { return '<span class="cell-note cell-note--inline">No expiry</span>'; }
    var d = daysUntil(i.expiry), tag;
    if (d < 0) { tag = '<span class="status-badge status-badge--expired expiry-tag">Expired</span>'; }
    else if (d <= 7) { tag = '<span class="status-badge status-badge--warning expiry-tag">' + (d === 0 ? "Expires today" : "Expires in " + d + (d === 1 ? " day" : " days")) + "</span>"; }
    else { tag = ""; }
    return '<span class="cell-date">' + expiryStr(i.expiry) + "</span>" + tag;
  }

  function renderTable() {
    var list = filteredItems();
    var body = $("inv-body");
    var activeFilter = $("inv-status").value;

    document.querySelectorAll(".stat-card--filter").forEach(function (c) {
      c.classList.toggle("is-active", c.getAttribute("data-filter") === activeFilter);
    });

    if (!list.length) {
      body.innerHTML =
        '<tr class="table-empty"><td colspan="7"><div class="empty-state">' +
        '<span class="empty-icon">' + icon("box") + "</span>" +
        "<p>No inventory items match your search or filters.</p></div></td></tr>";
    } else {
      body.innerHTML = list.map(function (i) {
        var s = statusOf(i);
        var meta = STATUS_META[s];
        return (
          "<tr>" +
          '<td class="cell-name" data-label="Item">' + esc(i.name) + "</td>" +
          '<td data-label="Category"><span class="chip">' + esc(i.category) + "</span></td>" +
          '<td data-label="Current Stock"><div class="stock-cell">' +
            '<span class="stock-qty">' + fmt(i.qty) + " <small>" + esc(i.unit) + "</small></span>" +
            '<div class="stock-bar ' + meta.bar + '"><span style="width:' + stockPercent(i).toFixed(0) + '%"></span></div>' +
            '<span class="cell-note">Low at ' + fmt(i.min) + " " + esc(i.unit) + " (" + Math.round(LOW_PCT * 100) + "% of " + fmt(i.full) + ")</span>" +
          "</div></td>" +
          '<td data-label="Expiry Date">' + expiryCell(i) + "</td>" +
          '<td data-label="Status"><span class="status-badge status-badge--' + meta.badge + '">' + meta.label + "</span></td>" +
          '<td data-label="Last Updated"><span class="cell-date">' + dateStr(i.updatedAt) + '</span><span class="cell-time">' + timeStr(i.updatedAt) + "</span></td>" +
          '<td class="cell-actions" data-label="Actions">' +
            '<button type="button" class="button button--primary button--small" data-action="adjust" data-id="' + i.id + '">' + icon("edit") + "Update stock</button>" +
            '<button type="button" class="button button--danger button--small" data-action="delete" data-id="' + i.id + '">' + icon("trash") + "Delete</button>" +
          "</td>" +
          "</tr>"
        );
      }).join("");
    }

    $("inv-count-pill").textContent =
      list.length === items.length
        ? items.length + (items.length === 1 ? " item" : " items")
        : "Showing " + list.length + " of " + items.length + " items";
  }

  ["input", "change"].forEach(function (evt) {
    $("inv-search").addEventListener(evt, renderTable);
  });
  $("inv-category").addEventListener("change", renderTable);
  $("inv-status").addEventListener("change", renderTable);

  document.querySelectorAll(".stat-card--filter").forEach(function (card) {
    function apply() {
      $("inv-status").value = card.getAttribute("data-filter");
      renderTable();
    }
    card.addEventListener("click", apply);
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apply(); }
    });
  });

  $("inv-body").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-action='adjust']");
    if (!btn) { return; }
    var item = findItem(btn.getAttribute("data-id"));
    if (item) { openAdjust(item); }
  });
  $("inv-body").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-action='delete']");
    if (!btn) { return; }
    var item = findItem(btn.getAttribute("data-id"));
    if (item) { openDelete(item); }
  });

  /* ---------- stock history ---------- */
  function renderHistory() {
    var body = $("history-body");
    if (!log.length) {
      body.innerHTML =
        '<tr class="table-empty"><td colspan="5"><div class="empty-state">' +
        '<span class="empty-icon">' + icon("history") + "</span>" +
        "<p>No stock changes recorded yet.</p></div></td></tr>";
    } else {
      body.innerHTML = log.map(function (l) {
        var cls = l.change > 0 ? "up" : (l.change < 0 ? "down" : "none");
        var txt = l.change > 0 ? "+" + fmt(l.change) : (l.change < 0 ? "-" + fmt(Math.abs(l.change)) : "No change");
        if (l.change !== 0) { txt += " " + esc(l.unit); }
        return (
          "<tr>" +
          '<td data-label="Date &amp; Time"><span class="cell-date">' + dateStr(l.at) + '</span><span class="cell-time">' + timeStr(l.at) + "</span></td>" +
          '<td class="cell-name" data-label="Item">' + esc(l.itemName) + "</td>" +
          '<td data-label="Change"><span class="change change--' + cls + '">' + txt + "</span></td>" +
          '<td data-label="New Stock">' + fmt(l.newQty) + " " + esc(l.unit) + "</td>" +
          '<td data-label="Reason">' + esc(l.reason) + (l.note ? '<span class="cell-note">' + esc(l.note) + "</span>" : "") + "</td>" +
          "</tr>"
        );
      }).join("");
    }
    $("history-count-pill").textContent = log.length + (log.length === 1 ? " record" : " records");
  }

  function renderAll() {
    renderStats();
    renderTable();
    renderHistory();
  }

  /* ---------- update stock popup ---------- */
  var REASONS = {
    "in":  ["Returned to stock", "Other"],
    "out": ["Used in kitchen", "Spoiled / expired", "Damaged / wasted", "Other"],
    "set": ["Stock count correction", "Other"]
  };
  var QTY_LABELS = { "in": "Quantity to add", out: "Quantity to remove", set: "New stock count" };

  function computeNew(current, type, q) {
    if (type === "in") { return round2(current + q); }
    if (type === "out") { return round2(current - q); }
    return round2(q);
  }

  function fillReasons() {
    $("adj-reason").innerHTML =
      '<option value="" selected disabled>Select Reason</option>' +
      REASONS[adjType].map(function (r) { return "<option>" + esc(r) + "</option>"; }).join("");
  }

  function updateNoteLabel() {
    var required = $("adj-reason").value === "Other";
    $("adj-note-label").innerHTML = 'Note <span class="label-hint">(' + (required ? "required" : "optional") + ")</span>";
  }

  function updatePreview() {
    var item = findItem(adjId);
    if (!item) { return; }
    var q = parseQty($("adj-qty").value);
    var box = $("adj-preview");
    var badge = $("adj-new-badge");
    box.classList.remove("is-invalid");
    badge.hidden = true;
    if (isNaN(q)) { $("adj-new").textContent = "-"; return; }
    var n = computeNew(item.qty, adjType, q);
    if (n < 0) {
      $("adj-new").textContent = "Not enough stock";
      box.classList.add("is-invalid");
      return;
    }
    var meta = STATUS_META[statusFor(n, round2(Math.max(item.full, n) * LOW_PCT))];
    $("adj-new").textContent = fmt(n) + " " + item.unit;
    badge.className = "status-badge status-badge--" + meta.badge;
    badge.textContent = meta.label;
    badge.hidden = false;
  }

  function setType(t) {
    adjType = t;
    document.querySelectorAll("#adj-type .segmented-btn").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-type") === t);
    });
    $("adj-qty-label").textContent = QTY_LABELS[t];
    fillReasons();
    updateNoteLabel();
    ["adjQty", "adjReason", "adjNote"].forEach(function (f) { setError(f); });
    updatePreview();
  }

  function openAdjust(item) {
    adjId = item.id;
    $("adj-name").textContent = item.name;
    $("adj-sub").textContent = item.category + " · Low-stock level " + fmt(item.min) + " " + item.unit + " (" + Math.round(LOW_PCT * 100) + "% of " + fmt(item.full) + ")";
    $("adj-current").textContent = fmt(item.qty) + " " + item.unit;
    $("adj-qty").value = "";
    $("adj-note").value = "";
    setType("in");
    openModal("modal-adjust");
  }

  document.querySelectorAll("#adj-type .segmented-btn").forEach(function (b) {
    b.addEventListener("click", function () { setType(b.getAttribute("data-type")); });
  });
  $("adj-qty").addEventListener("input", function () { setError("adjQty"); updatePreview(); });
  $("adj-reason").addEventListener("change", function () { setError("adjReason"); updateNoteLabel(); });
  $("adj-note").addEventListener("input", function () { setError("adjNote"); });

  $("adj-confirm").addEventListener("click", function () {
    var item = findItem(adjId);
    if (!item) { closeModal(); return; }

    var q = parseQty($("adj-qty").value);
    var reason = $("adj-reason").value;
    var note = cleanText($("adj-note").value);
    var ok = true;
    function fail(f, m) { setError(f, m); ok = false; }
    ["adjQty", "adjReason", "adjNote"].forEach(function (f) { setError(f); });

    if (isNaN(q)) {
      fail("adjQty", "Enter a quantity.");
    } else if (adjType !== "set" && q <= 0) {
      fail("adjQty", "Quantity must be greater than 0.");
    } else if (adjType === "out" && q > item.qty) {
      fail("adjQty", "You can't remove more than the current stock (" + fmt(item.qty) + " " + item.unit + ").");
    } else if (adjType === "set" && q === item.qty) {
      fail("adjQty", "That is already the current stock.");
    }
    if (!reason) {
      fail("adjReason", "Please select a reason.");
    } else if (reason === "Other" && note.length < 3) {
      fail("adjNote", 'Please add a note when the reason is "Other".');
    }
    if (!ok) { toast("Please fix the highlighted fields.", "warning"); return; }

    var newQty = computeNew(item.qty, adjType, q);
    if (newQty < 0) { fail("adjQty", "Stock can't go below 0."); return; } // safety net

    var before = statusOf(item);
    var old = item.qty;
    item.qty = newQty;
    if (newQty > item.full) { item.full = newQty; } // new full stock level after a restock
    recalc(item);
    item.updatedAt = new Date().toISOString();
    log.unshift({
      id: log.reduce(function (m, l) { return Math.max(m, l.id); }, 0) + 1,
      itemId: item.id, itemName: item.name, unit: item.unit,
      type: adjType, change: round2(newQty - old), newQty: newQty,
      reason: reason, note: note, at: item.updatedAt
    });
    if (log.length > LOG_LIMIT) { log.length = LOG_LIMIT; }
    saveAll();
    renderAll();
    closeModal();

    toast(item.name + " stock updated to " + fmt(newQty) + " " + item.unit + ".", "success");
    var after = statusOf(item);
    if (after === "out") {
      toast(item.name + " is now out of stock. Please restock.", "danger");
    } else if (after === "low" && before === "in") {
      toast("Low stock alert: " + item.name + " is down to " + fmt(newQty) + " " + item.unit + " (low-stock level " + fmt(item.min) + ").", "warning");
    }
  });

  /* ---------- delete item (reason required) ---------- */
  var DELETE_REASONS = ["Discontinued item", "Expired / spoiled", "Damaged / wasted", "Added by mistake", "Other"];
  function openDelete(item) {
    $("del-name").textContent = item.name;
    $("del-sub").textContent = item.category + " · " + fmt(item.qty) + " " + item.unit + " in stock";
    $("del-reason").innerHTML = '<option value="" selected disabled>Select Reason</option>' +
      DELETE_REASONS.map(function (r) { return "<option>" + esc(r) + "</option>"; }).join("");
    $("del-note").value = "";
    ["delReason", "delNote"].forEach(function (f) { setError(f); });
    updateDelNoteLabel();
    openModal("modal-delete");
    delId = item.id; // set after openModal (closeModal clears it)
  }
  function updateDelNoteLabel() {
    var required = $("del-reason").value === "Other";
    $("del-note-label").innerHTML = 'Note <span class="label-hint">(' + (required ? "required" : "optional") + ")</span>";
  }
  $("del-reason").addEventListener("change", function () { setError("delReason"); updateDelNoteLabel(); });
  $("del-note").addEventListener("input", function () { setError("delNote"); });
  var delPending = null; // { id, reason, note } waiting for the final confirmation
  $("del-confirm").addEventListener("click", function () {
    var item = findItem(delId);
    if (!item) { closeModal(); return; }
    var reason = $("del-reason").value, note = cleanText($("del-note").value), ok = true;
    ["delReason", "delNote"].forEach(function (f) { setError(f); });
    if (!reason) { setError("delReason", "Please select a reason."); ok = false; }
    else if (reason === "Other" && note.length < 3) { setError("delNote", 'Please add a note when the reason is "Other".'); ok = false; }
    if (!ok) { toast("Please fix the highlighted fields.", "warning"); return; }
    $("dc-name").textContent = item.name;
    $("dc-qty").textContent = fmt(item.qty) + " " + item.unit;
    $("dc-reason").textContent = reason + (note ? " (" + note + ")" : "");
    openModal("modal-delete-confirm");
    delId = item.id; delPending = { id: item.id, reason: reason, note: note }; // set after openModal
  });

  $("dc-back").addEventListener("click", function () {
    var p = delPending, item = p && findItem(p.id);
    if (!item) { closeModal(); return; }
    openDelete(item);
    $("del-reason").value = p.reason; $("del-note").value = p.note; updateDelNoteLabel();
  });

  $("dc-yes").addEventListener("click", function () {
    var p = delPending, item = p && findItem(p.id);
    if (!item) { closeModal(); return; }
    var reason = p.reason, note = p.note;
    delPending = null;
    var now = new Date().toISOString();
    items = items.filter(function (i) { return i.id !== item.id; });
    log.unshift({
      id: log.reduce(function (m, l) { return Math.max(m, l.id); }, 0) + 1,
      itemId: item.id, itemName: item.name, unit: item.unit,
      type: "delete", change: -item.qty, newQty: 0,
      reason: "Item deleted: " + reason, note: note, at: now
    });
    if (log.length > LOG_LIMIT) { log.length = LOG_LIMIT; }
    saveAll();
    renderAll();
    closeModal();
    toast(item.name + " was deleted from the inventory.", "danger");
  });

  /* ---------- add item (menu items only) ---------- */
  var addForm = $("add-form");
  // Same list the Owner manages (localStorage), with the default menu as fallback.
  var DEFAULT_MENU = [
    ["Iced Tea", "Drinks"], ["Soda", "Drinks"], ["Lemonade", "Drinks"], ["Bottled Water", "Drinks"], ["Beer", "Drinks"], ["Soju", "Drinks"],
    ["Ssamjang", "Sauces"], ["Gochujang", "Sauces"], ["Sesame Oil Dip", "Sauces"], ["Cheese Dip", "Sauces"],
    ["Vanilla Ice Cream", "Sides"], ["Chocolate Ice Cream", "Sides"], ["Ube Ice Cream", "Sides"], ["Mango Ice Cream", "Sides"], ["Cookies & Cream", "Sides"]
  ];
  var CAT_MAP = { "Drinks": "Beverages", "Sauces": "Sauces & Condiments", "Sides": "Side Dishes", "Meat": "Meat" };
  var SHELF_BY_CAT = { "Meat": 5, "Seafood": 3, "Vegetables": 5, "Side Dishes": 30, "Sauces & Condiments": 90, "Rice & Noodles": 180, "Beverages": 180, "Supplies": 0 };
  function readList(key) {
    try { var a = JSON.parse(localStorage.getItem(key)); return Array.isArray(a) ? a : null; } catch (e) { return null; }
  }
  // Everything the Inventory Staff is allowed to add: Owner's menu items + Owner's ingredients.
  function sourceEntries() {
    var out = [], seen = {};
    function push(e) { var k = e.name.toLowerCase(); if (!seen[k]) { seen[k] = 1; out.push(e); } }
    var menuList = readList("unltdOwnerMenu");
    var menuNames = (menuList && menuList.length) ? menuList.filter(function (x) { return x && typeof x.name === "string" && CAT_MAP[x.cat]; }) :
      DEFAULT_MENU.map(function (m) { return { name: m[0], cat: m[1] }; });
    menuNames.forEach(function (x) {
      var p = PRESETS[x.name] || CAT_DEFAULTS[x.cat] || ["pcs", 30];
      push({ name: x.name, category: CAT_MAP[x.cat], unit: (typeof x.unit === "string" && x.unit) ? x.unit : p[0], shelf: p[1] });
    });
    (readList("unltdOwnerIngredients") || []).forEach(function (x) {
      if (x && typeof x.name === "string" && typeof x.cat === "string" && typeof x.unit === "string") {
        push({ name: x.name, category: x.cat, unit: x.unit, shelf: SHELF_BY_CAT[x.cat] === undefined ? 30 : SHELF_BY_CAT[x.cat] });
      }
    });
    return out;
  }
  function inInventory(menuName) {
    var n = menuName.toLowerCase();
    return items.some(function (i) {
      var s = i.name.toLowerCase();
      return s === n || s.indexOf(n + " (") === 0;
    });
  }
  var addable = [];
  function populateMenuItems() {
    addable = sourceEntries().filter(function (m) { return !inInventory(m.name); })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
    var sel = $("add-name");
    sel.innerHTML = '<option value="" selected disabled>' + (addable.length ? "Select Item" : "Nothing left to add") + "</option>" +
      addable.map(function (m) { return "<option>" + m.name.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</option>"; }).join("");
    sel.disabled = !addable.length;
    $("add-category").value = "";
    $("add-unit").value = "";
    $("add-expiry").value = "";
    $("add-expiry").disabled = false;
    $("add-expiry").min = todayYmd();
    var note = $("add-menu-note");
    note.classList.toggle("info-note--warn", !addable.length);
    note.querySelector("span").textContent = addable.length
      ? "You can only add items that are on the menu or in the Owner's ingredient list. New products must be added by the Owner first."
      : "Everything on the menu and ingredient list is already in the inventory. New products must be added by the Owner first.";
    addForm.querySelector('button[type="submit"]').disabled = !addable.length;
  }
  function matchMenu(val) {
    var n = cleanText(val).toLowerCase();
    return addable.filter(function (x) { return x.name.toLowerCase() === n; })[0];
  }
  function syncCategory() {
    var m = matchMenu($("add-name").value);
    var p = m ? presetFor(m) : null;
    $("add-category").value = p ? p.category : "";
    $("add-unit").value = p ? p.unit : "";
    $("add-expiry").value = (p && p.shelf) ? addDaysYmd(p.shelf) : "";
    $("add-expiry").disabled = !!(p && !p.shelf);
    ["category", "unit", "expiry"].forEach(function (f) { setError(f); });
  }
  $("add-name").addEventListener("change", syncCategory);
  var ADD_FIELDS = ["name", "category", "unit", "qty", "expiry"];
  // Category, unit and a suggested shelf life are preset per menu item (nothing to pick manually).
  var PRESETS = {
    "Iced Tea": ["bottles", 30], "Soda": ["cases", 180], "Lemonade": ["bottles", 30], "Bottled Water": ["cases", 365],
    "Beer": ["bottles", 365], "Soju": ["bottles", 365],
    "Ssamjang": ["tubs", 90], "Gochujang": ["tubs", 180], "Sesame Oil Dip": ["tubs", 90], "Cheese Dip": ["tubs", 30],
    "Vanilla Ice Cream": ["tubs", 180], "Chocolate Ice Cream": ["tubs", 180], "Ube Ice Cream": ["tubs", 180],
    "Mango Ice Cream": ["tubs", 180], "Cookies & Cream": ["tubs", 180]
  };
  var CAT_DEFAULTS = { "Drinks": ["bottles", 30], "Sauces": ["tubs", 60], "Sides": ["pcs", 30], "Meat": ["kg", 5] };
  function presetFor(m) { return { category: m.category, unit: m.unit, shelf: m.shelf }; }
  function validateAdd() {
    var m = matchMenu($("add-name").value);
    var p = m ? presetFor(m) : null;
    var v = {
      name: m ? m.name : cleanText($("add-name").value),
      category: p ? p.category : "",
      unit: p ? p.unit : "",
      qty: parseQty($("add-qty").value),
      expiry: $("add-expiry").value
    };
    var ok = true;
    function fail(f, msg) { setError(f, msg); ok = false; }
    ADD_FIELDS.forEach(function (f) { setError(f); });

    if (!m) {
      fail("name", "Please select an item from the menu.");
    } else if (inInventory(v.name)) {
      fail("name", "This item already exists. Use Update stock instead.");
    }
    if (isNaN(v.qty)) { fail("qty", "Enter the initial stock."); }
    else if (v.qty <= 0) { fail("qty", "Initial stock must be greater than 0."); }
    if (p && !p.shelf) { v.expiry = ""; } // supplies have no expiry date
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(v.expiry)) { fail("expiry", "Enter the expiry date."); }
    else if (v.expiry < todayYmd()) { fail("expiry", "Expiry date can't be in the past."); }
    else if (v.expiry > addDaysYmd(365 * 5)) { fail("expiry", "Expiry date is too far ahead."); }
    return ok ? v : null;
  }

  addForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = validateAdd();
    if (!v) { toast("Please fix the highlighted fields.", "warning"); return; }
    $("ac-name").textContent = v.name;
    $("ac-category").textContent = v.category;
    $("ac-qty").textContent = fmt(v.qty) + " " + v.unit;
    $("ac-expiry").textContent = v.expiry ? expiryStr(v.expiry) : "No expiry";
    $("ac-min").textContent = fmt(round2(v.qty * LOW_PCT)) + " " + v.unit + " (" + Math.round(LOW_PCT * 100) + "% of initial stock)";
    openModal("modal-add-confirm");
    pendingItem = v; // set after openModal
  });

  $("add-confirm-yes").addEventListener("click", function () {
    var v = pendingItem;
    if (!v) { closeModal(); return; }
    var now = new Date().toISOString();
    var item = {
      id: items.reduce(function (m, i) { return Math.max(m, i.id); }, 0) + 1,
      name: v.name, category: v.category, unit: v.unit, qty: v.qty, full: v.qty, expiry: v.expiry, updatedAt: now
    };
    recalc(item);
    items.push(item);
    log.unshift({
      id: log.reduce(function (m, l) { return Math.max(m, l.id); }, 0) + 1,
      itemId: item.id, itemName: item.name, unit: item.unit,
      type: "add", change: item.qty, newQty: item.qty,
      reason: "New item added", note: "", at: now
    });
    if (log.length > LOG_LIMIT) { log.length = LOG_LIMIT; }
    saveAll();
    resetAddForm();
    $("inv-search").value = "";
    $("inv-category").value = "all";
    $("inv-status").value = "all";
    renderAll();
    closeModal();
    showView("inventory");
    toast(item.name + " was added to the inventory.", "success");
    if (statusOf(item) !== "in") {
      toast("Heads up: " + item.name + " starts at or below its minimum level.", "warning");
    }
  });

  function resetAddForm() {
    addForm.reset();
    populateMenuItems();
    ADD_FIELDS.forEach(function (f) { setError(f); });
  }

  $("add-cancel").addEventListener("click", function () {
    resetAddForm();
    showView("inventory");
  });

  addForm.addEventListener("input", function (e) {
    var wrap = e.target.closest("[data-field]");
    if (wrap) { setError(wrap.getAttribute("data-field")); }
  });
  addForm.addEventListener("change", function (e) {
    var wrap = e.target.closest("[data-field]");
    if (wrap) { setError(wrap.getAttribute("data-field")); }
  });

  /* ---------- log out ---------- */
  $("logout-button").addEventListener("click", function () {
    closeDrawer();
    openModal("modal-logout");
  });
  $("logout-yes").addEventListener("click", function () {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    // reset demo data: next login starts again from the demo list
    try {
      localStorage.removeItem(ITEMS_KEY);
      localStorage.removeItem(LOG_KEY);
    } catch (e) { /* ignore */ }
    window.location.replace("login.html");
  });

  /* ---------- init ---------- */
  populateMenuItems();
  renderAll();
})();