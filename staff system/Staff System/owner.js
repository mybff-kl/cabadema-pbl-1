/* =====================================================
   UNLTD 199 - Owner Portal
   Sales & trends, peak analytics, most ordered items, sales report,
   transaction history, table configuration, backup & restore.
   Front-end prototype: sales data is generated sample data (no database).
   ===================================================== */
(function () {
  "use strict";
  // Refreshing the page resets the demo data (the login session is kept).
  try {
    var navEntry = performance.getEntriesByType("navigation")[0];
    if (navEntry && navEntry.type === "reload") { ["unltdOwnerTables", "unltdOwnerBackups", "unltdOwnerBackupSettings", "unltdOwnerMenu", "unltdOwnerIngredients"].forEach(function (k) { localStorage.removeItem(k); }); }
  } catch (e) { /* ignore */ }


  var SESSION_KEY = "OwnerLoggedIn"; // must match sessionKey in login.js
  var TABLES_KEY = "unltdOwnerTables";
  var BACKUPS_KEY = "unltdOwnerBackups";
  var SETTINGS_KEY = "unltdOwnerBackupSettings";
  var MENU_KEY = "unltdOwnerMenu";
  var ING_KEY = "unltdOwnerIngredients";
  var ALL_KEYS = [TABLES_KEY, BACKUPS_KEY, SETTINGS_KEY, MENU_KEY, ING_KEY];
  var MAX_BACKUPS = 30;
  var MAX_TABLES = 50;
  var RESTORE_MS = 1600;
  var TX_PAGE = 25;
  var DAYS_BACK = 364; // sample data window (12 months)

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function icon(name) { return '<svg class="icon"><use href="#icon-' + name + '"></use></svg>'; }
  function p2(n) { return String(n).padStart(2, "0"); }
  function fmt(n) { return Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 }); }
  function money(n) { return "₱" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
  function compact(n) {
    if (n >= 1e6) { return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M"; }
    if (n >= 1e3) { return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "k"; }
    return String(Math.round(n));
  }
  function plural(n, w) { return n + " " + w + (n === 1 ? "" : "s"); }
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  function dkey(d) { return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
  function parseKey(k) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k || "");
    if (!m) { return null; }
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return d.getMonth() === +m[2] - 1 ? d : null;
  }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; }
  function fmtDate(k) { var d = parseKey(k); return MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear(); }
  function fmtShort(k) { var d = parseKey(k); return MONTHS[d.getMonth()] + " " + d.getDate(); }
  function fmtHour(h) { return (h % 12 || 12) + " " + (h >= 12 ? "PM" : "AM"); }
  function fmtTime(h, m) { return (h % 12 || 12) + ":" + p2(m) + " " + (h >= 12 ? "PM" : "AM"); }
  function fmtStamp(iso) {
    var d = new Date(iso);
    return MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear() + " · " + fmtTime(d.getHours(), d.getMinutes());
  }
  function today() { return new Date(); }
  function todayKey() { return dkey(today()); }
  function earliestKey() { return dkey(addDays(today(), -DAYS_BACK)); }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ignore */ } }
  function loadJSON(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }

  /* ---------- menu & sample transactions ---------- */
  var CATS = ["Unli 199", "Drinks", "Meat", "Sauces", "Sides"];
  // Buffet: Unli 199 per person. Add-ons are drinks, sauces and ice cream (50-100 pesos).
  var MENU = [
    ["Unli 199", "Unli 199", 199],
    ["Iced Tea", "Drinks", 60], ["Soda", "Drinks", 50], ["Lemonade", "Drinks", 70], ["Bottled Water", "Drinks", 50], ["Beer", "Drinks", 90], ["Soju", "Drinks", 100],
    ["Ssamjang", "Sauces", 50], ["Gochujang", "Sauces", 50], ["Sesame Oil Dip", "Sauces", 60], ["Cheese Dip", "Sauces", 80],
    ["Vanilla Ice Cream", "Sides", 60], ["Chocolate Ice Cream", "Sides", 60], ["Ube Ice Cream", "Sides", 70], ["Mango Ice Cream", "Sides", 70], ["Cookies & Cream", "Sides", 80]
  ];
  function menuBy(cat) { return MENU.filter(function (m) { return m[1] === cat; }); }
  var HOURS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
  var HOUR_W = [0.3, 0.75, 0.9, 0.5, 0.3, 0.35, 0.65, 1, 1.3, 1.2, 0.8, 0.4];
  var DOW_W = [1.3, 0.7, 0.75, 0.8, 0.9, 1.2, 1.4];
  var SEASONS = [
    { id: "cool", name: "Cool Season", months: "Nov–Feb", w: 1.15 },
    { id: "summer", name: "Summer", months: "Mar–May", w: 1.0 },
    { id: "rainy", name: "Rainy Season", months: "Jun–Oct", w: 0.85 }
  ];
  function seasonIdx(month) { return (month >= 10 || month <= 1) ? 0 : (month <= 4 ? 1 : 2); }
  var CASHIERS = ["Maria", "Jose", "Ana", "Paolo"];
  var PAYMENTS = ["Cash", "Cash", "GCash", "Card"];

  var dayCache = {};
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function weighted(rng, w) {
    var t = 0, i; for (i = 0; i < w.length; i++) { t += w[i]; }
    var r = rng() * t;
    for (i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) { return i; } }
    return w.length - 1;
  }
  function genDay(key) {
    if (dayCache[key]) { return dayCache[key]; }
    var d = parseKey(key);
    var rng = mulberry32(hashStr("unltd199" + key));
    var count = Math.round(60 * DOW_W[d.getDay()] * SEASONS[seasonIdx(d.getMonth())].w * (0.85 + rng() * 0.3));
    var list = [];
    for (var i = 0; i < count; i++) {
      var hi = weighted(rng, HOUR_W);
      var h = HOURS[hi], m = Math.floor(rng() * 60);
      var pax = 1 + Math.floor(rng() * rng() * 8) + (rng() < 0.4 ? 1 : 0);
      if (pax > 8) { pax = 8; }
      var lines = [];
      function add(cat, count, maxQty) {
        var pool = menuBy(cat);
        for (var x = 0; x < count; x++) {
          var it = pool[Math.floor(rng() * rng() * pool.length)];
          lines.push({ name: it[0], cat: it[1], price: it[2], qty: 1 + Math.floor(rng() * maxQty) });
        }
      }
      lines.push({ name: "Unli 199", cat: "Unli 199", price: 199, qty: pax });
      if (rng() < 0.8) { add("Drinks", 1 + Math.floor(rng() * 2), Math.max(1, pax)); }
      if (rng() < 0.5) { add("Sauces", 1 + Math.floor(rng() * 2), 2); }
      if (rng() < 0.45) { add("Sides", 1 + Math.floor(rng() * 2), Math.max(1, Math.ceil(pax / 2))); }
      // merge duplicate lines
      var merged = {};
      lines.forEach(function (l) { if (merged[l.name]) { merged[l.name].qty += l.qty; } else { merged[l.name] = l; } });
      lines = Object.keys(merged).map(function (nm) { return merged[nm]; });
      var total = 0, items = 0;
      lines.forEach(function (l) { total += l.price * l.qty; items += l.qty; });
      var r = rng();
      list.push({
        date: key, hour: h, min: m, pax: pax, lines: lines, total: total, items: items,
        table: 1 + Math.floor(rng() * 12),
        status: r < 0.93 ? "Completed" : (r < 0.965 ? "Refunded" : "Voided"),
        pay: pick(rng, PAYMENTS), cashier: pick(rng, CASHIERS)
      });
    }
    list.sort(function (a, b) { return (a.hour * 60 + a.min) - (b.hour * 60 + b.min); });
    var ymd = key.replace(/-/g, "");
    list.forEach(function (t, idx) { t.id = "TX-" + ymd + "-" + String(idx + 1).padStart(3, "0"); });
    dayCache[key] = list;
    return list;
  }
  // transactions of a day, hiding ones later than "now" for today
  function dayTx(key) {
    var list = genDay(key);
    if (key !== todayKey()) { return list; }
    var n = today(), nowMin = n.getHours() * 60 + n.getMinutes();
    return list.filter(function (t) { return t.hour * 60 + t.min <= nowMin; });
  }
  function eachDay(fromKey, toKey, fn) {
    var d = parseKey(fromKey), end = parseKey(toKey);
    while (d <= end) { fn(dkey(d), d); d = addDays(d, 1); }
  }
  function txBetween(fromKey, toKey, onlyDone) {
    var out = [];
    eachDay(fromKey, toKey, function (k) {
      dayTx(k).forEach(function (t) { if (!onlyDone || t.status === "Completed") { out.push(t); } });
    });
    return out;
  }
  // value of a transaction under a category filter
  function catLines(t, cat) {
    return cat === "all" ? t.lines : t.lines.filter(function (l) { return l.cat === cat; });
  }
  function catAmount(t, cat) {
    var s = 0; catLines(t, cat).forEach(function (l) { s += l.price * l.qty; }); return s;
  }
  function sumTx(list, cat) {
    var r = { sales: 0, orders: 0, pax: 0, items: 0 };
    list.forEach(function (t) {
      var ls = catLines(t, cat);
      if (!ls.length) { return; }
      r.orders++; r.pax += t.pax;
      ls.forEach(function (l) { r.sales += l.price * l.qty; r.items += l.qty; });
    });
    return r;
  }

  /* ---------- date ranges ---------- */
  function mondayOf(d) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  function periodRange(p) {
    var t = today(), tk = dkey(t);
    if (p === "today") { return [tk, tk, "Today"]; }
    if (p === "week") { return [dkey(mondayOf(t)), tk, "This Week"]; }
    if (p === "month") { return [dkey(new Date(t.getFullYear(), t.getMonth(), 1)), tk, "This Month"]; }
    if (p === "90") { return [dkey(addDays(t, -89)), tk, "Last 90 Days"]; }
    return [dkey(addDays(t, -DAYS_BACK)), tk, "Last 12 Months"]; // year
  }
  function quickRange(v) {
    var t = today(), tk = dkey(t);
    if (v === "today") { return [tk, tk]; }
    if (v === "month") { return [dkey(new Date(t.getFullYear(), t.getMonth(), 1)), tk]; }
    if (v === "lastmonth") { return [dkey(new Date(t.getFullYear(), t.getMonth() - 1, 1)), dkey(new Date(t.getFullYear(), t.getMonth(), 0))]; }
    var n = parseInt(v, 10);
    if (n > 0) { return [dkey(addDays(t, -(n - 1))), tk]; }
    return null;
  }
  function checkRange(from, to, maxDays) {
    if (!from || !to || !parseKey(from) || !parseKey(to)) { return "Please choose both a start and end date."; }
    if (from > to) { return "The start date must be on or before the end date."; }
    if (to > todayKey()) { return "The end date cannot be in the future."; }
    if (from < earliestKey()) { return "Records only go back 12 months (from " + fmtDate(earliestKey()) + ")."; }
    if (maxDays && (parseKey(to) - parseKey(from)) / 86400000 + 1 > maxDays) { return "Please choose a range of up to " + maxDays + " days."; }
    return "";
  }
  function setLimits(ids) {
    ids.forEach(function (id) { $(id).max = todayKey(); $(id).min = earliestKey(); });
  }

  /* ---------- clock (12-hour) ---------- */
  function tickClock() {
    var d = new Date();
    $("topbar-clock").textContent = (d.getHours() % 12 || 12) + ":" + p2(d.getMinutes()) + ":" + p2(d.getSeconds()) + " " + (d.getHours() >= 12 ? "PM" : "AM");
  }

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
    function dismiss() { el.classList.add("toast--leaving"); setTimeout(function () { el.remove(); }, 200); }
    el.querySelector(".toast-close").addEventListener("click", dismiss);
    setTimeout(dismiss, type === "success" ? 3500 : 5000);
  }

  /* ---------- drawer / views / modals ---------- */
  var drawer = $("drawer"), drawerOverlay = $("drawer-overlay");
  function openDrawer() { drawer.classList.add("drawer--open"); drawer.setAttribute("aria-hidden", "false"); drawerOverlay.hidden = false; }
  function closeDrawer() { drawer.classList.remove("drawer--open"); drawer.setAttribute("aria-hidden", "true"); drawerOverlay.hidden = true; }
  $("menu-button").addEventListener("click", openDrawer);
  $("drawer-close-button").addEventListener("click", closeDrawer);
  drawerOverlay.addEventListener("click", closeDrawer);

  var VIEWS = ["sales", "peak", "items", "report", "transactions", "menu", "tables", "backup"];
  var currentView = "sales";
  function showView(name) {
    currentView = name;
    VIEWS.forEach(function (v) { $("view-" + v).hidden = v !== name; });
    document.querySelectorAll(".drawer-item[data-view]").forEach(function (b) {
      b.classList.toggle("drawer-item--active", b.getAttribute("data-view") === name);
    });
    closeDrawer();
    window.scrollTo(0, 0);
    if (name === "sales") { renderSales(); }
    if (name === "peak") { renderPeak(); }
    if (name === "items") { renderItems(); }
    if (name === "transactions") { renderTx(true); }
    if (name === "menu") { renderMenu(); }
    if (name === "tables") { renderTables(); }
    if (name === "backup") { renderBackup(); }
  }
  document.querySelectorAll(".drawer-item[data-view]").forEach(function (b) {
    b.addEventListener("click", function () { showView(b.getAttribute("data-view")); });
  });

  var overlay = $("modal-overlay");
  var locked = false; // restore in progress cannot be dismissed
  function openModal(id) {
    overlay.querySelectorAll(".modal").forEach(function (m) { m.hidden = m.id !== id; });
    overlay.hidden = false;
  }
  function closeModal() {
    if (locked) { return; }
    overlay.hidden = true;
    overlay.querySelectorAll(".modal").forEach(function (m) { m.hidden = true; });
    pendingDelete = null; pendingRestore = null; menuPending = null; menuDeleteId = null; ingPending = null; ingDeleteId = null;
  }
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay || e.target.closest("[data-close]")) { closeModal(); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") { return; }
    if (!overlay.hidden) { closeModal(); } else { closeDrawer(); }
  });

  /* ======================================================
     CHARTS (inline SVG)
     ====================================================== */
  function niceMax(v) {
    if (v <= 0) { return 10; }
    var mag = Math.pow(10, Math.floor(Math.log10(v)));
    var n = v / mag;
    var nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return nice * mag;
  }
  function chartFrame(maxV, W, H, M, yFmt) {
    var g = "", i;
    for (i = 0; i <= 4; i++) {
      var y = M.t + (H - M.t - M.b) * (1 - i / 4);
      g += '<line class="ch-grid" x1="' + M.l + '" x2="' + (W - M.r) + '" y1="' + y + '" y2="' + y + '"/>' +
        '<text class="ch-axis" x="' + (M.l - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + yFmt(maxV * i / 4) + "</text>";
    }
    return g;
  }
  function labelStep(n) { return n <= 12 ? 1 : Math.ceil(n / 10); }
  function barChart(points, yFmt, valFmt) {
    if (!points.length || points.every(function (p) { return !p.value; })) { return '<div class="ch-empty">No data for this selection.</div>'; }
    var W = 640, H = 280, M = { l: 52, r: 12, t: 22, b: 34 };
    var maxV = niceMax(Math.max.apply(null, points.map(function (p) { return p.value; })));
    var top = Math.max.apply(null, points.map(function (p) { return p.value; }));
    var slot = (W - M.l - M.r) / points.length, bw = Math.min(46, slot * 0.66);
    var step = labelStep(points.length);
    var s = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img">' + chartFrame(maxV, W, H, M, yFmt);
    points.forEach(function (p, i) {
      var h = (H - M.t - M.b) * (p.value / maxV);
      var x = M.l + slot * i + (slot - bw) / 2, y = H - M.b - h;
      var cls = "ch-bar" + (p.value === top && top > 0 ? " ch-bar--peak" : "") + (p.empty ? " ch-bar--low" : "");
      s += '<rect class="' + cls + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(h, 0).toFixed(1) + '" rx="4"><title>' + esc(p.label + ": " + valFmt(p.value)) + "</title></rect>";
      if (points.length <= 12 && p.value > 0) { s += '<text class="ch-val" x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 5).toFixed(1) + '" text-anchor="middle">' + esc(yFmt(p.value)) + "</text>"; }
      if (i % step === 0) { s += '<text class="ch-axis" x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle">' + esc(p.short || p.label) + "</text>"; }
    });
    return s + "</svg>";
  }
  function lineChart(points, yFmt, valFmt) {
    if (!points.length || points.every(function (p) { return !p.value; })) { return '<div class="ch-empty">No data for this selection.</div>'; }
    var W = 640, H = 280, M = { l: 52, r: 16, t: 22, b: 34 };
    var maxV = niceMax(Math.max.apply(null, points.map(function (p) { return p.value; })));
    var n = points.length, step = labelStep(n), pw = W - M.l - M.r;
    function X(i) { return M.l + (n === 1 ? pw / 2 : pw * i / (n - 1)); }
    function Y(v) { return H - M.b - (H - M.t - M.b) * (v / maxV); }
    var line = points.map(function (p, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p.value).toFixed(1); }).join(" ");
    var area = line + " L" + X(n - 1).toFixed(1) + " " + (H - M.b) + " L" + X(0).toFixed(1) + " " + (H - M.b) + " Z";
    var s = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img">' + chartFrame(maxV, W, H, M, yFmt) +
      '<path class="ch-area" d="' + area + '"/><path class="ch-line" d="' + line + '"/>';
    points.forEach(function (p, i) {
      if (n <= 31) { s += '<circle class="ch-dot" cx="' + X(i).toFixed(1) + '" cy="' + Y(p.value).toFixed(1) + '" r="3.5"><title>' + esc(p.label + ": " + valFmt(p.value)) + "</title></circle>"; }
      if (i % step === 0) { s += '<text class="ch-axis" x="' + X(i).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle">' + esc(p.short || p.label) + "</text>"; }
    });
    return s + "</svg>";
  }
  function hbars(rows, valFmt) {
    if (!rows.length) { return '<div class="ch-empty">No orders for this selection.</div>'; }
    var mx = rows[0].value || 1;
    return '<div class="hbar-list">' + rows.map(function (r) {
      return '<div class="hbar-row"><div class="hbar-top"><span class="hbar-name">' + esc(r.name) + '</span><span class="hbar-val">' + esc(valFmt(r.value)) + '</span></div>' +
        '<div class="hbar-track"><span style="width:' + Math.max(3, Math.round(r.value / mx * 100)) + '%"></span></div></div>';
    }).join("") + "</div>";
  }

  /* ======================================================
     SALES & TRENDS
     ====================================================== */
  function itemTotals(list, cat) {
    var map = {};
    list.forEach(function (t) {
      catLines(t, cat).forEach(function (l) {
        var m = map[l.name] || (map[l.name] = { name: l.name, cat: l.cat, qty: 0, sales: 0 });
        m.qty += l.qty; m.sales += l.price * l.qty;
      });
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.qty - a.qty || a.name.localeCompare(b.name); });
  }
  var BLOCKS = [
    { name: "Lunch", time: "11 AM – 2 PM", from: 11, to: 14, ic: "sun" },
    { name: "Afternoon", time: "2 PM – 5 PM", from: 14, to: 17, ic: "cloud" },
    { name: "Dinner", time: "5 PM – 8 PM", from: 17, to: 20, ic: "utensils" },
    { name: "Late Night", time: "8 PM – 11 PM", from: 20, to: 23, ic: "moon" }
  ];
  function renderSales() {
    var cat = $("sales-category").value, period = $("sales-period").value || "week";
    var t = today(), tk = dkey(t);
    var rToday = sumTx(txBetween(tk, tk, true), cat);
    var wk = periodRange("week"), mo = periodRange("month");
    var rWeek = sumTx(txBetween(wk[0], wk[1], true), cat);
    var rMonth = sumTx(txBetween(mo[0], mo[1], true), cat);
    var pr = periodRange(period);
    var list = txBetween(pr[0], pr[1], true);
    var rPeriod = sumTx(list, cat);

    $("kpi-today").textContent = money(rToday.sales);
    $("kpi-today-sub").textContent = plural(rToday.orders, "order") + " so far";
    $("kpi-week").textContent = money(rWeek.sales);
    $("kpi-week-sub").textContent = plural(rWeek.orders, "order") + " this week";
    $("kpi-month").textContent = money(rMonth.sales);
    $("kpi-month-sub").textContent = plural(rMonth.orders, "order") + " this month";
    $("kpi-customers").textContent = fmt(rPeriod.pax);
    $("kpi-customers-sub").textContent = pr[2];

    // trend
    var pts = [], i;
    var yF = compact, vF = money;
    if (period === "today") {
      HOURS.forEach(function (h) {
        var v = 0; list.forEach(function (x) { if (x.hour === h) { v += catAmount(x, cat); } });
        pts.push({ label: fmtHour(h), short: fmtHour(h).replace(" ", ""), value: v });
      });
    } else if (period === "year") {
      for (i = 11; i >= 0; i--) {
        var ms = new Date(t.getFullYear(), t.getMonth() - i, 1), me = new Date(t.getFullYear(), t.getMonth() - i + 1, 0);
        var a1 = dkey(ms) < earliestKey() ? earliestKey() : dkey(ms), b1 = dkey(me) > tk ? tk : dkey(me);
        pts.push({ label: MONTHS[ms.getMonth()] + " " + ms.getFullYear(), short: MONTHS[ms.getMonth()], value: sumTx(txBetween(a1, b1, true), cat).sales });
      }
    } else if (period === "90") {
      var d0 = parseKey(pr[0]);
      for (i = 0; i < 13; i++) {
        var a = dkey(addDays(d0, i * 7)), b = dkey(addDays(d0, i * 7 + 6));
        if (b > pr[1]) { b = pr[1]; }
        pts.push({ label: fmtShort(a) + " – " + fmtShort(b), short: fmtShort(a), value: sumTx(txBetween(a, b, true), cat).sales });
      }
    } else {
      eachDay(pr[0], pr[1], function (k, d) {
        var v = 0; dayTx(k).forEach(function (x) { if (x.status === "Completed") { v += catAmount(x, cat); } });
        pts.push({ label: WEEKDAYS[d.getDay()].slice(0, 3) + ", " + fmtShort(k), short: period === "week" ? WEEKDAYS[d.getDay()].slice(0, 3) : String(d.getDate()), value: v });
      });
    }
    $("trend-chart").innerHTML = (period === "month" && pts.length > 14) ? lineChart(pts, yF, vF) : barChart(pts, yF, vF);
    $("trend-pill").textContent = pr[2] + " · " + money(rPeriod.sales);

    // top selling
    var tops = itemTotals(list, cat).slice(0, 5);
    $("top-title").textContent = cat === "all" ? "Top Selling Items" : "Top " + cat;
    $("top-chart").innerHTML = hbars(tops.map(function (x) { return { name: x.name, value: x.qty }; }), function (v) { return fmt(v) + " sold"; });
    $("top-pill").textContent = pr[2];
    $("top-note").textContent = tops.length ? "Ranked by quantity ordered." : "";

    // peak blocks
    var bl = BLOCKS.map(function (b) {
      var o = 0, s = 0;
      list.forEach(function (x) {
        if (x.hour >= b.from && x.hour < b.to) { var a2 = catAmount(x, cat); if (a2 > 0) { o++; s += a2; } }
      });
      return { b: b, orders: o, sales: s };
    });
    var mx = Math.max.apply(null, bl.map(function (x) { return x.orders; }));
    var html = "";
    bl.forEach(function (x) {
      var isPeak = mx > 0 && x.orders === mx;
      html += '<div class="peak-block' + (isPeak ? " is-peak" : "") + '">' + icon(x.b.ic) +
        '<span class="peak-name">' + x.b.name + '</span><span class="peak-time">' + x.b.time + "</span>" +
        '<span class="peak-val">' + plural(x.orders, "order") + '</span><span class="peak-time">' + money(x.sales) + "</span>" +
        '<span class="peak-tag">' + (isPeak ? "Peak time" : "&nbsp;") + "</span></div>";
    });
    $("peak-blocks").innerHTML = html;
    var peakB = bl.filter(function (x) { return mx > 0 && x.orders === mx; })[0];
    $("peak-pill").textContent = peakB ? "Busiest: " + peakB.b.name : "No orders";
  }
  $("sales-category").addEventListener("change", renderSales);
  $("sales-period").addEventListener("change", renderSales);

  /* ======================================================
     PEAK ANALYTICS
     ====================================================== */
  var peakMode = "hourly", peakMetric = "sales";
  function setSeg(groupId, attr, val) {
    $(groupId).querySelectorAll(".segmented-btn").forEach(function (b) { b.classList.toggle("is-active", b.getAttribute(attr) === val); });
  }
  $("peak-mode").addEventListener("click", function (e) {
    var b = e.target.closest("[data-mode]"); if (!b) { return; }
    peakMode = b.getAttribute("data-mode"); setSeg("peak-mode", "data-mode", peakMode); renderPeak();
  });
  $("peak-metric").addEventListener("click", function (e) {
    var b = e.target.closest("[data-metric]"); if (!b) { return; }
    peakMetric = b.getAttribute("data-metric"); setSeg("peak-metric", "data-metric", peakMetric); renderPeak();
  });
  function applyQuick(prefix) {
    var r = quickRange($(prefix + "-quick").value);
    if (r) { $(prefix + "-from").value = r[0]; $(prefix + "-to").value = r[1]; }
  }
  $("peak-quick").addEventListener("change", function () { applyQuick("peak"); renderPeak(); });
  ["peak-from", "peak-to"].forEach(function (id) {
    $(id).addEventListener("change", function () { $("peak-quick").value = "custom"; renderPeak(); });
  });

  function renderPeak() {
    var from = $("peak-from").value, to = $("peak-to").value;
    var err = checkRange(from, to, 0);
    $("peak-error").textContent = err;
    if (err) {
      $("peak-chart").innerHTML = '<div class="ch-empty">Choose a valid date range to see the chart.</div>';
      ["pk-1", "pk-2", "pk-3"].forEach(function (id) { $(id).textContent = "-"; $(id + "-sub").textContent = "-"; });
      $("peak-insight").textContent = ""; $("peak-range-pill").textContent = "-";
      return;
    }
    var list = txBetween(from, to, true);
    var useSales = peakMetric === "sales";
    var vF = useSales ? money : function (v) { return fmt(v) + (Math.round(v) === 1 ? " order" : " orders"); };
    var yF = useSales ? compact : function (v) { return v >= 100 ? String(Math.round(v)) : (Math.round(v * 10) / 10).toString(); };
    var buckets = [], i;
    var dayCount = (parseKey(to) - parseKey(from)) / 86400000 + 1;
    var title, l1, l2, l3, per;
    if (peakMode === "hourly") {
      HOURS.forEach(function (h) { buckets.push({ label: fmtHour(h), short: fmtHour(h).replace(" ", ""), sum: 0, div: 1 }); });
      list.forEach(function (t) { var b = buckets[t.hour - 11]; b.sum += useSales ? t.total : 1; });
      title = "Peak Hours"; l1 = "Busiest hour"; l2 = "Slowest hour"; l3 = "Average per hour"; per = "per hour";
    } else if (peakMode === "daily") {
      var order = [1, 2, 3, 4, 5, 6, 0];
      order.forEach(function (d) { buckets.push({ dow: d, label: WEEKDAYS[d], short: WEEKDAYS[d].slice(0, 3), sum: 0, div: 0 }); });
      eachDay(from, to, function (k, d) { buckets[order.indexOf(d.getDay())].div++; });
      list.forEach(function (t) { buckets[order.indexOf(parseKey(t.date).getDay())].sum += useSales ? t.total : 1; });
      title = "Peak Days (average per day)"; l1 = "Busiest day"; l2 = "Slowest day"; l3 = "Average per day"; per = "per day";
    } else {
      SEASONS.forEach(function (s) { buckets.push({ label: s.name + " (" + s.months + ")", short: s.name.replace(" Season", ""), sum: 0, div: 0 }); });
      eachDay(from, to, function (k, d) { buckets[seasonIdx(d.getMonth())].div++; });
      list.forEach(function (t) { buckets[seasonIdx(parseKey(t.date).getMonth())].sum += useSales ? t.total : 1; });
      title = "Seasonal Peaks (average per day)"; l1 = "Busiest season"; l2 = "Slowest season"; l3 = "Average per day"; per = "per day";
    }
    buckets.forEach(function (b) {
      b.has = peakMode === "hourly" ? true : b.div > 0;
      b.value = peakMode === "hourly" ? b.sum : (b.div ? b.sum / b.div : 0);
      b.empty = !b.has;
    });
    var withData = buckets.filter(function (b) { return b.has; });
    var hi = withData.reduce(function (a, b) { return b.value > a.value ? b : a; }, withData[0]);
    var lo = withData.reduce(function (a, b) { return b.value < a.value ? b : a; }, withData[0]);
    var total = 0; withData.forEach(function (b) { total += b.value; });
    var avg = total / withData.length;
    if (peakMode === "hourly") { avg = total / withData.length; per = "per hour (total in range)"; }
    $("pk-1-label").textContent = l1; $("pk-2-label").textContent = l2; $("pk-3-label").textContent = l3;
    $("pk-1").textContent = hi.label.replace(/ \(.*\)/, ""); $("pk-1-sub").textContent = vF(hi.value);
    $("pk-2").textContent = lo.label.replace(/ \(.*\)/, ""); $("pk-2-sub").textContent = vF(lo.value);
    $("pk-3").textContent = useSales ? money(avg) : (Math.round(avg * 10) / 10) + " orders"; $("pk-3-sub").textContent = per;
    $("peak-chart-title").textContent = title;
    $("peak-range-pill").textContent = fmtShort(from) + " – " + fmtDate(to) + " · " + plural(dayCount, "day");
    $("peak-chart").innerHTML = barChart(buckets, yF, vF);
    var skipped = buckets.length - withData.length;
    $("peak-insight").textContent = "Busiest: " + hi.label + " (" + vF(hi.value) + "). Slowest: " + lo.label + " (" + vF(lo.value) + ")." +
      (skipped ? " " + plural(skipped, "season") + " not covered by this date range." : "");
  }

  /* ======================================================
     MOST ORDERED ITEMS
     ====================================================== */
  function renderItems() {
    var cat = $("items-category").value, pr = periodRange($("items-period").value);
    var limit = parseInt($("items-limit").value, 10);
    var all = itemTotals(txBetween(pr[0], pr[1], true), cat);
    var totalQty = all.reduce(function (s, x) { return s + x.qty; }, 0);
    var rows = limit ? all.slice(0, limit) : all;
    var body = $("items-body");
    if (!rows.length) {
      body.innerHTML = '<tr class="table-empty"><td colspan="6">No orders for this selection.</td></tr>';
    } else {
      body.innerHTML = rows.map(function (x, i) {
        var pct = totalQty ? x.qty / totalQty * 100 : 0;
        return '<tr><td data-label="Rank"><span class="rank rank--' + (i + 1) + '">' + (i + 1) + "</span></td>" +
          '<td data-label="Item" class="cell-name">' + esc(x.name) + "</td>" +
          '<td data-label="Category"><span class="chip">' + esc(x.cat) + "</span></td>" +
          '<td data-label="Qty Ordered" class="num">' + fmt(x.qty) + "</td>" +
          '<td data-label="Sales" class="num">' + money(x.sales) + "</td>" +
          '<td data-label="Share"><div class="share"><div class="share-bar"><span style="width:' + Math.max(2, Math.round(pct)) + '%"></span></div><span class="share-pct">' + pct.toFixed(1) + "%</span></div></td></tr>";
      }).join("");
    }
    $("items-pill").textContent = rows.length === all.length ? plural(all.length, "item") : "Top " + rows.length + " of " + all.length + " items";
    $("items-note").textContent = pr[2] + " · completed orders only · " + fmt(totalQty) + " units sold";
  }
  ["items-category", "items-period", "items-limit"].forEach(function (id) { $(id).addEventListener("change", renderItems); });

  /* ======================================================
     SALES REPORT
     ====================================================== */
  var lastReport = null;
  $("rep-quick").addEventListener("change", function () { applyQuick("rep"); generateReport(true); });
  ["rep-from", "rep-to"].forEach(function (id) {
    $(id).addEventListener("change", function () { $("rep-quick").value = "custom"; $("rep-error").textContent = ""; });
  });
  function generateReport(fromQuick) {
    var from = $("rep-from").value, to = $("rep-to").value;
    var err = checkRange(from, to, 366);
    $("rep-error").textContent = err;
    if (err) { if (!fromQuick) { toast(err, "danger"); } return; }
    var days = (parseKey(to) - parseKey(from)) / 86400000 + 1;
    var done = txBetween(from, to, true);
    var tot = sumTx(done, "all");
    var rows = [];
    var monthly = days > 31;
    if (!monthly) {
      eachDay(from, to, function (k, d) {
        var r = sumTx(dayTx(k).filter(function (t) { return t.status === "Completed"; }), "all");
        rows.push({ label: WEEKDAYS[d.getDay()].slice(0, 3) + ", " + fmtShort(k), orders: r.orders, items: r.items, revenue: r.sales });
      });
    } else {
      var map = {}, ord = [];
      eachDay(from, to, function (k, d) {
        var id = d.getFullYear() * 100 + d.getMonth();
        if (!map[id]) { map[id] = { label: MONTHS[d.getMonth()] + " " + d.getFullYear(), orders: 0, items: 0, revenue: 0 }; ord.push(id); }
        var r = sumTx(dayTx(k).filter(function (t) { return t.status === "Completed"; }), "all");
        map[id].orders += r.orders; map[id].items += r.items; map[id].revenue += r.sales;
      });
      rows = ord.map(function (id) { return map[id]; });
    }
    lastReport = { from: from, to: to, rows: rows, tot: tot, monthly: monthly };
    $("rep-title").textContent = "Sales Report";
    $("rep-meta").textContent = (from === to ? fmtDate(from) : fmtDate(from) + " – " + fmtDate(to)) + " · " + plural(days, "day") + " · generated " + fmtStamp(new Date().toISOString());
    $("rep-revenue").textContent = money(tot.sales);
    $("rep-orders").textContent = fmt(tot.orders);
    $("rep-aov").textContent = money(tot.orders ? tot.sales / tot.orders : 0);
    $("rep-items").textContent = fmt(tot.items);
    $("rep-breakdown-title").textContent = monthly ? "Monthly Breakdown" : "Daily Breakdown";
    $("rep-col-date").textContent = monthly ? "Month" : "Date";
    $("rep-body").innerHTML = rows.map(function (r) {
      var pct = tot.sales ? r.revenue / tot.sales * 100 : 0;
      return '<tr><td data-label="' + (monthly ? "Month" : "Date") + '" class="cell-name">' + esc(r.label) + '</td><td data-label="Orders" class="num">' + fmt(r.orders) + '</td><td data-label="Items Sold" class="num">' + fmt(r.items) +
        '</td><td data-label="Revenue" class="num">' + money(r.revenue) + '</td><td data-label="Share"><div class="share"><div class="share-bar"><span style="width:' + Math.round(pct) + '%"></span></div><span class="share-pct">' + pct.toFixed(1) + "%</span></div></td></tr>";
    }).join("");
    $("rep-foot").innerHTML = "<tr><td>Total</td><td class=\"num\">" + fmt(tot.orders) + '</td><td class="num">' + fmt(tot.items) + '</td><td class="num">' + money(tot.sales) + "</td><td></td></tr>";
    $("rep-note").textContent = "Totals count completed transactions only. Refunded and voided transactions are excluded.";
    if (!fromQuick) { toast("Sales report generated.", "success"); }
  }
  $("rep-generate").addEventListener("click", function () { generateReport(false); });
  $("rep-print").addEventListener("click", function () { window.print(); });
  function download(name, text, type) {
    try {
      var blob = new Blob([text], { type: type });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      return true;
    } catch (e) { return false; }
  }
  $("rep-csv").addEventListener("click", function () {
    if (!lastReport) { toast("Generate a report first.", "warning"); return; }
    var r = lastReport;
    var out = ["UNLTD 199 Samgyupsal Korean Grill House - Sales Report", "Period," + r.from + " to " + r.to, "", (r.monthly ? "Month" : "Date") + ",Orders,Items Sold,Revenue (PHP)"];
    r.rows.forEach(function (x) { out.push('"' + x.label + '",' + x.orders + "," + x.items + "," + x.revenue); });
    out.push("Total," + r.tot.orders + "," + r.tot.items + "," + r.tot.sales);
    if (download("sales-report-" + r.from + "-to-" + r.to + ".csv", out.join("\r\n"), "text/csv")) { toast("CSV downloaded.", "success"); }
    else { toast("Could not download the file.", "danger"); }
  });

  /* ======================================================
     TRANSACTIONS
     ====================================================== */
  var txShown = TX_PAGE, txFiltered = [];
  var STATUS_BADGE = { Completed: "available", Refunded: "warning", Voided: "expired" };
  $("tx-quick").addEventListener("change", function () { applyQuick("tx"); renderTx(true); });
  ["tx-from", "tx-to"].forEach(function (id) { $(id).addEventListener("change", function () { $("tx-quick").value = "custom"; renderTx(true); }); });
  $("tx-status").addEventListener("change", function () { renderTx(true); });
  $("tx-search").addEventListener("input", function () { renderTx(true); });
  function renderTx(reset) {
    if (reset) { txShown = TX_PAGE; }
    var from = $("tx-from").value, to = $("tx-to").value;
    var err = checkRange(from, to, 0);
    $("tx-error").textContent = err;
    if (err) {
      txFiltered = [];
      $("tx-body").innerHTML = '<tr class="table-empty"><td colspan="8">Choose a valid date range.</td></tr>';
      $("tx-pill").textContent = "0 transactions"; $("tx-more").hidden = true;
      return;
    }
    var st = $("tx-status").value, q = $("tx-search").value.trim().toLowerCase();
    var list = txBetween(from, to, false).filter(function (t) {
      if (st !== "all" && t.status !== st) { return false; }
      if (q && t.id.toLowerCase().indexOf(q) < 0 && ("table " + t.table).indexOf(q) < 0) { return false; }
      return true;
    });
    list.sort(function (a, b) { return a.date === b.date ? (b.hour * 60 + b.min) - (a.hour * 60 + a.min) : (a.date < b.date ? 1 : -1); });
    txFiltered = list;
    var rows = list.slice(0, txShown);
    $("tx-body").innerHTML = rows.length ? rows.map(function (t) {
      return '<tr><td data-label="Transaction ID" class="cell-name">' + esc(t.id) + '</td><td data-label="Date">' + fmtDate(t.date) + '</td><td data-label="Time">' + fmtTime(t.hour, t.min) +
        '</td><td data-label="Table">Table ' + t.table + '</td><td data-label="Items" class="num">' + t.items + '</td><td data-label="Amount" class="num">' + money(t.total) +
        '</td><td data-label="Status"><span class="status-badge status-badge--' + STATUS_BADGE[t.status] + '">' + t.status + "</span></td>" +
        '<td data-label="Details"><button type="button" class="button button--outline button--small" data-tx="' + esc(t.id) + '">' + icon("eye") + "View</button></td></tr>";
    }).join("") : '<tr class="table-empty"><td colspan="8">No transactions match your filters.</td></tr>';
    $("tx-pill").textContent = "Showing " + rows.length + " of " + plural(list.length, "transaction");
    $("tx-more").hidden = list.length <= rows.length;
  }
  $("tx-more").addEventListener("click", function () { txShown += TX_PAGE; renderTx(false); });
  $("tx-body").addEventListener("click", function (e) {
    var b = e.target.closest("[data-tx]"); if (!b) { return; }
    var t = txFiltered.filter(function (x) { return x.id === b.getAttribute("data-tx"); })[0];
    if (t) { openTxn(t); }
  });
  function openTxn(t) {
    $("txd-id").textContent = t.id;
    $("txd-when").textContent = fmtDate(t.date) + " · " + fmtTime(t.hour, t.min);
    var sb = $("txd-status"); sb.textContent = t.status; sb.className = "status-badge status-badge--" + STATUS_BADGE[t.status];
    $("txd-table").textContent = "Table " + t.table;
    $("txd-pax").textContent = plural(t.pax, "customer");
    $("txd-pay").textContent = t.pay;
    $("txd-cashier").textContent = t.cashier;
    $("txd-lines").innerHTML = t.lines.map(function (l) {
      return '<div class="receipt-row"><span>' + esc(l.name) + "</span><span>" + l.qty + "</span><span>" + money(l.price) + "</span><span>" + money(l.price * l.qty) + "</span></div>";
    }).join("");
    $("txd-total").textContent = money(t.total);
    var note = $("txd-note");
    note.hidden = t.status === "Completed";
    note.textContent = t.status === "Refunded" ? "This transaction was refunded and is not counted in sales." : "This transaction was voided and is not counted in sales.";
    openModal("modal-txn");
  }

  /* ======================================================
     MENU MANAGEMENT (every add / change / delete is confirmed)
     ====================================================== */
  var MENU_CATS = ["Unli 199", "Drinks", "Meat", "Sauces", "Sides"];
  var UNAVAILABLE_SEED = { "Cookies & Cream": true };
  var UNITS = ["pcs", "kg", "g", "L", "mL", "packs", "bottles", "cans", "cases", "sacks", "tubs", "servings"];
  var MENU_UNIT_SEED = {
    "Unli 199": "servings", "Iced Tea": "bottles", "Soda": "cases", "Lemonade": "bottles", "Bottled Water": "cases", "Beer": "bottles", "Soju": "bottles",
    "Ssamjang": "tubs", "Gochujang": "tubs", "Sesame Oil Dip": "tubs", "Cheese Dip": "tubs",
    "Vanilla Ice Cream": "tubs", "Chocolate Ice Cream": "tubs", "Ube Ice Cream": "tubs", "Mango Ice Cream": "tubs", "Cookies & Cream": "tubs"
  };
  var MENU_UNIT_DEFAULT = { "Unli 199": "servings", "Drinks": "bottles", "Meat": "kg", "Sauces": "tubs", "Sides": "pcs" };
  function normalizeMenu(a) { a.forEach(function (m) { if (UNITS.indexOf(m.unit) < 0) { m.unit = MENU_UNIT_SEED[m.name] || MENU_UNIT_DEFAULT[m.cat] || "pcs"; } }); return a; }
  function validMenu(a) {
    return Array.isArray(a) && a.every(function (m) {
      return m && Number.isInteger(m.id) && m.id > 0 && typeof m.name === "string" && m.name.length > 0 && m.name.length <= 40 &&
        MENU_CATS.indexOf(m.cat) >= 0 && Number.isInteger(m.price) && m.price >= 1 && m.price <= 9999 && typeof m.available === "boolean";
    });
  }
  function seedMenu() {
    return MENU.map(function (m, i) { return { id: i + 1, name: m[0], cat: m[1], unit: MENU_UNIT_SEED[m[0]] || "pcs", price: m[2], available: !UNAVAILABLE_SEED[m[0]] }; });
  }
  var menu = loadJSON(MENU_KEY);
  if (!validMenu(menu) || !menu.length) { menu = seedMenu(); save(MENU_KEY, menu); } else { normalizeMenu(menu); }
  var menuEditingId = null, menuPending = null, menuDeleteId = null;
  function menuItem(id) { return menu.filter(function (m) { return m.id === id; })[0]; }
  function statusLabel(a) { return a ? "Available" : "Unavailable"; }

  function renderMenu() {
    var q = $("menu-search").value.trim().toLowerCase(), cat = $("menu-category").value, st = $("menu-status").value;
    var list = menu.filter(function (m) {
      if (cat !== "all" && m.cat !== cat) { return false; }
      if (st === "available" && !m.available) { return false; }
      if (st === "unavailable" && m.available) { return false; }
      return !q || m.name.toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) { return MENU_CATS.indexOf(a.cat) - MENU_CATS.indexOf(b.cat) || a.name.localeCompare(b.name); });
    $("menu-total").textContent = menu.length;
    $("menu-avail").textContent = menu.filter(function (m) { return m.available; }).length;
    $("menu-unavail").textContent = menu.filter(function (m) { return !m.available; }).length;
    $("menu-body").innerHTML = list.length ? list.map(function (m) {
      return '<tr><td data-label="Item Name" class="cell-name">' + esc(m.name) + '</td><td data-label="Category"><span class="chip">' + esc(m.cat) + "</span></td>" +
        '<td data-label="Unit">' + esc(m.unit) + "</td>" +
        '<td data-label="Price" class="num">' + money(m.price) + '</td><td data-label="Status"><span class="status-badge status-badge--' + (m.available ? "available" : "expired") + '">' + statusLabel(m.available) + "</span></td>" +
        '<td data-label="Actions"><div class="cell-actions"><button type="button" class="button button--outline button--small" data-medit="' + m.id + '">' + icon("edit") + "Edit</button>" +
        '<button type="button" class="button button--danger button--small" data-mdel="' + m.id + '">' + icon("trash") + "Delete</button></div></td></tr>";
    }).join("") : '<tr class="table-empty"><td colspan="6">No menu items match your filters.</td></tr>';
    $("menu-pill").textContent = list.length === menu.length ? plural(menu.length, "item") : "Showing " + list.length + " of " + plural(menu.length, "item");
  }
  ["menu-category", "menu-status"].forEach(function (id) { $(id).addEventListener("change", renderMenu); });
  $("menu-search").addEventListener("input", renderMenu);

  function setMenuErr(field, msg) {
    var w = $("modal-menu-form").querySelector('[data-field="' + field + '"]');
    w.classList.toggle("field--invalid", !!msg);
    w.querySelector(".field-error").textContent = msg || "";
  }
  var MENU_FIELDS = ["name", "category", "unit", "price", "status"];
  function openMenuForm(item) {
    menuEditingId = item ? item.id : null;
    $("mf-title").textContent = item ? "Edit Menu Item" : "Add Menu Item";
    $("mf-submit-text").textContent = item ? "Save Changes" : "Add Item";
    $("mf-name").value = item ? item.name : "";
    $("mf-category").value = item ? item.cat : "";
    $("mf-unit").value = item ? item.unit : "";
    $("mf-price").value = item ? String(item.price) : "";
    $("mf-status").value = item ? (item.available ? "available" : "unavailable") : "available";
    MENU_FIELDS.forEach(function (f) { setMenuErr(f); });
    openModal("modal-menu-form");
    setTimeout(function () { try { $("mf-name").focus(); } catch (e) { /* ignore */ } }, 30);
  }
  $("menu-add-btn").addEventListener("click", function () { openMenuForm(null); });
  $("menu-body").addEventListener("click", function (e) {
    var ed = e.target.closest("[data-medit]"), del = e.target.closest("[data-mdel]");
    if (ed) { var it = menuItem(parseInt(ed.getAttribute("data-medit"), 10)); if (it) { openMenuForm(it); } }
    else if (del) {
      var d = menuItem(parseInt(del.getAttribute("data-mdel"), 10)); if (!d) { return; }
      $("md-name").textContent = d.name; $("md-category").textContent = d.cat; $("md-unit").textContent = d.unit; $("md-price").textContent = money(d.price); $("md-status").textContent = statusLabel(d.available);
      openModal("modal-menu-delete");
      menuDeleteId = d.id; // set after openModal
    }
  });
  $("mf-price").addEventListener("input", function () {
    var c = this.value.replace(/\D/g, "").slice(0, 4);
    if (c !== this.value) { this.value = c; }
  });
  $("modal-menu-form").addEventListener("input", function (e) {
    var w = e.target.closest("[data-field]"); if (w) { setMenuErr(w.getAttribute("data-field")); }
  });
  $("modal-menu-form").addEventListener("change", function (e) {
    var w = e.target.closest("[data-field]"); if (w) { setMenuErr(w.getAttribute("data-field")); }
  });
  $("modal-menu-form").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.tagName !== "SELECT") { e.preventDefault(); $("mf-submit").click(); }
  });

  $("mf-submit").addEventListener("click", function () {
    var v = {
      name: $("mf-name").value.replace(/\s+/g, " ").trim(), cat: $("mf-category").value, unit: $("mf-unit").value,
      priceRaw: $("mf-price").value.trim(), available: $("mf-status").value === "available"
    };
    var ok = true;
    function fail(f, m) { setMenuErr(f, m); ok = false; }
    MENU_FIELDS.forEach(function (f) { setMenuErr(f); });
    if (v.name.length < 2) { fail("name", "Enter the item name (at least 2 characters)."); }
    else if (menu.some(function (m) { return m.id !== menuEditingId && m.name.toLowerCase() === v.name.toLowerCase(); })) { fail("name", "A menu item with this name already exists."); }
    if (MENU_CATS.indexOf(v.cat) < 0) { fail("category", "Please select a category."); }
    if (UNITS.indexOf(v.unit) < 0) { fail("unit", "Please select the unit of measurement."); }
    var price = parseInt(v.priceRaw, 10);
    if (!v.priceRaw) { fail("price", "Enter the price."); }
    else if (!(price >= 1 && price <= 9999)) { fail("price", "Price must be from \u20B11 to \u20B19,999."); }
    if (!ok) { return; }
    v.price = price;

    if (menuEditingId === null) {
      $("ma-name").textContent = v.name; $("ma-category").textContent = v.cat; $("ma-unit").textContent = v.unit; $("ma-price").textContent = money(v.price); $("ma-status").textContent = statusLabel(v.available);
      openModal("modal-menu-add-confirm");
      menuPending = { mode: "add", v: v };
    } else {
      var old = menuItem(menuEditingId);
      if (!old) { closeModal(); return; }
      var rows = [];
      if (old.name !== v.name) { rows.push(["Item Name", old.name, v.name]); }
      if (old.cat !== v.cat) { rows.push(["Category", old.cat, v.cat]); }
      if (old.unit !== v.unit) { rows.push(["Unit", old.unit, v.unit]); }
      if (old.price !== v.price) { rows.push(["Price", money(old.price), money(v.price)]); }
      if (old.available !== v.available) { rows.push(["Status", statusLabel(old.available), statusLabel(v.available)]); }
      if (!rows.length) { closeModal(); toast("No changes were made.", "info"); return; }
      $("me-name").textContent = old.name;
      $("me-changes").innerHTML = rows.map(function (r) {
        return '<div class="change-row"><span class="change-label">' + r[0] + '</span><span class="change-values"><span class="change-old">' + esc(r[1]) + '</span><span class="change-arrow">' + icon("arrow") + '</span><span class="change-new">' + esc(r[2]) + "</span></span></div>";
      }).join("");
      var id = menuEditingId;
      openModal("modal-menu-edit-confirm");
      menuPending = { mode: "edit", id: id, v: v };
      menuEditingId = id;
    }
  });
  function backToMenuForm() {
    var id = menuEditingId;
    openModal("modal-menu-form");
    menuEditingId = id; menuPending = null;
  }
  $("ma-back").addEventListener("click", backToMenuForm);
  $("me-back").addEventListener("click", backToMenuForm);
  $("ma-yes").addEventListener("click", function () {
    var p = menuPending; if (!p || p.mode !== "add") { closeModal(); return; }
    var id = menu.reduce(function (m, x) { return Math.max(m, x.id); }, 0) + 1;
    menu.push({ id: id, name: p.v.name, cat: p.v.cat, unit: p.v.unit, price: p.v.price, available: p.v.available });
    save(MENU_KEY, menu);
    closeModal(); renderMenu();
    toast(p.v.name + " was added to the menu.", "success");
  });
  $("me-yes").addEventListener("click", function () {
    var p = menuPending; if (!p || p.mode !== "edit") { closeModal(); return; }
    var it = menuItem(p.id); if (!it) { closeModal(); return; }
    it.name = p.v.name; it.cat = p.v.cat; it.unit = p.v.unit; it.price = p.v.price; it.available = p.v.available;
    save(MENU_KEY, menu);
    closeModal(); renderMenu();
    toast("Changes to " + it.name + " were saved.", "success");
  });
  $("md-yes").addEventListener("click", function () {
    var it = menuDeleteId !== null && menuItem(menuDeleteId); if (!it) { closeModal(); return; }
    menu = menu.filter(function (m) { return m.id !== it.id; });
    save(MENU_KEY, menu);
    closeModal(); renderMenu();
    toast(it.name + " was deleted from the menu.", "danger");
  });


  /* ======================================================
     INGREDIENTS (managed here, used by the Inventory Staff)
     ====================================================== */
  var ING_CATS = ["Meat", "Seafood", "Vegetables", "Side Dishes", "Sauces & Condiments", "Rice & Noodles", "Beverages", "Supplies"];
  var ING_SEED = [
    ["Pork Belly", "Meat", "kg"], ["Pork Jowl", "Meat", "kg"], ["Beef Short Rib", "Meat", "kg"], ["Marinated Chicken", "Meat", "kg"],
    ["Shrimp", "Seafood", "kg"], ["Lettuce", "Vegetables", "kg"], ["Perilla Leaves", "Vegetables", "packs"], ["Kimchi", "Side Dishes", "kg"],
    ["Rice (Raw)", "Rice & Noodles", "sacks"], ["Ssamjang", "Sauces & Condiments", "tubs"], ["Sesame Oil", "Sauces & Condiments", "bottles"],
    ["Soda (Assorted)", "Beverages", "cases"], ["Soju", "Beverages", "bottles"], ["Butane Gas Canisters", "Supplies", "cans"], ["Paper Napkins", "Supplies", "packs"]
  ];
  function validIngs(a) {
    return Array.isArray(a) && a.every(function (x) {
      return x && Number.isInteger(x.id) && x.id > 0 && typeof x.name === "string" && x.name.length > 0 && x.name.length <= 40 &&
        ING_CATS.indexOf(x.cat) >= 0 && UNITS.indexOf(x.unit) >= 0;
    });
  }
  var ings = loadJSON(ING_KEY);
  if (!validIngs(ings) || !ings.length) {
    ings = ING_SEED.map(function (r, i) { return { id: i + 1, name: r[0], cat: r[1], unit: r[2] }; });
    save(ING_KEY, ings);
  }
  var ingEditingId = null, ingPending = null, ingDeleteId = null;
  function ingItem(id) { return ings.filter(function (x) { return x.id === id; })[0]; }

  function renderIngs() {
    var q = $("ing-search").value.trim().toLowerCase(), cat = $("ing-category").value;
    var list = ings.filter(function (x) {
      return (cat === "all" || x.cat === cat) && (!q || x.name.toLowerCase().indexOf(q) >= 0);
    }).sort(function (a, b) { return ING_CATS.indexOf(a.cat) - ING_CATS.indexOf(b.cat) || a.name.localeCompare(b.name); });
    $("ing-total").textContent = ings.length;
    $("ing-body").innerHTML = list.length ? list.map(function (x) {
      return '<tr><td data-label="Ingredient Name" class="cell-name">' + esc(x.name) + '</td><td data-label="Category"><span class="chip">' + esc(x.cat) + "</span></td>" +
        '<td data-label="Unit of Measurement">' + esc(x.unit) + "</td>" +
        '<td data-label="Actions"><div class="cell-actions"><button type="button" class="button button--outline button--small" data-iedit="' + x.id + '">' + icon("edit") + "Edit</button>" +
        '<button type="button" class="button button--danger button--small" data-idel="' + x.id + '">' + icon("trash") + "Delete</button></div></td></tr>";
    }).join("") : '<tr class="table-empty"><td colspan="4">No ingredients match your search.</td></tr>';
    $("ing-pill").textContent = list.length === ings.length ? plural(ings.length, "ingredient") : "Showing " + list.length + " of " + plural(ings.length, "ingredient");
  }
  $("ing-search").addEventListener("input", renderIngs);
  $("ing-category").addEventListener("change", renderIngs);

  /* tabs: Menu Items | Ingredients */
  function setMenuTab(t) {
    var ing = t === "ing";
    $("menu-pane").hidden = ing; $("ing-pane").hidden = !ing;
    $("menu-add-btn").hidden = ing; $("ing-add-btn").hidden = !ing;
    document.querySelectorAll("#menu-tabs .segmented-btn").forEach(function (b) { b.classList.toggle("is-active", b.getAttribute("data-mtab") === t); });
    if (ing) { renderIngs(); } else { renderMenu(); }
  }
  document.querySelectorAll("#menu-tabs .segmented-btn").forEach(function (b) {
    b.addEventListener("click", function () { setMenuTab(b.getAttribute("data-mtab")); });
  });

  function setIngErr(field, msg) {
    var w = $("modal-ing-form").querySelector('[data-field="' + field + '"]');
    w.classList.toggle("field--invalid", !!msg);
    w.querySelector(".field-error").textContent = msg || "";
  }
  var ING_FIELDS = ["ingName", "ingCategory", "ingUnit"];
  function openIngForm(item) {
    ingEditingId = item ? item.id : null;
    $("if-title").textContent = item ? "Edit Ingredient" : "Add New Ingredient";
    $("if-submit-text").textContent = item ? "Save Changes" : "Add Ingredient";
    $("if-name").value = item ? item.name : "";
    $("if-category").value = item ? item.cat : "";
    $("if-unit").value = item ? item.unit : "";
    ING_FIELDS.forEach(function (f) { setIngErr(f); });
    openModal("modal-ing-form");
    setTimeout(function () { try { $("if-name").focus(); } catch (e) { /* ignore */ } }, 30);
  }
  $("ing-add-btn").addEventListener("click", function () { openIngForm(null); });
  $("ing-body").addEventListener("click", function (e) {
    var ed = e.target.closest("[data-iedit]"), del = e.target.closest("[data-idel]");
    if (ed) { var it = ingItem(parseInt(ed.getAttribute("data-iedit"), 10)); if (it) { openIngForm(it); } }
    else if (del) {
      var d = ingItem(parseInt(del.getAttribute("data-idel"), 10)); if (!d) { return; }
      $("ig-name").textContent = d.name; $("ig-category").textContent = d.cat; $("ig-unit").textContent = d.unit;
      openModal("modal-ing-delete");
      ingDeleteId = d.id; // set after openModal
    }
  });
  ["input", "change"].forEach(function (ev) {
    $("modal-ing-form").addEventListener(ev, function (e) {
      var w = e.target.closest("[data-field]"); if (w) { setIngErr(w.getAttribute("data-field")); }
    });
  });
  $("modal-ing-form").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.tagName !== "SELECT") { e.preventDefault(); $("if-submit").click(); }
  });

  $("if-submit").addEventListener("click", function () {
    var v = { name: $("if-name").value.replace(/\s+/g, " ").trim(), cat: $("if-category").value, unit: $("if-unit").value };
    var ok = true;
    function fail(f, m) { setIngErr(f, m); ok = false; }
    ING_FIELDS.forEach(function (f) { setIngErr(f); });
    if (v.name.length < 2) { fail("ingName", "Enter the ingredient name (at least 2 characters)."); }
    else if (ings.some(function (x) { return x.id !== ingEditingId && x.name.toLowerCase() === v.name.toLowerCase(); })) { fail("ingName", "An ingredient with this name already exists."); }
    if (ING_CATS.indexOf(v.cat) < 0) { fail("ingCategory", "Please select a category."); }
    if (UNITS.indexOf(v.unit) < 0) { fail("ingUnit", "Please select the unit of measurement."); }
    if (!ok) { return; }
    if (ingEditingId === null) {
      $("ia-name").textContent = v.name; $("ia-category").textContent = v.cat; $("ia-unit").textContent = v.unit;
      openModal("modal-ing-add-confirm");
      ingPending = { mode: "add", v: v };
    } else {
      var old = ingItem(ingEditingId);
      if (!old) { closeModal(); return; }
      var rows = [];
      if (old.name !== v.name) { rows.push(["Ingredient Name", old.name, v.name]); }
      if (old.cat !== v.cat) { rows.push(["Category", old.cat, v.cat]); }
      if (old.unit !== v.unit) { rows.push(["Unit of Measurement", old.unit, v.unit]); }
      if (!rows.length) { closeModal(); toast("No changes were made.", "info"); return; }
      $("ie-name").textContent = old.name;
      $("ie-changes").innerHTML = rows.map(function (r) {
        return '<div class="change-row"><span class="change-label">' + r[0] + '</span><span class="change-values"><span class="change-old">' + esc(r[1]) + '</span><span class="change-arrow">' + icon("arrow") + '</span><span class="change-new">' + esc(r[2]) + "</span></span></div>";
      }).join("");
      var id = ingEditingId;
      openModal("modal-ing-edit-confirm");
      ingPending = { mode: "edit", id: id, v: v };
      ingEditingId = id;
    }
  });
  function backToIngForm() {
    var id = ingEditingId;
    openModal("modal-ing-form");
    ingEditingId = id; ingPending = null;
  }
  $("ia-back").addEventListener("click", backToIngForm);
  $("ie-back").addEventListener("click", backToIngForm);
  $("ia-yes").addEventListener("click", function () {
    var p = ingPending; if (!p || p.mode !== "add") { closeModal(); return; }
    var id = ings.reduce(function (m, x) { return Math.max(m, x.id); }, 0) + 1;
    ings.push({ id: id, name: p.v.name, cat: p.v.cat, unit: p.v.unit });
    save(ING_KEY, ings);
    closeModal(); renderIngs();
    toast(p.v.name + " was added to the ingredients.", "success");
  });
  $("ie-yes").addEventListener("click", function () {
    var p = ingPending; if (!p || p.mode !== "edit") { closeModal(); return; }
    var it = ingItem(p.id); if (!it) { closeModal(); return; }
    it.name = p.v.name; it.cat = p.v.cat; it.unit = p.v.unit;
    save(ING_KEY, ings);
    closeModal(); renderIngs();
    toast("Changes to " + it.name + " were saved.", "success");
  });
  $("ig-yes").addEventListener("click", function () {
    var it = ingDeleteId !== null && ingItem(ingDeleteId); if (!it) { closeModal(); return; }
    ings = ings.filter(function (x) { return x.id !== it.id; });
    save(ING_KEY, ings);
    closeModal(); renderIngs();
    toast(it.name + " was deleted from the ingredients.", "danger");
  });

  /* ======================================================
     TABLE CONFIGURATION
     ====================================================== */
  var DEFAULT_TABLES = [2, 2, 4, 4, 4, 6, 6, 6, 8, 10];
  function validTables(a) {
    return Array.isArray(a) && a.every(function (t) { return t && Number.isInteger(t.id) && t.id > 0 && Number.isInteger(t.seats) && t.seats >= 1 && t.seats <= 20; });
  }
  var tables = loadJSON(TABLES_KEY);
  if (!validTables(tables) || !tables.length) {
    tables = DEFAULT_TABLES.map(function (s, i) { return { id: i + 1, seats: s }; });
    save(TABLES_KEY, tables);
  }
  var pendingDelete = null;
  function renderTables() {
    tables.sort(function (a, b) { return a.id - b.id; });
    $("tbl-total").textContent = tables.length;
    $("tbl-seats-total").textContent = tables.reduce(function (s, t) { return s + t.seats; }, 0);
    $("table-grid").innerHTML = tables.map(function (t) {
      return '<div class="table-card"><span class="table-card-icon">' + icon("table") + '</span><span class="table-card-name">Table ' + t.id +
        '</span><span class="table-card-seats">' + icon("users") + plural(t.seats, "seat") + '</span>' +
        '<button type="button" class="button button--outline button--small" data-del="' + t.id + '">' + icon("trash") + "Delete</button></div>";
    }).join("");
  }
  function setFieldError(msg) {
    var w = document.querySelector('[data-field="tblSeats"]');
    w.classList.toggle("field--invalid", !!msg);
    w.querySelector(".field-error").textContent = msg || "";
  }
  function openAddTable() {
    $("tbl-seats").value = ""; setFieldError("");
    openModal("modal-table-add");
    setTimeout(function () { try { $("tbl-seats").focus(); } catch (e) { /* ignore */ } }, 30);
  }
  $("go-add-table").addEventListener("click", openAddTable);
  $("tbl-seats").addEventListener("input", function () {
    var c = this.value.replace(/\D/g, "").slice(0, 2);
    if (c !== this.value) { this.value = c; }
    setFieldError("");
  });
  $("tbl-seats").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); $("tbl-add-confirm").click(); } });
  $("tbl-add-confirm").addEventListener("click", function () {
    var raw = $("tbl-seats").value.trim();
    if (!raw) { setFieldError("Enter the seating capacity."); return; }
    var n = parseInt(raw, 10);
    if (!(n >= 1 && n <= 20)) { setFieldError("Seating capacity must be from 1 to 20."); return; }
    if (tables.length >= MAX_TABLES) { setFieldError("You can have up to " + MAX_TABLES + " tables."); return; }
    var id = tables.reduce(function (m, t) { return Math.max(m, t.id); }, 0) + 1;
    tables.push({ id: id, seats: n });
    save(TABLES_KEY, tables);
    closeModal(); renderTables();
    toast("Table " + id + " added (" + plural(n, "seat") + ").", "success");
  });
  $("table-grid").addEventListener("click", function (e) {
    var b = e.target.closest("[data-del]"); if (!b) { return; }
    var id = parseInt(b.getAttribute("data-del"), 10);
    var t = tables.filter(function (x) { return x.id === id; })[0];
    if (!t) { return; }
    if (tables.length <= 1) { toast("At least one table must remain.", "warning"); return; }
    openModal("modal-table-delete");
    pendingDelete = id; // set after openModal
    $("td-title").textContent = "Delete Table " + id + "?";
    $("td-text").textContent = "Are you sure? Table " + id + " (" + plural(t.seats, "seat") + ") will be removed. This action cannot be undone.";
  });
  $("tbl-delete-confirm").addEventListener("click", function () {
    if (pendingDelete === null) { closeModal(); return; }
    var id = pendingDelete;
    tables = tables.filter(function (t) { return t.id !== id; });
    save(TABLES_KEY, tables);
    closeModal(); renderTables();
    toast("Table " + id + " deleted.", "success");
  });

  /* ======================================================
     BACKUP & RESTORE
     ====================================================== */
  var settings, backups, pendingRestore = null;
  function validTime(t) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(t || ""); }
  function loadSettings() {
    var s = loadJSON(SETTINGS_KEY);
    if (!s || typeof s !== "object" || !validTime(s.time) || (s.frequency !== "daily" && s.frequency !== "weekly")) {
      s = { enabled: true, frequency: "daily", day: 0, time: "02:00", armedAt: new Date().toISOString(), lastSlot: "" };
    }
    s.enabled = s.enabled !== false;
    s.day = Math.min(6, Math.max(0, parseInt(s.day, 10) || 0));
    if (isNaN(new Date(s.armedAt).getTime())) { s.armedAt = new Date().toISOString(); }
    return s;
  }
  function fileName(d) {
    return "unltd199-backup-" + d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + "-" + p2(d.getHours()) + p2(d.getMinutes()) + p2(d.getSeconds()) + ".json";
  }
  function estimateSize(c) { return Math.round(c.transactions * 0.42 + c.menu * 0.2 + c.tables * 0.1 + 4); }
  function fmtSize(kb) { return kb >= 1024 ? (kb / 1024).toFixed(1) + " MB" : kb + " KB"; }
  function countUpTo(key) {
    var all = 0, done = 0;
    eachDay(earliestKey(), key, function (k) { var l = dayTx(k); all += l.length; l.forEach(function (t) { if (t.status === "Completed") { done++; } }); });
    return { all: all, done: done };
  }
  function makeBackup(type, when, countKey) {
    var c = countUpTo(countKey || dkey(when));
    var contents = { transactions: c.all, orders: c.done, menu: menu.length, tables: tables.length };
    return {
      app: "unltd199-backup", version: 1, id: "b" + when.getTime() + Math.floor(Math.random() * 1000),
      name: fileName(when), type: type, createdAt: when.toISOString(), size: estimateSize(contents),
      contents: contents, tables: JSON.parse(JSON.stringify(tables)), menuItems: JSON.parse(JSON.stringify(menu))
    };
  }
  function seedBackups() {
    var list = [], now = today(), i;
    // earlier automatic backups (every day at 2:00 AM) and one manual backup
    for (i = 1; i <= 3; i++) {
      var d = addDays(now, -i); d.setHours(2, 0, 3 + i, 0);
      list.push(makeBackup("Automatic", d, dkey(addDays(now, -i - 1))));
    }
    var m = addDays(now, -9); m.setHours(16, 42, 10, 0);
    list.push(makeBackup("Manual", m, dkey(addDays(now, -9))));
    return list;
  }
  function validBackup(b) {
    return b && typeof b === "object" && b.app === "unltd199-backup" && b.version === 1 &&
      typeof b.name === "string" && b.name.length > 0 && b.name.length < 120 &&
      !isNaN(new Date(b.createdAt).getTime()) &&
      b.contents && ["transactions", "orders", "menu", "tables"].every(function (k) { return Number.isInteger(b.contents[k]) && b.contents[k] >= 0; }) &&
      validTables(b.tables) && b.tables.length > 0 && b.tables.length <= MAX_TABLES &&
      (b.menuItems === undefined || (validMenu(b.menuItems) && b.menuItems.length > 0));
  }
  function addBackup(b) {
    backups.unshift(b);
    backups.sort(function (a, c) { return new Date(c.createdAt) - new Date(a.createdAt); });
    while (backups.length > MAX_BACKUPS) {
      var idx = -1;
      for (var i = backups.length - 1; i >= 0; i--) { if (backups[i].type === "Automatic") { idx = i; break; } }
      backups.splice(idx < 0 ? backups.length - 1 : idx, 1);
    }
    save(BACKUPS_KEY, backups);
  }
  settings = loadSettings();
  save(SETTINGS_KEY, settings);
  backups = loadJSON(BACKUPS_KEY);
  if (!Array.isArray(backups) || !backups.every(validBackup)) { backups = seedBackups(); save(BACKUPS_KEY, backups); }

  function slotOn(d) { var p = settings.time.split(":"); var x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), +p[0], +p[1], 0, 0); return x; }
  function lastSlot(now) {
    for (var i = 0; i < 8; i++) {
      var d = addDays(now, -i);
      if (settings.frequency === "weekly" && d.getDay() !== settings.day) { continue; }
      var s = slotOn(d);
      if (s <= now) { return s; }
    }
    return null;
  }
  function nextSlot(now) {
    for (var i = 0; i < 9; i++) {
      var d = addDays(now, i);
      if (settings.frequency === "weekly" && d.getDay() !== settings.day) { continue; }
      var s = slotOn(d);
      if (s > now) { return s; }
    }
    return null;
  }
  function lastAuto() {
    return backups.filter(function (b) { return b.type === "Automatic"; })[0] || backups[0];
  }
  function renderBackupMeta() {
    var on = settings.enabled;
    var pill = $("bk-status-pill");
    pill.textContent = on ? "On" : "Off";
    pill.className = "status-badge status-badge--" + (on ? "available" : "expired");
    var nx = on ? nextSlot(new Date()) : null;
    $("bk-next").textContent = nx ? MONTHS[nx.getMonth()] + " " + nx.getDate() + ", " + fmtTime(nx.getHours(), nx.getMinutes()) : (on ? "-" : "Automatic backup is off");
    var lb = lastAuto();
    $("bk-last").textContent = lb ? fmtStamp(lb.createdAt) : "No backup yet";
  }
  function renderBackup() {
    $("bk-enabled").checked = settings.enabled;
    $("bk-frequency").value = settings.frequency;
    $("bk-day").value = String(settings.day);
    $("bk-time").value = settings.time;
    $("bk-day-field").hidden = settings.frequency !== "weekly";
    renderBackupMeta();
    $("bk-count-pill").textContent = plural(backups.length, "backup");
    $("bk-body").innerHTML = backups.length ? backups.map(function (b) {
      var chipCls = b.type === "Automatic" ? "chip chip--ok" : (b.type === "Safety" ? "chip chip--warn" : "chip");
      return '<tr><td data-label="File" class="cell-name">' + esc(b.name) + '</td><td data-label="Type"><span class="' + chipCls + '">' + esc(b.type) + "</span></td>" +
        '<td data-label="Created">' + esc(fmtStamp(b.createdAt)) + '</td><td data-label="Size" class="num">' + fmtSize(b.size || estimateSize(b.contents)) + "</td>" +
        '<td data-label="Contents">' + fmt(b.contents.transactions) + " transactions, " + b.contents.menu + " menu items, " + plural(b.contents.tables, "table") + "</td>" +
        '<td data-label="Actions"><div class="cell-actions"><button type="button" class="button button--primary button--small" data-restore="' + esc(b.id) + '">' + icon("restore") + 'Restore</button>' +
        '<button type="button" class="button button--outline button--small" data-dl="' + esc(b.id) + '">' + icon("download") + "Download</button></div></td></tr>";
    }).join("") : '<tr class="table-empty"><td colspan="6">No backups yet. Press "Back up now" to create one.</td></tr>';
  }
  function saveSettings(rearm) {
    if (rearm) { settings.armedAt = new Date().toISOString(); }
    save(SETTINGS_KEY, settings);
    renderBackupMeta();
  }
  $("bk-enabled").addEventListener("change", function () {
    settings.enabled = this.checked; saveSettings(true);
    toast(settings.enabled ? "Automatic backup turned on." : "Automatic backup turned off.", "success");
  });
  $("bk-frequency").addEventListener("change", function () {
    settings.frequency = this.value === "weekly" ? "weekly" : "daily";
    $("bk-day-field").hidden = settings.frequency !== "weekly";
    saveSettings(true); toast("Backup schedule saved.", "success");
  });
  $("bk-day").addEventListener("change", function () { settings.day = parseInt(this.value, 10) || 0; saveSettings(true); toast("Backup schedule saved.", "success"); });
  $("bk-time").addEventListener("change", function () {
    if (!validTime(this.value)) { this.value = settings.time; toast("Please enter a valid time.", "warning"); return; }
    settings.time = this.value; saveSettings(true); toast("Backup schedule saved.", "success");
  });
  $("bk-now").addEventListener("click", function () {
    var b = makeBackup("Manual", new Date());
    addBackup(b); renderBackup();
    toast("Backup created: " + b.name, "success");
  });
  function checkSchedule() {
    if (!settings.enabled) { return; }
    var now = new Date(), s = lastSlot(now);
    if (!s) { return; }
    if (s > new Date(settings.armedAt) && s.toISOString() !== settings.lastSlot) {
      settings.lastSlot = s.toISOString();
      save(SETTINGS_KEY, settings);
      var b = makeBackup("Automatic", now);
      addBackup(b);
      if (currentView === "backup") { renderBackup(); } else { renderBackupMeta(); }
      toast("Automatic backup completed: " + b.name, "success");
    }
  }
  function findBackup(id) { return backups.filter(function (b) { return b.id === id; })[0]; }
  $("bk-body").addEventListener("click", function (e) {
    var r = e.target.closest("[data-restore]"), d = e.target.closest("[data-dl]");
    if (r) {
      var b = findBackup(r.getAttribute("data-restore")); if (!b) { return; }
      $("rs-name").textContent = b.name;
      $("rs-date").textContent = fmtStamp(b.createdAt);
      $("rs-contents").textContent = fmt(b.contents.transactions) + " transactions, " + b.contents.menu + " menu items, " + plural(b.contents.tables, "table");
      openModal("modal-restore");
      pendingRestore = b.id; // set after openModal
    } else if (d) {
      var f = findBackup(d.getAttribute("data-dl")); if (!f) { return; }
      var copy = { app: f.app, version: f.version, name: f.name, type: f.type, createdAt: f.createdAt, contents: f.contents, tables: f.tables, menuItems: f.menuItems };
      if (download(f.name, JSON.stringify(copy, null, 2), "application/json")) { toast("Downloaded " + f.name, "success"); }
      else { toast("Could not download the file.", "danger"); }
    }
  });
  $("rs-confirm").addEventListener("click", function () {
    var b = findBackup(pendingRestore);
    if (!b) { closeModal(); return; }
    // safety backup of the current state first
    addBackup(makeBackup("Safety", new Date()));
    openModal("modal-restoring");
    locked = true;
    var bar = $("rs-progress"), start = Date.now();
    bar.style.width = "0%";
    var iv = setInterval(function () {
      var pct = Math.min(100, Math.round((Date.now() - start) / RESTORE_MS * 100));
      bar.style.width = pct + "%";
      if (pct >= 100) {
        clearInterval(iv);
        tables = JSON.parse(JSON.stringify(b.tables));
        save(TABLES_KEY, tables);
        if (b.menuItems) { menu = normalizeMenu(JSON.parse(JSON.stringify(b.menuItems))); save(MENU_KEY, menu); }
        locked = false;
        $("rd-text").textContent = "Data was restored from " + b.name + " (" + fmtStamp(b.createdAt) + "). Table configuration now has " + plural(tables.length, "table") + (b.menuItems ? " and the menu has " + plural(menu.length, "item") : "") +
          ". A safety backup of your previous data was saved.";
        openModal("modal-restore-done");
        pendingRestore = null;
        renderBackup();
        toast("Restore complete.", "success");
      }
    }, 80);
  });

  $("bk-import-btn").addEventListener("click", function () { $("bk-import").click(); });
  $("bk-import").addEventListener("change", function () {
    var file = this.files && this.files[0];
    var input = this;
    if (!file) { return; }
    if (file.size > 2 * 1024 * 1024) { toast("That file is too large to be a backup.", "danger"); input.value = ""; return; }
    var rd = new FileReader();
    rd.onload = function () {
      var obj = null;
      try { obj = JSON.parse(rd.result); } catch (e) { obj = null; }
      if (!validBackup(obj)) { toast("Invalid backup file. Please select a backup downloaded from this system.", "danger"); input.value = ""; return; }
      var dup = backups.some(function (b) { return b.name === obj.name && b.createdAt === obj.createdAt; });
      if (dup) { toast("That backup is already in the list.", "warning"); input.value = ""; return; }
      addBackup({
        app: obj.app, version: 1, id: "b" + Date.now() + Math.floor(Math.random() * 1000), name: obj.name, type: "Imported",
        createdAt: new Date(obj.createdAt).toISOString(), size: estimateSize(obj.contents), contents: obj.contents, tables: obj.tables, menuItems: obj.menuItems
      });
      renderBackup();
      toast("Backup file added. Press Restore to use it.", "success");
      input.value = "";
    };
    rd.onerror = function () { toast("Could not read that file.", "danger"); input.value = ""; };
    rd.readAsText(file);
  });

  /* ---------- log out ---------- */
  $("logout-button").addEventListener("click", function () { closeDrawer(); openModal("modal-logout"); });
  $("logout-yes").addEventListener("click", function () {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    // reset demo data: next login starts again from the demo setup
    try { ALL_KEYS.forEach(function (k) { localStorage.removeItem(k); }); } catch (e) { /* ignore */ }
    window.location.replace("login.html");
  });

  /* ---------- init ---------- */
  setLimits(["peak-from", "peak-to", "rep-from", "rep-to", "tx-from", "tx-to"]);
  applyQuick("peak"); applyQuick("rep"); applyQuick("tx");
  tickClock();
  setInterval(function () { tickClock(); checkSchedule(); if (currentView === "backup") { renderBackupMeta(); } }, 1000);
  renderSales();
  generateReport(true);
})();