/* =====================================================
   UNLTD 199 - Waiter Portal Logic Script
   ===================================================== */
const WAITER_KEYS = {
  session: "waiterLoggedIn",
  addons: "waiterAddonsOrders",
  assistance: "waiterAssistanceRequests"
};

const DEFAULT_ADDONS = [
  { id: "ord-1", tableName: "Table 1", pax: 4, items: [
    { id: "item-1", name: "Cheese", qty: 2 },
    { id: "item-2", name: "Bottomless Red Iced Tea", qty: 2 },
    { id: "item-3", name: "Bottomless Blue Iced Tea", qty: 1 },
    { id: "item-4", name: "1.5L Soft Drinks", qty: 1 },
    { id: "item-5", name: "Soju", qty: 2 }
  ] },
  { id: "ord-7", tableName: "Table 7", pax: 4, items: [
    { id: "item-6", name: "1.5L Soft Drinks", qty: 1 },
    { id: "item-7", name: "Soju", qty: 2 },
    { id: "item-8", name: "Ice Cream", qty: 4 },
    { id: "item-9", name: "Cheese", qty: 1 }
  ] },
  { id: "ord-4", tableName: "Table 4", pax: 4, items: [{ id: "item-10", name: "Bottomless Red Iced Tea", qty: 1 }] },
  { id: "ord-9", tableName: "Table 9", pax: 4, items: [{ id: "item-11", name: "Ice Cream", qty: 2 }] }
];

const DEFAULT_ASSISTANCE = [
  { id: "ast-2", tableName: "Table 2" },
  { id: "ast-6", tableName: "Table 6" },
  { id: "ast-3", tableName: "Table 3" }
];

let state = {
  addons: loadJson(WAITER_KEYS.addons, DEFAULT_ADDONS),
  assistance: loadJson(WAITER_KEYS.assistance, DEFAULT_ASSISTANCE),
  activeItemToRemove: null
};

function loadJson(key, fallback) {
  try { const val = localStorage.getItem(key); return val ? JSON.parse(val) : fallback; } catch (e) { return fallback; }
}
function saveJson(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {} }
function removeValue(key) { try { sessionStorage.removeItem(key); } catch (e) {} }
function removeStoredData(key) { try { localStorage.removeItem(key); } catch (e) {} }
function byId(id) { return document.getElementById(id); }

function initClock() {
  const clockEl = byId("topbar-clock");
  if (!clockEl) return;
  function update() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString();
  }
  update();
  setInterval(update, 1000);
}

function showToast(text, type = "success") {
  const stack = byId("toast-stack");
  if (!stack) return;
  const t = document.createElement("div");
  t.className = `toast toast--${type}`;
  const iconName = type === "danger" ? "icon-trash" : "icon-check";
  t.innerHTML = `<span class="toast-icon"><svg class="icon"><use href="#${iconName}"></use></svg></span><span class="toast-text">${text}</span>`;
  stack.appendChild(t);
  setTimeout(() => {
    t.classList.add("toast--leaving");
    setTimeout(() => t.remove(), 200);
  }, 2500);
}

function initDrawer() {
  const menuBtn = byId("menu-button");
  const closeBtn = byId("drawer-close-button");
  const overlay = byId("drawer-overlay");
  const drawer = byId("drawer");
  const logoutBtn = byId("logout-button");
  const ordersNavBtn = byId("orders-nav-button");

  function openDrawer() {
    if (drawer) {
      drawer.classList.add("drawer--open");
      drawer.setAttribute("aria-hidden", "false");
    }
    if (overlay) overlay.hidden = false;
  }
  function closeDrawer() {
    if (drawer) {
      drawer.classList.remove("drawer--open");
      drawer.setAttribute("aria-hidden", "true");
    }
    if (overlay) overlay.hidden = true;
  }

  if (menuBtn) menuBtn.addEventListener("click", openDrawer);
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  if (overlay) overlay.addEventListener("click", closeDrawer);
  if (ordersNavBtn) ordersNavBtn.addEventListener("click", () => { closeDrawer(); window.scrollTo(0, 0); });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      closeDrawer();
      openModal("modal-confirm-logout");
    });
  }

  byId("confirm-logout-yes")?.addEventListener("click", () => {
    removeValue(WAITER_KEYS.session);
    // Reset the demo data so the next login starts fresh
    removeStoredData(WAITER_KEYS.addons);
    removeStoredData(WAITER_KEYS.assistance);
    window.location.replace("login.html");
  });
}

function emptyState(text) {
  return `<div class="empty-state"><div class="empty-icon"><svg class="icon"><use href="#icon-check"></use></svg></div><span>${text}</span></div>`;
}

function renderAddons() {
  const container = byId("addons-list");
  if (!container) return;

  const count = byId("addons-count");
  const total = state.addons ? state.addons.length : 0;
  if (count) count.textContent = `${total} ${total === 1 ? "order" : "orders"}`;

  if (!state.addons || state.addons.length === 0) {
    container.innerHTML = emptyState("No active add-on orders at the moment.");
    return;
  }

  container.innerHTML = state.addons.map(order => {
    const totalQty = order.items.reduce((sum, i) => sum + i.qty, 0);
    const mainItemText = order.items.length === 1 
      ? order.items[0].name 
      : `${order.items[0].name} +${order.items.length - 1} more`;

    return `
      <div class="row-item">
        <div class="row-icon"><svg class="icon"><use href="#icon-utensils"></use></svg></div>
        <div class="row-main">${order.tableName}</div>
        <div class="row-sub">
          <div class="row-name">${mainItemText}</div>
          <div class="row-meta">Qty: ${totalQty} &bull; ${order.pax} pax</div>
        </div>
        <button type="button" class="button button--primary button--small" onclick="openOrderModal('${order.id}')">
          <svg class="icon"><use href="#icon-utensils"></use></svg> View Orders
        </button>
      </div>
    `;
  }).join("");
}

function renderAssistance() {
  const container = byId("assistance-list");
  if (!container) return;

  const count = byId("assistance-count");
  const total = state.assistance ? state.assistance.length : 0;
  if (count) count.textContent = `${total} ${total === 1 ? "table" : "tables"}`;

  if (!state.assistance || state.assistance.length === 0) {
    container.innerHTML = emptyState("No tables currently requesting assistance.");
    return;
  }

  container.innerHTML = state.assistance.map(ast => `
    <div class="row-item row-item--warning">
      <div class="row-icon"><svg class="icon"><use href="#icon-bell"></use></svg></div>
      <div class="row-main">${ast.tableName}</div>
      <div class="row-sub">Assistance requested</div>
      <button type="button" class="button button--primary button--small" onclick="promptResolveAssistance('${ast.id}')">
        <svg class="icon"><use href="#icon-check"></use></svg> Mark as Done
      </button>
    </div>
  `).join("");
}

let selectedOrderId = null;
let selectedAssistanceId = null;

window.openOrderModal = function(orderId) {
  selectedOrderId = orderId;
  const order = state.addons.find(o => o.id === orderId);
  if (!order) return;

  byId("modal-table-title").textContent = `${order.tableName} (${order.pax} pax)`;
  byId("modal-total-items").textContent = order.items.reduce((s, i) => s + i.qty, 0);

  const listContainer = byId("modal-order-items-list");
  if (listContainer) {
    listContainer.innerHTML = order.items.map((item, idx) => `
      <div class="order-item">
        <div>
          <div class="order-item-name">${item.name}</div>
          <div class="order-item-qty">Qty: ${item.qty}</div>
        </div>
        <div class="order-item-actions">
          <input type="checkbox" aria-label="Select item" ${item.checked ? "checked" : ""} onchange="toggleItemChecked('${orderId}', ${idx}, this.checked)">
          <button type="button" class="icon-button icon-button--danger" aria-label="Remove item" onclick="promptRemoveItem('${orderId}', ${idx})">
            <svg class="icon"><use href="#icon-trash"></use></svg>
          </button>
        </div>
      </div>
    `).join("");
  }

  openModal("modal-view-orders");
};

window.toggleItemChecked = function(orderId, itemIndex, isChecked) {
  const order = state.addons.find(o => o.id === orderId);
  if (!order || !order.items[itemIndex]) return;
  order.items[itemIndex].checked = isChecked;
  saveJson(WAITER_KEYS.addons, state.addons);
};

byId("modal-mark-done-btn")?.addEventListener("click", () => {
  closeModal("modal-view-orders");
  openModal("modal-confirm-done");
  const order = state.addons.find(o => o.id === selectedOrderId);
  if (order && byId("confirm-done-preview")) {
    byId("confirm-done-preview").innerHTML = `<strong>${order.tableName}</strong><span class="preview-sub">${order.items.map(i => `${i.name} (x${i.qty})`).join(", ")}</span>`;
  }
});

byId("confirm-done-yes")?.addEventListener("click", () => {
  state.addons = state.addons.filter(o => o.id !== selectedOrderId);
  saveJson(WAITER_KEYS.addons, state.addons);
  renderAddons();
  closeModal("modal-confirm-done");
  showToast("Order marked as done successfully.");
});

byId("confirm-done-back")?.addEventListener("click", () => {
  closeModal("modal-confirm-done");
  openOrderModal(selectedOrderId);
});

window.promptRemoveItem = function(orderId, itemIndex) {
  selectedOrderId = orderId;
  state.activeItemToRemove = itemIndex;
  const order = state.addons.find(o => o.id === orderId);
  if (!order) return;
  const item = order.items[itemIndex];

  if (byId("remove-item-preview")) {
    byId("remove-item-preview").innerHTML = `<strong>${item.name}</strong><span class="preview-sub">Qty: ${item.qty}</span>`;
  }
  if (byId("removal-note")) {
    byId("removal-note").value = "";
  }
  
  closeModal("modal-view-orders");
  openModal("modal-remove-item");
};

byId("confirm-remove-item-btn")?.addEventListener("click", () => {
  const order = state.addons.find(o => o.id === selectedOrderId);
  if (order && state.activeItemToRemove !== null) {
    order.items.splice(state.activeItemToRemove, 1);
    if (order.items.length === 0) {
      state.addons = state.addons.filter(o => o.id !== selectedOrderId);
    }
    saveJson(WAITER_KEYS.addons, state.addons);
    renderAddons();
  }
  closeModal("modal-remove-item");
  showToast("Item removed from order.", "danger");
});

window.promptResolveAssistance = function(astId) {
  selectedAssistanceId = astId;
  openModal("modal-confirm-assistance");
};

byId("confirm-assistance-yes")?.addEventListener("click", () => {
  state.assistance = state.assistance.filter(a => a.id !== selectedAssistanceId);
  saveJson(WAITER_KEYS.assistance, state.assistance);
  renderAssistance();
  closeModal("modal-confirm-assistance");
  showToast("Assistance request resolved.");
});

function openModal(modalId) {
  const overlay = byId("modal-overlay");
  const modal = byId(modalId);
  if (overlay) overlay.hidden = false;
  if (modal) modal.hidden = false;
}

function closeModal(modalId) {
  const modal = byId(modalId);
  if (modal) modal.hidden = true;
  if (!document.querySelectorAll('.modal:not([hidden])').length) {
    const overlay = byId("modal-overlay");
    if (overlay) overlay.hidden = true;
  }
}

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener("click", (e) => {
    const m = e.target.closest('.modal');
    if (m) closeModal(m.id);
  });
});

document.addEventListener("DOMContentLoaded", () => {
  initDrawer();
  initClock();
  renderAddons();
  renderAssistance();
});