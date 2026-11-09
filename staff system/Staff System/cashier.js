(() => {
  'use strict';
  // Refreshing the page resets the demo data (the login session is kept).
  try {
    var navEntry = performance.getEntriesByType("navigation")[0];
    if (navEntry && navEntry.type === "reload") { ["fdDemoQueue", "fdDemoTables", "fdDemoNotice", "kioskLastIssued", "kioskNowServing"].forEach(function (k) { localStorage.removeItem(k); }); }
  } catch (e) { /* ignore */ }


  /* =====================================================
     CONFIG: adjust these to match your login.js
     ===================================================== */
  const CONFIG = {
    LOGIN_PAGE: 'login.html',      // where to send the cashier when logged out
    SESSION_KEY: 'cashierLoggedIn', // same key login.js saves for the cashier (sessionStorage)
    REQUIRED_ROLE: 'cashier',      // only checked if the saved user has a "role" (or "type") field
    DEMO_NEW_REQUESTS: true,       // simulates tables asking for the bill while the page is open
  };

  /* =====================================================
     Session guard (login / logout)
     ===================================================== */
  function readSession() {
    try {
      if (sessionStorage.getItem(CONFIG.SESSION_KEY) === 'yes') {
        return { name: 'Hi, Pierce!', role: 'cashier' };
      }
    } catch { /* storage blocked */ }
    return null;
  }

  function clearSession() {
    try { sessionStorage.removeItem(CONFIG.SESSION_KEY); } catch {}
  }

  // Demo data is shared with the Front Desk, so logging out of the cashier resets it too.
  function resetDemoData() {
    ['fdDemoQueue', 'fdDemoTables', 'fdDemoNotice', 'kioskLastIssued', 'kioskNowServing'].forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
  }

  function isAllowed(session) {
    if (!session) return false;
    const role = String(session.role || session.type || '').toLowerCase();
    return !role || role === CONFIG.REQUIRED_ROLE;
  }

  const session = readSession();
  if (!isAllowed(session)) {
    console.warn(`[cashier] No valid "${CONFIG.SESSION_KEY}" session found. Redirecting to ${CONFIG.LOGIN_PAGE}.`);
    location.replace(CONFIG.LOGIN_PAGE);
    return;
  }
  document.body.classList.remove('auth-pending');

  // Back button after logout should not reveal the portal
  window.addEventListener('pageshow', e => {
    if (e.persisted && !isAllowed(readSession())) location.replace(CONFIG.LOGIN_PAGE);
  });

  const userName = session.name || session.fullName || session.username || 'Cashier';

  /* =====================================================
     Helpers + icons
     ===================================================== */
  const $ = (sel, root = document) => root.querySelector(sel);
  const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const peso = n => '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const ICONS = {
    menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
    banknote: '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
    smartphone: '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    table: '<path d="M3 9h18"/><path d="M6 9v11"/><path d="M18 9v11"/><path d="M7 5h10"/><path d="M12 5v4"/>',
    printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    x: '<line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>',
    hash: '<line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  };

  function icon(name, cls = '') {
    return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }
  function hydrateIcons(root = document) {
    root.querySelectorAll('[data-icon]').forEach(el => { el.outerHTML = icon(el.dataset.icon, el.className); });
  }
  hydrateIcons();

  /* =====================================================
     Mock data (no database)
     ===================================================== */
  // Buffet: P199 per paying guest. Kids below 3ft eat free.
  const UNLI_PRICE = 199;
  const UNLI_NAME = 'Unli Samgyupsal';

  // Add-ons (P50 to P100 each)
  const MENU = {
    cheese:    { name: 'Cheese Sauce',             price: 50 },
    softdrink: { name: 'Softdrinks 1.5L',          price: 85 },
    redtea:    { name: 'Bottomless Red Iced Tea',  price: 60 },
    bluetea:   { name: 'Bottomless Blue Iced Tea', price: 60 },
    soju:      { name: 'Soju',                     price: 100 },
    icecream:  { name: 'Ice Cream',                price: 50 },
  };

  const minsAgo = m => Date.now() - m * 60000;

  // pax = total guests, kids = guests below 3ft (free), items = add-ons only
  const tables = [
    { id: 'T-01', pax: 5, kids: 1, status: 'billing',  method: 'GCash', requestedAt: minsAgo(12), items: [['cheese', 1], ['softdrink', 1], ['redtea', 2]] },
    { id: 'T-02', pax: 4, kids: 0, status: 'occupied', method: 'Cash',  requestedAt: null,        items: [['soju', 2], ['icecream', 4]] },
    { id: 'T-03', pax: 4, kids: 0, status: 'billing',  method: 'Cash',  requestedAt: minsAgo(7),  items: [['soju', 2], ['cheese', 1]] },
    { id: 'T-04', pax: 3, kids: 1, status: 'occupied', method: 'GCash', requestedAt: null,        items: [['bluetea', 2], ['icecream', 2]] },
    { id: 'T-05', pax: 6, kids: 2, status: 'billing',  method: 'Cash',  requestedAt: minsAgo(3),  items: [['cheese', 2], ['softdrink', 1], ['bluetea', 2]] },
    { id: 'T-06', pax: 0, kids: 0, status: 'free', method: 'Cash', requestedAt: null, items: [] },
    { id: 'T-07', pax: 2, kids: 0, status: 'billing',  method: 'GCash', requestedAt: minsAgo(1),  items: [['redtea', 1], ['icecream', 2]] },
    { id: 'T-08', pax: 0, kids: 0, status: 'free', method: 'Cash', requestedAt: null, items: [] },
    { id: 'T-09', pax: 2, kids: 0, status: 'occupied', method: 'Cash',  requestedAt: null,        items: [['cheese', 1]] },
    { id: 'T-10', pax: 0, kids: 0, status: 'free', method: 'Cash', requestedAt: null, items: [] },
  ];

  const payments = []; // transactions recorded today (in memory only)
  let receiptCounter = 0;

  const tableById = id => tables.find(t => t.id === id);

  /* =====================================================
     Shared table data with the Front Desk portal (localStorage)
     - Front Desk seats groups (one or several joined tables) and sets pay together / separately.
     - Paying here frees the table(s) at the Front Desk automatically.
     If the Front Desk has not been opened, this page still works on its own sample data.
     ===================================================== */
  const FD_TABLES_KEY = 'fdDemoTables';
  const fdName = n => 'T-' + String(n).padStart(2, '0');
  function fdRead() {
    try { const a = JSON.parse(localStorage.getItem(FD_TABLES_KEY)); return Array.isArray(a) && a.length ? a : null; } catch { return null; }
  }
  function fdWrite(list) { try { localStorage.setItem(FD_TABLES_KEY, JSON.stringify(list)); } catch {} }
  function fdSetStatus(ids, status) {
    const fd = fdRead(); if (!fd) return;
    fd.forEach(f => {
      if (!ids.includes(fdName(f.id))) return;
      if (status === 'available') {
        Object.assign(f, { status: 'available', pax: 0, startedAt: 0, endsAt: 0, queueNumber: null, warned: false, expiredNotified: false, alerted: false, groupId: null, groupTables: [], payMode: 'together' });
      } else {
        f.status = status;
      }
    });
    fdWrite(fd);
  }
  const resetTable = t => { t.status = 'free'; t.pax = 0; t.kids = 0; t.items = []; t.requestedAt = null; t.groupId = null; t.groupTables = []; t.payMode = 'together'; };
  const tableSignature = () => tables.map(t => [t.id, t.status, t.pax, t.groupId || '', t.payMode || ''].join(':')).join('|');

  // Copy the Front Desk's table status into this page. Returns true when something changed.
  function syncFromFd() {
    const fd = fdRead();
    if (!fd) return false;
    const before = tableSignature();
    fd.forEach(f => {
      const id = fdName(f.id);
      let c = tableById(id);
      if (!c) { c = { id, pax: 0, kids: 0, status: 'free', method: 'Cash', requestedAt: null, items: [] }; tables.push(c); }
      if (f.status === 'available') {
        if (c.status !== 'free') resetTable(c);
        return;
      }
      const wasFree = c.status === 'free';
      if (wasFree) { c.items = []; c.kids = 0; c.method = 'Cash'; }
      c.pax = f.pax;
      c.groupId = f.groupId || null;
      c.groupTables = (f.groupTables || []).map(fdName);
      c.payMode = f.payMode || 'together';
      if (f.status === 'billing') {
        if (c.status !== 'billing') { c.status = 'billing'; c.requestedAt = Date.now(); }
      } else {
        c.status = 'occupied'; c.requestedAt = null;
      }
    });
    tables.sort((a, b) => a.id.localeCompare(b.id));
    return before !== tableSignature();
  }

  // A bill covers one table, or every table of a group that pays together.
  function groupMembers(t) {
    if (t.payMode === 'together' && t.groupTables && t.groupTables.length > 1) {
      const m = t.groupTables.map(tableById).filter(Boolean);
      if (m.length) return m;
    }
    return [t];
  }
  const billKey = t => groupMembers(t).map(m => m.id).sort().join('+');

  function mergeBill(members) {
    if (members.length === 1) return Object.assign({}, members[0], { members });
    const merged = {};
    members.forEach(m => m.items.forEach(([k, q]) => { merged[k] = (merged[k] || 0) + q; }));
    const waiting = members.filter(m => m.status === 'billing');
    const lead = waiting[0] || members[0];
    return {
      id: members.map(m => m.id).join(' + '),
      pax: members.reduce((s, m) => s + m.pax, 0),
      kids: members.reduce((s, m) => s + (m.kids || 0), 0),
      status: waiting.length ? 'billing' : 'occupied',
      method: lead.method,
      requestedAt: waiting.length ? Math.min(...waiting.map(m => m.requestedAt || Date.now())) : null,
      items: Object.entries(merged),
      groupId: lead.groupId, payMode: lead.payMode,
      members,
    };
  }
  const billByKey = key => {
    const members = key.split('+').map(tableById).filter(Boolean);
    return members.length ? mergeBill(members) : null;
  };

  function computeBill(t) {
    const kids = t.kids || 0;
    const paying = Math.max(t.pax - kids, 0);
    const items = [];
    if (paying) items.push({ name: UNLI_NAME, price: UNLI_PRICE, qty: paying, amount: UNLI_PRICE * paying });
    if (kids) items.push({ name: 'Kids below 3ft', price: 0, qty: kids, amount: 0, free: true });
    t.items.forEach(([key, qty]) => {
      const m = MENU[key];
      items.push({ name: m.name, price: m.price, qty, amount: m.price * qty });
    });
    const total = round2(items.reduce((sum, i) => sum + i.amount, 0));
    return { items, total };
  }

  function elapsed(ts) {
    const m = Math.floor((Date.now() - ts) / 60000);
    return m < 1 ? 'Just now' : `${m} min ago`;
  }

  /* =====================================================
     Rendering
     ===================================================== */
  function waitingBills() {
    const seen = new Set(), bills = [];
    tables.filter(t => t.status === 'billing').forEach(t => {
      const key = billKey(t);
      if (seen.has(key)) return;
      seen.add(key);
      bills.push({ key, bill: mergeBill(groupMembers(t)) });
    });
    return bills.sort((a, b) => a.bill.requestedAt - b.bill.requestedAt);
  }

  function renderQueue() {
    const waiting = waitingBills();
    $('#queueCount').textContent = `${waiting.length} waiting`;
    const grid = $('#billGrid');

    if (!waiting.length) {
      grid.innerHTML = `<div class="empty">${icon('checkCircle')}<strong>No bills to collect</strong><span>Tables will show up here as soon as guests ask for the bill.</span></div>`;
      return;
    }

    grid.innerHTML = waiting.map(({ key, bill: t }) => {
      const b = computeBill(t);
      const isGcash = t.method === 'GCash';
      const joined = t.members.length > 1 ? ` &middot; ${t.members.length} tables` : (t.groupId && t.groupTables && t.groupTables.length > 1 ? ' &middot; separate bill' : '');
      return `
        <button class="bill-card" type="button" data-table="${key}" aria-label="Table ${t.id}, ${peso(b.total)}, pays by ${t.method}">
          <span class="bill-no">${t.id}</span>
          <span class="method-pill ${isGcash ? 'gcash' : 'cash'}">${icon(isGcash ? 'smartphone' : 'banknote')}${t.method}</span>
          <span class="bill-meta">${icon('users')}${t.pax} pax${joined}</span>
          <span class="bill-amount">${peso(b.total)}</span>
          <span class="bill-time">${icon('clock')}${elapsed(t.requestedAt)}</span>
        </button>`;
    }).join('');
  }

  function renderAll() { renderQueue(); }

  /* =====================================================
     Overlays, confirm dialog, toasts
     ===================================================== */
  function openOverlay(el) {
    el.hidden = false;
    document.body.classList.add('no-scroll');
  }
  function closeOverlay(el) {
    el.hidden = true;
    if (!document.querySelector('.overlay:not([hidden])')) document.body.classList.remove('no-scroll');
  }

  let confirmDone = null;
  function confirmDialog({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', tone = 'warn' }) {
    return new Promise(resolve => {
      const ov = $('#confirmOverlay');
      const iconName = tone === 'success' ? 'checkCircle' : 'alert';
      $('#confirmIcon').className = `dialog-ic ${tone === 'danger' ? 'danger' : tone === 'success' ? 'success' : ''}`;
      $('#confirmIcon').innerHTML = icon(iconName);
      $('#confirmTitle').textContent = title;
      $('#confirmMsg').textContent = message;
      $('#confirmOk').textContent = confirmText;
      $('#confirmOk').className = `btn ${tone === 'danger' ? 'danger' : 'primary'}`;
      $('#confirmCancel').textContent = cancelText;

      const finish = value => {
        confirmDone = null;
        closeOverlay(ov);
        resolve(value);
      };
      confirmDone = finish;
      $('#confirmOk').onclick = () => finish(true);
      $('#confirmCancel').onclick = () => finish(false);
      openOverlay(ov);
      $('#confirmCancel').focus();
    });
  }

  function toast(message, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `${icon(type === 'success' ? 'checkCircle' : type === 'error' ? 'alert' : 'info')}<span>${esc(message)}</span>`;
    $('#toasts').appendChild(el);
    setTimeout(() => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 260);
    }, 3800);
  }

  /* =====================================================
     Payment flow
     ===================================================== */
  const pay = { table: null, bill: null, method: 'Cash', busy: false };

  function openPay(key) {
    const t = billByKey(key);
    if (!t) return;
    if (t.status === 'occupied') return toast(`${t.id} is still dining (${t.pax} pax). No bill requested yet.`, 'info');
    if (t.status === 'free') return toast(`${t.id} is free. There is no bill to collect.`, 'info');

    pay.table = t;
    pay.bill = computeBill(t);
    pay.method = t.method;
    pay.busy = false;

    $('#payTitle').textContent = `${t.members.length > 1 ? 'Tables' : 'Table'} ${t.id}`;
    $('#paySub').innerHTML = `${icon('users')}${t.pax} pax<span aria-hidden="true">•</span>${icon('clock')}Requested ${elapsed(t.requestedAt).toLowerCase()}`;
    $('#payTotal').textContent = peso(pay.bill.total);

    const b = pay.bill;
    $('#payBody').innerHTML = `
      <p class="section-label">Order summary</p>
      <div class="order-list">
        ${b.items.map(i => `<div class="order-row"><span class="qty">${i.qty}×</span><span>${esc(i.name)}</span><span class="amt">${i.free ? 'FREE' : peso(i.amount)}</span></div>`).join('')}
      </div>
      <div class="sum-rows">
        <div class="grand"><span>Total</span><span>${peso(b.total)}</span></div>
      </div>
      <p class="section-label">Payment method</p>
      <div class="seg" role="radiogroup" aria-label="Payment method">
        ${['Cash', 'GCash'].map(m => `
          <button type="button" class="seg-btn" role="radio" data-method="${m}">
            ${t.method === m ? '<span class="req-tag">Guest’s choice</span>' : ''}
            ${icon(m === 'Cash' ? 'banknote' : 'smartphone')}${m}
          </button>`).join('')}
      </div>
      <div id="methodPanel"></div>`;
    renderMethodPanel();
    openOverlay($('#payOverlay'));
    setTimeout(() => ($('#cashIn') || $('#gcashIn'))?.focus(), 50);
  }

  function renderMethodPanel() {
    const total = pay.bill.total;
    document.querySelectorAll('#payBody .seg-btn').forEach(btn => {
      const on = btn.dataset.method === pay.method;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-checked', on);
    });

    if (pay.method === 'Cash') {
      $('#methodPanel').innerHTML = `
        <label class="field"><span>Amount received</span>
          <div class="input-wrap"><b>₱</b><input id="cashIn" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00" aria-label="Amount received"></div>
        </label>
        <div class="quick">
          <button type="button" data-quick="${total}">Exact amount</button>
        </div>
        <div class="change-box idle" id="changeBox"><span>Change</span><strong id="changeVal">${peso(0)}</strong></div>
        <p class="field-error" id="payError" hidden></p>`;
    } else {
      $('#methodPanel').innerHTML = `
        <div class="note">${icon('info')}<span>Ask the guest to send ${peso(total)} to the restaurant’s GCash account, then enter the reference number shown on their GCash receipt.</span></div>
        <label class="field"><span>GCash reference number</span>
          <div class="input-wrap">${icon('hash')}<input id="gcashIn" type="text" inputmode="numeric" maxlength="13" autocomplete="off" placeholder="13-digit reference no." aria-label="GCash reference number"></div>
        </label>
        <p class="field-error" id="payError" hidden></p>`;
    }
  }

  function updateChange() {
    const input = $('#cashIn');
    if (!input) return;
    const box = $('#changeBox');
    const received = parseFloat(input.value);
    const total = pay.bill.total;
    box.classList.remove('short', 'idle');
    if (isNaN(received) || received <= 0) {
      box.classList.add('idle');
      box.innerHTML = `<span>Change</span><strong>${peso(0)}</strong>`;
    } else if (received < total) {
      box.classList.add('short');
      box.innerHTML = `<span>Short by</span><strong>${peso(total - received)}</strong>`;
    } else {
      box.innerHTML = `<span>Change</span><strong>${peso(received - total)}</strong>`;
    }
  }

  function showPayError(msg) {
    const el = $('#payError');
    el.innerHTML = `${icon('alert')}${esc(msg)}`;
    el.hidden = false;
    $('#payBody .input-wrap')?.classList.add('invalid');
    $('#payBody input')?.focus();
  }
  function clearPayError() {
    const el = $('#payError');
    if (el) el.hidden = true;
    $('#payBody .input-wrap')?.classList.remove('invalid');
  }

  // Delegated events inside the payment modal
  $('#payBody').addEventListener('click', e => {
    const methodBtn = e.target.closest('[data-method]');
    if (methodBtn) { pay.method = methodBtn.dataset.method; renderMethodPanel(); ($('#cashIn') || $('#gcashIn'))?.focus(); return; }
    const quick = e.target.closest('[data-quick]');
    if (quick) { $('#cashIn').value = Number(quick.dataset.quick).toFixed(2); clearPayError(); updateChange(); }
  });
  $('#payBody').addEventListener('input', e => {
    clearPayError();
    if (e.target.id === 'cashIn') {
      let v = e.target.value.replace(/[^\d.]/g, '');
      const parts = v.split('.');
      if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
      e.target.value = v;
      updateChange();
    }
    if (e.target.id === 'gcashIn') e.target.value = e.target.value.replace(/\D/g, '');
  });
  $('#payBody').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') submitPayment(); });

  async function requestClosePay() {
    const typed = ($('#cashIn') || $('#gcashIn'))?.value;
    if (typed) {
      const ok = await confirmDialog({
        title: 'Discard payment details?',
        message: `What you entered for ${pay.table.id} will be cleared. The bill stays in the queue.`,
        confirmText: 'Discard', cancelText: 'Keep editing', tone: 'danger',
      });
      if (!ok) return;
    }
    closeOverlay($('#payOverlay'));
  }

  async function submitPayment() {
    if (pay.busy) return;
    const { table: t, bill: b, method } = pay;
    let received = null, change = 0, ref = '';

    if (method === 'Cash') {
      received = parseFloat($('#cashIn').value);
      if (isNaN(received) || received <= 0) return showPayError('Enter the amount the guest handed over.');
      if (received < b.total) return showPayError(`The amount is short by ${peso(b.total - received)}.`);
      change = round2(received - b.total);
    } else {
      ref = $('#gcashIn').value.trim();
      if (!/^\d{10,13}$/.test(ref)) return showPayError('Enter the 10 to 13 digit GCash reference number.');
    }

    pay.busy = true;
    const ok = await confirmDialog({
      title: 'Confirm payment?',
      message: method === 'Cash'
        ? `Receive ${peso(received)} in cash from ${t.id}${change ? ` and give ${peso(change)} change` : ''}? A receipt will be generated.`
        : `Mark ${t.id}’s ${peso(b.total)} as paid via GCash (ref. ${ref})? A receipt will be generated.`,
      confirmText: 'Yes, confirm payment', cancelText: 'Go back', tone: 'success',
    });
    pay.busy = false;
    if (!ok) return;

    receiptCounter += 1;
    const now = new Date();
    const ymd = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    const tx = {
      receiptNo: `OR-${ymd}-${String(receiptCounter).padStart(4, '0')}`,
      tableId: t.id, pax: t.pax, items: b.items,
      total: b.total,
      method, received, change, ref,
      cashier: userName, paidAt: now,
    };
    payments.unshift(tx);

    // Table(s) are cleared once paid, here and at the Front Desk
    t.members.forEach(resetTable);
    fdSetStatus(t.members.map(m => m.id), 'available');

    closeOverlay($('#payOverlay'));
    renderAll();
    showReceipt(tx, true);
    toast(`Payment received from ${tx.tableId}. Receipt ${tx.receiptNo} created.`);
  }

  /* =====================================================
     Receipt (digital + print)
     ===================================================== */
  function receiptHTML(tx) {
    const d = tx.paidAt;
    const date = d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
    return `
      <div class="receipt">
        <span class="r-paid">PAID</span>
        <div class="r-head">
          <strong>UNLTD 199</strong>
          <span>Samgyupsal Korean Grill House</span>
          <small>Official receipt</small>
        </div>
        <hr>
        <div class="r-row"><span>Receipt no.</span><span>${esc(tx.receiptNo)}</span></div>
        <div class="r-row"><span>Date</span><span>${date}</span></div>
        <div class="r-row"><span>Time</span><span>${time}</span></div>
        <div class="r-row"><span>Table</span><span>${esc(tx.tableId)} (${tx.pax} pax)</span></div>
        <div class="r-row"><span>Cashier</span><span>${esc(tx.cashier)}</span></div>
        <hr>
        ${tx.items.map(i => `
          <div class="r-row"><span>${esc(i.name)}</span><span>${i.free ? 'FREE' : peso(i.amount)}</span></div>
          <p class="r-sub">${i.free ? `${i.qty} guest${i.qty > 1 ? 's' : ''}` : `${i.qty} × ${peso(i.price)}`}</p>`).join('')}
        <hr>
        <div class="r-row r-total"><span>TOTAL</span><span>${peso(tx.total)}</span></div>
        <hr>
        <div class="r-row"><span>Payment</span><span>${tx.method}</span></div>
        ${tx.method === 'Cash'
          ? `<div class="r-row"><span>Cash received</span><span>${peso(tx.received)}</span></div>
             <div class="r-row"><span>Change</span><span>${peso(tx.change)}</span></div>`
          : `<div class="r-row"><span>GCash ref. no.</span><span>${esc(tx.ref)}</span></div>`}
        <hr>
        <p class="r-foot">Thank you for dining with us!<br>Please come again.</p>
      </div>`;
  }

  let currentReceipt = null, receiptJustPaid = false;
  function showReceipt(tx, justPaid = false) {
    currentReceipt = tx;
    receiptJustPaid = justPaid;
    $('#receiptSub').textContent = `${tx.receiptNo} • ${tx.tableId}`;
    $('#receiptBody').innerHTML = receiptHTML(tx);
    $('#doneBtn').innerHTML = `${icon('check')}${justPaid ? 'Done' : 'Close'}`;
    openOverlay($('#receiptOverlay'));
    $('#doneBtn').focus();
  }

  function closeReceipt() {
    closeOverlay($('#receiptOverlay'));
    if (receiptJustPaid && currentReceipt) {
      toast(`${currentReceipt.tableId} ${currentReceipt.tableId.includes('+') ? 'are' : 'is'} cleared and ready for the next guests.`, 'info');
    }
    receiptJustPaid = false;
  }

  function printReceipt() {
    if (!currentReceipt) return;
    $('#printArea').innerHTML = receiptHTML(currentReceipt);
    toast(`Sending ${currentReceipt.receiptNo} to the printer…`, 'info');
    setTimeout(() => window.print(), 250);
  }

  /* =====================================================
     Logout, drawer, clock
     ===================================================== */
  async function logout() {
    const pending = waitingBills().length;
    const ok = await confirmDialog({
      title: 'Log out?',
      message: pending
        ? `${pending} ${pending === 1 ? 'bill is' : 'bills are'} still waiting to be collected. You will need to sign in again to continue.`
        : 'You will need to sign in again to open the cashier portal.',
      confirmText: 'Log out', cancelText: 'Stay logged in', tone: 'danger',
    });
    if (!ok) return;
    clearSession();
    resetDemoData();
    toast('You have been logged out. Redirecting…');
    setTimeout(() => location.replace(CONFIG.LOGIN_PAGE), 700);
  }

  function setDrawer(open) {
    $('#drawer').classList.toggle('drawer--open', open);
    $('#drawer').setAttribute('aria-hidden', String(!open));
    $('#drawerScrim').hidden = !open;
  }

  function tickClock() {
    $('#clock').textContent = new Date().toLocaleTimeString('en-US');
  }

  /* =====================================================
     Wire up
     ===================================================== */
  $('#userName').textContent = userName;

  $('#billGrid').addEventListener('click', e => { const c = e.target.closest('[data-table]'); if (c) openPay(c.dataset.table); });

  $('#confirmPayBtn').addEventListener('click', submitPayment);
  $('#printBtn').addEventListener('click', printReceipt);
  $('#doneBtn').addEventListener('click', closeReceipt);
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => {
    b.dataset.close === 'pay' ? requestClosePay() : closeReceipt();
  }));
  $('#payOverlay').addEventListener('mousedown', e => { if (e.target.id === 'payOverlay') requestClosePay(); });
  $('#receiptOverlay').addEventListener('mousedown', e => { if (e.target.id === 'receiptOverlay') closeReceipt(); });

  $('#drawerLogout').addEventListener('click', () => { setDrawer(false); logout(); });
  $('#menuBtn').addEventListener('click', () => setDrawer(true));
  $('#drawerScrim').addEventListener('click', () => setDrawer(false));
  $('#drawerClose').addEventListener('click', () => setDrawer(false));
  document.querySelectorAll('[data-scroll]').forEach(b => b.addEventListener('click', () => {
    setDrawer(false);
    document.getElementById(b.dataset.scroll).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('#confirmOverlay').hidden) return confirmDone && confirmDone(false);
    if (!$('#receiptOverlay').hidden) return closeReceipt();
    if (!$('#payOverlay').hidden) return requestClosePay();
    setDrawer(false);
  });

  window.addEventListener('afterprint', () => { $('#printArea').innerHTML = ''; });

  function requestBill(id, method) {
    const t = tableById(id);
    if (!t || t.status !== 'occupied') return;
    const members = groupMembers(t);
    members.forEach(m => { if (m.status === 'occupied') { m.status = 'billing'; m.method = method; m.requestedAt = Date.now(); } });
    fdSetStatus(members.map(m => m.id), 'billing');
    renderAll();
    toast(`${members.map(m => m.id).join(' + ')} ${members.length > 1 ? 'are' : 'is'} asking for the bill (${method}).`, 'info');
  }

  tickClock();
  setInterval(tickClock, 1000);
  setInterval(renderQueue, 30000); // refresh "x min ago"
  syncFromFd();
  renderAll();
  // keep in step with the Front Desk (same browser)
  window.addEventListener('storage', e => { if (e.key === FD_TABLES_KEY && syncFromFd()) renderAll(); });
  setInterval(() => { if (syncFromFd()) renderAll(); }, 2000);

  if (CONFIG.DEMO_NEW_REQUESTS) {
    setTimeout(() => requestBill('T-02', 'Cash'), 20000);
    setTimeout(() => requestBill('T-04', 'GCash'), 50000);
  }
})();