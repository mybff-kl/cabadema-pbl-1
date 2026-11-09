// Refreshing the page resets the demo data (the login session is kept).
(function () {
  try {
  var navEntry = performance.getEntriesByType("navigation")[0];
  if (navEntry && navEntry.type === "reload") { ["fdDemoQueue", "fdDemoTables", "fdDemoNotice", "kioskLastIssued", "kioskNowServing"].forEach(function (k) { localStorage.removeItem(k); }); }
  } catch (e) { /* ignore */ }
})();

/* =====================================================
   UNLTD 199 - Front Desk Logic Script
   ===================================================== */
var FD = { 
  sessionMinutes: 120, 
  warningMinutes: 10, 
  queuePrefix: "", 
  minutesPerGroup: 5, 
  loginPage: "login.html", 
  tableCount: 10 
};

var FD_KEYS = { 
  queue: "fdDemoQueue", 
  tables: "fdDemoTables", 
  notice: "fdDemoNotice", 
  session: "fdLoggedIn" 
};

var KIOSK_KEYS = { 
  lastIssued: "kioskLastIssued", 
  nowServing: "kioskNowServing" 
};

var VIEW_TITLES = { 
  dashboard: "Dashboard", 
  queues: "Queue and Tables", 
  timers: "Time Table Status" 
};

var ui = { 
  view: "dashboard", 
  selectedQueue: null, 
  selectedTables: [], 
  payMode: "together", 
  openModal: null, 
  confirmAction: null, 
  alertQueue: [] 
};

function getQueue() { 
  var list = loadJson(FD_KEYS.queue, null); 
  return Array.isArray(list) ? list : []; 
}
function saveQueue(list) { saveJson(FD_KEYS.queue, list); }

function getTables() { 
  var list = loadJson(FD_KEYS.tables, null); 
  return Array.isArray(list) ? list : []; 
}
function saveTables(list) { saveJson(FD_KEYS.tables, list); }

function formatQueueNumber(number) { 
  var text = String(number); 
  while (text.length < 3) text = "0" + text; 
  return FD.queuePrefix + text; 
}
function formatTableName(id) { return "Table " + id; }
function minutesFromNow(minutes) { return Date.now() + minutes * 60 * 1000; }

// Seats per table: uses the Owner's table configuration when it exists, otherwise a default layout.
var DEFAULT_SEATS = [2, 2, 4, 4, 4, 6, 6, 6, 8, 10];
function getSeats(id) {
  var owner = loadJson("unltdOwnerTables", null);
  if (Array.isArray(owner)) {
    var hit = owner.filter(function (t) { return t && t.id === id; })[0];
    if (hit && hit.seats > 0) return hit.seats;
  }
  return DEFAULT_SEATS[id - 1] || 4;
}

function makeTable(id, status, pax, minutesLeft, queueNumber) {
  var table = { id: id, status: status, pax: 0, startedAt: 0, endsAt: 0, queueNumber: null, warned: false, expiredNotified: false, alerted: false, groupId: null, groupTables: [], payMode: "together" };
  if (status === "occupied") {
    table.pax = pax;
    table.endsAt = minutesFromNow(minutesLeft);
    table.startedAt = table.endsAt - FD.sessionMinutes * 60 * 1000;
    table.queueNumber = queueNumber || null;
  }
  if (status === "billing") table.pax = pax;
  return table;
}

function createSampleTables() {
  return [
    makeTable(1, "occupied", 5, 110, 1),
    makeTable(2, "occupied", 4, 40, 2),
    makeTable(3, "occupied", 4, 9.27, null),
    makeTable(4, "occupied", 3, -2, null),
    makeTable(5, "billing", 6),
    makeTable(6, "available"),
    makeTable(7, "available"),
    makeTable(8, "available"),
    makeTable(9, "available"),
    makeTable(10, "available")
  ];
}

function createSampleQueue() {
  var now = Date.now();
  return [
    { number: 1, pax: 2, createdAt: now - 18 * 60000 },
    { number: 2, pax: 4, createdAt: now - 12 * 60000 },
    { number: 3, pax: 6, createdAt: now - 7 * 60000 },
    { number: 4, pax: 3, createdAt: now - 2 * 60000 }
  ];
}

function setUpSampleData() {
  var existingTables = loadJson(FD_KEYS.tables, null);
  if (!existingTables || existingTables.length === 0) {
    saveTables(createSampleTables());
  }
  var existingQueue = loadJson(FD_KEYS.queue, null);
  if (!existingQueue || existingQueue.length === 0) {
    saveQueue(createSampleQueue());
  }
}

function getSecondsLeft(table) { return Math.floor((table.endsAt - Date.now()) / 1000); }
function getTableState(table) {
  if (table.status !== "occupied") return table.status;
  var left = getSecondsLeft(table);
  if (left <= 0) return "expired";
  if (left <= FD.warningMinutes * 60) return "warning";
  return "ok";
}

function formatCountdown(table) {
  var left = getSecondsLeft(table);
  if (left > 0) return formatClock(left);
  return "-" + formatClock(Math.abs(left));
}

function formatWaiting(createdAt) {
  var minutes = Math.max(0, Math.floor((Date.now() - createdAt) / 60000));
  return minutes < 1 ? "Just now" : minutes + " min";
}

function stateLabel(state) {
  var labels = { ok: "On time", warning: "Almost out of time", expired: "Time is up", available: "Available", billing: "Billing" };
  return labels[state] || state;
}

function progressPercent(table) {
  var total = table.endsAt - table.startedAt;
  if (!total || total <= 0) return 0;
  var pct = ((Date.now() - table.startedAt) / total) * 100;
  return Math.min(100, Math.max(0, pct));
}

function icon(name) { return '<svg class="icon"><use href="#icon-' + name + '"></use></svg>'; }

function emptyState(iconName, text) {
  var box = createElement("div", "empty-state");
  box.innerHTML = '<span class="empty-icon">' + icon(iconName) + '</span><p>' + text + '</p>';
  return box;
}

// Live clock
function initClock() {
  var clockEl = byId("topbar-clock");
  if (!clockEl) return;
  function update() {
    var now = new Date();
    clockEl.textContent = now.toLocaleTimeString();
  }
  update();
  setInterval(update, 1000);
}

function sendNotification(message, tableId) {
  if (tableId) saveJson(FD_KEYS.notice, { table: tableId, message: message, at: Date.now() });
}

var TOAST_ICONS = { success: "check", warning: "alert", danger: "alert", info: "info" };

function notify(message, type, duration) {
  var stack = byId("toast-stack");
  if (!stack) return;
  type = type || "info";
  var item = createElement("div", "toast toast--" + type);
  item.setAttribute("role", type === "danger" ? "alert" : "status");

  var iconBox = createElement("span", "toast-icon");
  iconBox.innerHTML = icon(TOAST_ICONS[type] || "info");

  var close = createElement("button", "toast-close");
  close.type = "button";
  close.setAttribute("aria-label", "Dismiss");
  close.innerHTML = icon("close");

  item.appendChild(iconBox);
  item.appendChild(createElement("p", "toast-text", message));
  item.appendChild(close);

  function dismiss() {
    if (!item.parentNode) return;
    item.classList.add("toast--leaving");
    setTimeout(function () { if (item.parentNode) item.parentNode.removeChild(item); }, 200);
  }
  close.addEventListener("click", dismiss);
  stack.insertBefore(item, stack.firstChild);
  while (stack.children.length > 4) stack.removeChild(stack.lastChild);
  var ms = duration || 4000;
  item._deadline = Date.now() + ms;
  setTimeout(dismiss, ms);
}

// Browsers delay timers in background tabs, so clear any toast that is already past its time when the tab is shown again.
document.addEventListener("visibilitychange", function () {
  if (document.hidden) return;
  var stack = byId("toast-stack"); if (!stack) return;
  Array.prototype.slice.call(stack.children).forEach(function (el) {
    if (el._deadline && el._deadline <= Date.now() && el.parentNode) el.parentNode.removeChild(el);
  });
});

function findQueueEntry(number) { return getQueue().filter(function (entry) { return entry.number === number; })[0] || null; }
function findTable(id) { return getTables().filter(function (table) { return table.id === id; })[0] || null; }
function getAvailableTables() { return getTables().filter(function (table) { return table.status === "available"; }); }

function groupOf(table) {
  var ids = table.groupTables && table.groupTables.length > 1 ? table.groupTables : [table.id];
  return ids.map(findTable).filter(Boolean);
}
function joinNames(ids) {
  var names = ids.map(formatTableName);
  return names.length < 2 ? names.join("") : names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
}

// Seat the group on one or more tables. payMode: "together" (one bill) or "separate" (one bill per table).
function assignTables(queueNumber, tableIds, payMode) {
  var entry = findQueueEntry(queueNumber);
  var tables = getTables();
  var chosen = tableIds.map(function (id) { return tables.filter(function (t) { return t.id === id; })[0]; });
  if (!entry || !chosen.length || chosen.some(function (t) { return !t || t.status !== "available"; })) { notify("One of those tables is not available any more.", "warning"); return false; }

  var now = Date.now(), remaining = entry.pax;
  var mode = "together";
  chosen.forEach(function (table, i) {
    var give = Math.ceil(remaining / (chosen.length - i));
    remaining -= give;
    table.status = "occupied";
    table.pax = give;
    table.queueNumber = entry.number;
    table.groupId = entry.number;
    table.groupTables = tableIds.slice();
    table.payMode = mode;
    table.startedAt = now;
    table.endsAt = now + FD.sessionMinutes * 60 * 1000;
    table.warned = false; table.expiredNotified = false; table.alerted = false;
  });
  saveTables(tables);

  saveQueue(getQueue().filter(function (item) { return item.number !== queueNumber; }));
  saveValue(KIOSK_KEYS.nowServing, queueNumber);

  var where = joinNames(tableIds);
  sendNotification(formatQueueNumber(queueNumber) + " notified: your table is ready. Please go to " + where + ".", tableIds[0]);
  notify(formatQueueNumber(queueNumber) + " is seated at " + where + ". Customer notified.", "success");
  return true;
}

function removeFromQueue(queueNumber) {
  saveQueue(getQueue().filter(function (item) { return item.number !== queueNumber; }));
  notify(formatQueueNumber(queueNumber) + " was removed from the queue.");
}

function notifyTable(tableId, kind, quiet) {
  var table = findTable(tableId);
  if (!table) return;
  var members = groupOf(table);
  var ids = members.map(function (t) { return t.id; });
  var label = joinNames(ids);
  var message = kind === "expired" 
    ? label + ": your dining time is over. Please settle the bill. Thank you!"
    : label + ": about " + Math.max(1, Math.ceil(getSecondsLeft(table) / 60)) + " minutes left.";
  sendNotification(message, ids[0]);
  if (!quiet) notify(label + (ids.length > 1 ? " were" : " was") + " notified.", "success");
}

// Tables become available again automatically when the Cashier confirms payment
// (the Cashier portal updates the shared table data). There is no manual billing/clear button.

function renderAll() { renderDashboard(); renderQueues(); renderTimers(); }

function renderDashboard() {
  var tables = getTables();
  var queue = getQueue();
  var counts = { available: 0, occupied: 0, warning: 0, expired: 0 };

  tables.forEach(function (table) {
    var state = getTableState(table);
    if (state === "available") counts.available++; else counts.occupied++;
    if (state === "warning") counts.warning++;
    if (state === "expired") counts.expired++;
  });

  byId("stat-waiting").textContent = queue.length;
  byId("stat-available").textContent = counts.available;
  byId("stat-occupied").textContent = counts.occupied;
  byId("stat-warning").textContent = counts.warning;
  byId("stat-expired").textContent = counts.expired;

  var queueBox = byId("dashboard-queue");
  queueBox.innerHTML = "";
  if (queue.length === 0) queueBox.appendChild(emptyState("users", "Nobody is waiting."));
  queue.slice(0, 4).forEach(function (entry) {
    var row = createElement("button", "row-item");
    row.type = "button";
    row.innerHTML =
      '<span class="row-icon">' + icon("users") + '</span>' +
      '<span class="row-main">' + formatQueueNumber(entry.number) + '</span>' +
      '<span class="row-sub">' + entry.pax + ' pax</span>' +
      '<span class="row-wait">' + icon("clock") + formatWaiting(entry.createdAt) + '</span>';
    row.addEventListener("click", function () { openQueueInfo(entry.number); });
    queueBox.appendChild(row);
  });

  var attentionBox = byId("dashboard-attention");
  attentionBox.innerHTML = "";
  var attention = tables.filter(function (table) { var state = getTableState(table); return state === "warning" || state === "expired"; });
  if (attention.length === 0) attentionBox.appendChild(emptyState("check", "All tables are within their time limit."));
  attention.forEach(function (table) {
    var state = getTableState(table);
    var row = createElement("button", "row-item row-item--" + state);
    row.type = "button";
    row.innerHTML =
      '<span class="row-icon">' + icon(state === "expired" ? "alert" : "hourglass") + '</span>' +
      '<span class="row-main">' + formatTableName(table.id) + '</span>' +
      '<span class="row-sub">' + stateLabel(state) + '</span>' +
      '<span class="row-time" data-countdown="' + table.id + '">' + formatCountdown(table) + '</span>';
    row.addEventListener("click", function () { showView("timers"); });
    attentionBox.appendChild(row);
  });
}

function renderQueues() {
  var queue = getQueue(); var tables = getTables();
  byId("queue-count-pill").textContent = queue.length + " waiting";
  byId("table-count-pill").textContent = getAvailableTables().length + " available";

  var grid = byId("queue-grid");
  grid.innerHTML = "";
  if (queue.length === 0) grid.appendChild(emptyState("users", "The queue is empty."));
  queue.forEach(function (entry) {
    var card = createElement("button", "queue-card");
    card.type = "button";
    card.innerHTML =
      '<span class="queue-card-number">' + formatQueueNumber(entry.number) + '</span>' +
      '<span class="queue-card-pax">' + icon("users") + entry.pax + ' pax</span>' +
      '<span class="queue-card-wait">' + icon("clock") + formatWaiting(entry.createdAt) + '</span>';
    card.addEventListener("click", function () { openQueueInfo(entry.number); });
    grid.appendChild(card);
  });

  var tableGrid = byId("table-grid");
  tableGrid.innerHTML = "";
  tables.forEach(function (table) {
    var state = getTableState(table);
    var cssState = state === "available" ? "available" : state === "billing" ? "billing" : "occupied";
    var info = table.status === "available" ? "Available" : table.status === "billing" ? "Billing" : table.pax + " pax";
    var tile = createElement("div", "table-tile table-tile--" + cssState);
    if (table.groupTables && table.groupTables.length > 1) tile.title = "Group " + formatQueueNumber(table.groupId) + " with " + joinNames(table.groupTables);
    tile.innerHTML = icon("table") + '<span class="table-tile-name">T-' + padTwoDigits(table.id) + '</span><span class="table-tile-info">' + info + '</span>';
    tableGrid.appendChild(tile);
  });
}

function renderTimers() {
  var grid = byId("timer-grid"); grid.innerHTML = "";
  getTables().forEach(function (table) {
    var state = getTableState(table);
    var card = createElement("article", "timer-card timer-card--" + state);
    card.setAttribute("data-table", table.id);

    var iconName = state === "billing" ? "receipt" : state === "expired" ? "alert" : state === "warning" ? "hourglass" : "table";
    var head = '<div class="timer-head"><span class="timer-icon">' + icon(iconName) + '</span><h3 class="timer-name">' + formatTableName(table.id) + '</h3><span class="status-badge status-badge--' + state + '">' + stateLabel(state) + '</span></div>';

    var body;
    if (state === "available") {
      body = '<p class="timer-empty">' + icon("check") + 'Ready for guests</p>';
    } else if (state === "billing") {
      body = '<p class="timer-empty">' + icon("users") + table.pax + ' pax &middot; waiting for the cashier</p>';
    } else {
      body =
        '<p class="timer-digits" data-countdown="' + table.id + '">' + formatCountdown(table) + '</p>' +
        '<p class="timer-meta"><span>' + icon("users") + table.pax + ' pax</span><span>' + icon("clock") + 'ends ' + formatTimeOfDay(table.endsAt) + '</span></p>' + groupLine(table) +
        '<div class="timer-bar"><span data-progress="' + table.id + '" style="width:' + progressPercent(table).toFixed(1) + '%"></span></div>';
    }

    card.innerHTML = head + body + '<div class="timer-actions"></div>';
    var actions = card.querySelector(".timer-actions");

    if (state === "ok" || state === "warning" || state === "expired") {
      actions.appendChild(makeButton("Notify", "send", "button--outline button--small", function () { notifyTable(table.id, state === "expired" ? "expired" : "warning"); }));
    }
    grid.appendChild(card);
  });
}

function groupLine(table) {
  if (!table.groupTables || table.groupTables.length < 2) return "";
  var others = table.groupTables.filter(function (id) { return id !== table.id; }).map(function (id) { return "T-" + padTwoDigits(id); }).join(", ");
  return '<p class="timer-group">' + icon("users") + "Group " + formatQueueNumber(table.groupId) + " &middot; with " + others + "</p>";
}

function makeButton(label, iconName, classes, onClick) {
  var button = createElement("button", "button " + classes);
  button.type = "button"; button.innerHTML = icon(iconName) + label;
  button.addEventListener("click", onClick);
  return button;
}

function updateCountdowns() {
  var tables = getTables();
  document.querySelectorAll("[data-countdown]").forEach(function (element) {
    var id = parseInt(element.getAttribute("data-countdown"), 10);
    var table = tables.filter(function (t) { return t.id === id; })[0];
    if (table) element.textContent = formatCountdown(table);
  });
  document.querySelectorAll("[data-progress]").forEach(function (element) {
    var id = parseInt(element.getAttribute("data-progress"), 10);
    var table = tables.filter(function (t) { return t.id === id; })[0];
    if (table) element.style.width = progressPercent(table).toFixed(1) + "%";
  });
}

function showView(name) {
  ui.view = name;
  Object.keys(VIEW_TITLES).forEach(function (key) {
    var el = byId("view-" + key);
    if (el) el.hidden = key !== name;
  });
  document.querySelectorAll(".drawer-item[data-view]").forEach(function (item) {
    item.classList.toggle("drawer-item--active", item.getAttribute("data-view") === name);
  });
  closeDrawer(); 
  window.scrollTo(0, 0);
}

function checkTimeLimits() {
  var tables = getTables(); var changed = false;
  tables.forEach(function (table) {
    if (table.status !== "occupied") return;
    var state = getTableState(table);
    var lead = !(table.groupTables && table.groupTables.length > 1) || table.groupTables[0] === table.id; // one alert per group
    if ((state === "warning" || state === "expired") && !table.warned) {
      table.warned = true; changed = true; if (lead) notifyTable(table.id, "warning", true);
      if (state === "warning" && lead) ui.alertQueue.push({ table: table.id, kind: "warning" });
    }
    if (state === "expired" && !table.expiredNotified) {
      table.expiredNotified = true; changed = true; if (lead) notifyTable(table.id, "expired", true);
      if (lead) ui.alertQueue.push({ table: table.id, kind: "expired" });
    }
  });
  if (changed) saveTables(tables);
  return changed;
}

function tick() {
  var changed = checkTimeLimits(); var tables = getTables();
  var signature = tables.map(function (t) { return t.id + getTableState(t) + (t.groupId || "") + (t.payMode || ""); }).join("|");
  // Also refresh every minute (waiting times) and when the queue changes (e.g. a new number from the kiosk).
  signature += "#" + Math.floor(Date.now() / 60000) + "#" + getQueue().map(function (q) { return q.number; }).join(",");
  if (changed || signature !== tick.lastSignature) {
    tick.lastSignature = signature; renderAll();
    if (ui.openModal === "modal-queue-info") { var entry = findQueueEntry(ui.selectedQueue); if (entry) byId("queue-info-waiting").textContent = formatWaiting(entry.createdAt); }
  }
  updateCountdowns(); showNextTimeAlert();
}
tick.lastSignature = "";

function openModal(id) {
  document.querySelectorAll(".modal-overlay .modal").forEach(function (modal) { modal.hidden = modal.id !== id; });
  byId("modal-overlay").hidden = false; ui.openModal = id;
}
function closeModal() { byId("modal-overlay").hidden = true; ui.openModal = null; }

function openQueueInfo(number) {
  var entry = findQueueEntry(number); if (!entry) return;
  var position = getQueue().map(function (item) { return item.number; }).indexOf(number) + 1;
  ui.selectedQueue = number;
  byId("queue-info-title").textContent = formatQueueNumber(number);
  byId("queue-info-pax").textContent = entry.pax + (entry.pax === 1 ? " person" : " people");
  byId("queue-info-joined").textContent = formatTimeOfDay(entry.createdAt);
  byId("queue-info-waiting").textContent = formatWaiting(entry.createdAt);
  byId("queue-info-position").textContent = "#" + position + " in line";
  openModal("modal-queue-info");
}

function assignProblem(entry) {
  if (!ui.selectedTables.length) return { ok: false, text: "Tap one or more available tables. Join tables for a bigger group." };
  return { ok: true, text: "Good to go." };
}

function updateAssignSummary() {
  var entry = findQueueEntry(ui.selectedQueue); if (!entry) return;
  var ids = ui.selectedTables;
  var problem = assignProblem(entry);
  var names = ids.length ? ids.map(function (id) { return "T-" + padTwoDigits(id); }).join(" + ") : "None";
  var box = byId("assign-summary");
  box.className = "assign-summary" + (problem.ok ? " assign-summary--ok" : "");
  box.innerHTML = '<span class="assign-summary-main"><strong>Selected:</strong> ' + names + '</span><span class="assign-summary-note">' + problem.text + '</span>';
  byId("assign-continue").disabled = !problem.ok;
}

function openAssign(keepSelection) {
  var entry = findQueueEntry(ui.selectedQueue); if (!entry) return;
  if (keepSelection !== true) { ui.selectedTables = []; }
  byId("assign-title").textContent = "Choose table(s) for " + formatQueueNumber(entry.number);
  byId("assign-text").textContent = "Group of " + entry.pax + ". Pick one table, or several to join them.";

  var grid = byId("assign-grid"); grid.innerHTML = "";
  getTables().forEach(function (table) {
    var free = table.status === "available";
    var tile = createElement("button", "table-tile table-tile--" + (free ? "available" : table.status === "billing" ? "billing" : "occupied"));
    tile.type = "button"; tile.disabled = !free;
    tile.setAttribute("data-table", table.id);
    tile.innerHTML = icon("table") + '<span class="table-tile-name">T-' + padTwoDigits(table.id) + '</span><span class="table-tile-info">' + (free ? "Available" : table.status === "billing" ? "Billing" : "Occupied") + '</span>';
    if (free && ui.selectedTables.indexOf(table.id) !== -1) tile.classList.add("table-tile--selected");
    tile.addEventListener("click", function () {
      var at = ui.selectedTables.indexOf(table.id);
      if (at === -1) { ui.selectedTables.push(table.id); tile.classList.add("table-tile--selected"); }
      else { ui.selectedTables.splice(at, 1); tile.classList.remove("table-tile--selected"); }
      updateAssignSummary();
    });
    grid.appendChild(tile);
  });
  updateAssignSummary();
  openModal("modal-assign");
}

function openConfirmAssign() {
  var entry = findQueueEntry(ui.selectedQueue);
  if (!entry || !ui.selectedTables.length || !assignProblem(entry).ok) return;
  var ids = ui.selectedTables;
  byId("confirm-assign-title").textContent = ids.length > 1 ? "Assign " + ids.length + " tables?" : "Assign " + formatTableName(ids[0]) + "?";
  var text = formatQueueNumber(entry.number) + " (" + entry.pax + " pax) will be seated at " + joinNames(ids) + ".";
  byId("confirm-assign-text").textContent = text;
  openModal("modal-confirm-assign");
}

function askConfirm(title, text, yesLabel, danger, action, iconName) {
  byId("confirm-title").textContent = title;
  byId("confirm-text").textContent = text;
  var chosen = iconName || (danger ? "alert" : "check");
  byId("confirm-icon").setAttribute("href", "#icon-" + chosen);
  byId("confirm-bar-icon").setAttribute("href", "#icon-" + chosen);
  byId("confirm-bar").classList.toggle("modal-bar--danger", !!danger);
  byId("confirm-badge").classList.toggle("modal-badge--danger", !!danger);
  var yes = byId("confirm-yes"); yes.textContent = yesLabel;
  yes.className = "button " + (danger ? "button--danger" : "button--primary");
  ui.confirmAction = action; openModal("modal-confirm");
}

function openRemove() {
  byId("remove-title").textContent = "Remove " + formatQueueNumber(ui.selectedQueue) + "?";
  openModal("modal-remove");
}

function showNextTimeAlert() {
  while (ui.alertQueue.length) {
    var item = ui.alertQueue.shift(); var table = findTable(item.table);
    if (!table || table.status !== "occupied") continue;
    var minutes = Math.max(1, Math.ceil(getSecondsLeft(table) / 60));
    notify(formatTableName(table.id) + (item.kind === "expired" ? ": time is up." : ": " + minutes + " min left."), item.kind === "expired" ? "danger" : "warning", 5000);
  }
}

function openDrawer() {
  var drawer = byId("drawer");
  var overlay = byId("drawer-overlay");
  if (drawer) {
    drawer.classList.add("drawer--open");
    drawer.setAttribute("aria-hidden", "false");
  }
  if (overlay) overlay.hidden = false;
}

function closeDrawer() {
  var drawer = byId("drawer");
  var overlay = byId("drawer-overlay");
  if (drawer) {
    drawer.classList.remove("drawer--open");
    drawer.setAttribute("aria-hidden", "true");
  }
  if (overlay) overlay.hidden = true;
}

function logOut() {
  try {
    sessionStorage.removeItem(FD_KEYS.session);
    localStorage.removeItem(FD_KEYS.queue);
    localStorage.removeItem(FD_KEYS.tables);
    localStorage.removeItem(FD_KEYS.notice);
    localStorage.removeItem(KIOSK_KEYS.lastIssued);
    localStorage.removeItem(KIOSK_KEYS.nowServing);
  } catch (e) {}
  window.location.replace(FD.loginPage);
}

function setUpEvents() {
  var menuBtn = byId("menu-button");
  var closeBtn = byId("drawer-close-button");
  var overlay = byId("drawer-overlay");
  var logoutBtn = byId("logout-button");

  if (menuBtn) menuBtn.addEventListener("click", openDrawer);
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  if (overlay) overlay.addEventListener("click", closeDrawer);

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () { 
      closeDrawer(); 
      askConfirm("Log out?", "Are you sure you want to sign out?", "Log out", true, logOut, "logout"); 
    });
  }

  document.querySelectorAll("[data-view]").forEach(function (b) { 
    b.addEventListener("click", function () { 
      showView(b.getAttribute("data-view")); 
    }); 
  });
  
  document.querySelectorAll("[data-close]").forEach(function (b) { 
    b.addEventListener("click", closeModal); 
  });
  
  var modalOverlay = byId("modal-overlay");
  if (modalOverlay) {
    modalOverlay.addEventListener("click", function (e) { 
      if (e.target === modalOverlay) closeModal(); 
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeModal(); closeDrawer(); }
  });

  byId("queue-info-assign")?.addEventListener("click", function () { openAssign(); });
  byId("queue-info-remove")?.addEventListener("click", openRemove);
  byId("assign-continue")?.addEventListener("click", openConfirmAssign);
  byId("confirm-assign-back")?.addEventListener("click", function () { openAssign(true); });
  byId("confirm-assign-yes")?.addEventListener("click", function () { 
    if (assignTables(ui.selectedQueue, ui.selectedTables, ui.payMode)) { 
      closeModal(); 
      renderAll(); 
    } else { 
      openAssign(); 
    } 
  });
  byId("remove-yes")?.addEventListener("click", function () { 
    removeFromQueue(ui.selectedQueue); 
    closeModal(); 
    renderAll(); 
  });
  byId("confirm-yes")?.addEventListener("click", function () { 
    var action = ui.confirmAction; 
    ui.confirmAction = null; 
    closeModal(); 
    if (typeof action === "function") action(); 
  });
}

document.addEventListener("DOMContentLoaded", function () {
  if (loadSessionValue(FD_KEYS.session, "") !== "yes") { 
    window.location.replace(FD.loginPage); 
    return; 
  }
  setUpSampleData(); 
  setUpEvents(); 
  initClock();
  showView("dashboard"); 
  renderAll(); 
  updateCountdowns(); 
  tick(); 
  setInterval(tick, 1000);
});