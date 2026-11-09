/* =====================================================
   UNLTD 199 - Customer Order Screen
   MAIN JAVASCRIPT (used by order.html)
   -----------------------------------------------------
   1. Settings and menu items (EDIT HERE)
   2. Helper functions
   3. Orders (add items, total)
   4. Switching screens (Menu / My Orders / Bill Out)
   5. Menu screen
   6. My Orders screen
   7. Bill Out screen and bill-out request
   8. Pop-ups (modals)
   9. Remaining-time countdown
   10. Start-up

   IMPORTANT: There is NO real database or server here.
   Orders and the countdown are saved in the browser
   (localStorage), and the "Request Assistance" button does
   not really notify anyone. Places to connect a backend are
   marked with "BACKEND:".
   ===================================================== */


/* =====================================================
   1. SETTINGS AND MENU ITEMS
   ===================================================== */
var SETTINGS = {
  tableNumber: 1,          // shown in the top bar
  paxCount: 5,             // number of people, shown in the top bar
  sessionMinutes: 120,     // dining time limit (120 = 2 hours)
  warningMinutes: 10,      // the "time is almost up" pop-up appears when this many minutes are left
  maxQuantity: 20,         // largest quantity per order
  currencySymbol: "₱"
};

/* UNLIMITED SAMGYUPSAL (per pax)
   This is added to My Orders automatically.
   Quantity = SETTINGS.paxCount, so 5 pax = 5 x ₱199. */
var DINE_IN_SET = {
  id: "unli-samgyupsal",
  name: "Unlimited Samgyupsal",
  category: "Dine-in (per pax)",
  price: 199,
  image: "menu pictures/samgyupsal.jpg",
  emoji: "🥩"
};

/* MENU ITEMS
   To add an item, copy one line and change it.
   - category must match a category tab in order.html (Drinks, Desserts, Sides)
   - image is the picture file inside the "menu pictures" folder
   - emoji is shown if the picture file is missing */
var MENU_ITEMS = [
  { id: "cheese-sauce",  name: "Cheese Sauce",             category: "Sides",    price: 50,  image: "menu pictures/cheese.jpg",        emoji: "🧀" },
  { id: "red-iced-tea",  name: "Bottomless Red Iced Tea",  category: "Drinks",   price: 100, image: "menu pictures/red iced tea.jpg",  emoji: "🍹" },
  { id: "blue-lemonade", name: "Bottomless Blue Lemonade", category: "Drinks",   price: 100, image: "menu pictures/blue iced tea.jpg", emoji: "🍹" },
  { id: "soft-drinks",   name: "1.5L Soft Drinks",         category: "Drinks",   price: 75,  image: "menu pictures/softdrinks.jpg",    emoji: "🥤" },
  { id: "soju",          name: "Soju",                     category: "Drinks",   price: 120, image: "menu pictures/soju.jpg",          emoji: "🍶" },
  { id: "ice-cream",     name: "Ice Cream",                category: "Desserts", price: 30,  image: "menu pictures/ice cream.jpg",     emoji: "🍦" }
];

/* PAYMENT METHODS
   "note" is the text shown under the Cash / GCash buttons. */
var PAYMENT_METHODS = {
  cash: {
    label: "Cash",
    note: "Please wait. The cashier will collect your payment at your table. Thank you."
  },
  gcash: {
    label: "GCash",
    note: "Please wait. The cashier will bring the GCash payment details to your table. Thank you."
  }
};

// Names used to save data in the browser
var KEYS = {
  orders: "orderItems",
  sessionEnd: "orderSessionEnd",
  warningShown: "orderWarningShown",
  timeUpShown: "orderTimeUpShown",
  billRequested: "orderBillRequested"
};

// Everything that changes while the page is open
var state = {
  orders: [],             // list of { id, quantity } (add-ons only; the per-pax set is added automatically)
  activeCategory: "All",
  searchText: "",
  currentView: "menu",    // "menu", "orders" or "bill"
  paymentMethod: "cash",  // "cash" or "gcash"
  selectedItem: null,     // item shown in the quantity pop-up
  sessionEndTime: 0,      // time (in milliseconds) when dining time ends
  warningShown: false,    // has the "almost up" pop-up been shown already?
  timeUpShown: false,     // has the "time's up" pop-up been shown already?
  billRequested: false,   // has the table already requested bill out?
  openModal: ""           // id of the pop-up that is open right now
};


/* =====================================================
   2. HELPER FUNCTIONS
   ===================================================== */

// Short way to get an element by its id
function byId(id) {
  return document.getElementById(id);
}

// Creates an element with an optional class name and text
function createElement(tag, className, text) {
  var element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

// Save / read / delete a value in the browser
function saveValue(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch (error) {
    console.warn("Could not save data in this browser.", error);
  }
}

function loadValue(key, fallback) {
  try {
    var value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

function removeValue(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn("Could not remove data in this browser.", error);
  }
}

// Turns 250 into "₱250"
function formatPrice(amount) {
  return SETTINGS.currencySymbol + amount.toLocaleString("en-PH");
}

function findMenuItem(id) {
  for (var i = 0; i < MENU_ITEMS.length; i++) {
    if (MENU_ITEMS[i].id === id) return MENU_ITEMS[i];
  }
  return null;
}

// Show a short message at the bottom of the screen
function showToast(message) {
  var toast = byId("toast");
  toast.textContent = message;
  toast.classList.add("toast--visible");

  setTimeout(function () {
    toast.classList.remove("toast--visible");
  }, 2500);
}

// Builds the food picture. If the file is missing, an emoji is shown instead.
function createItemImage(item, sizeClass) {
  var box = createElement("div", "item-image " + sizeClass);
  var picture = document.createElement("img");

  picture.addEventListener("error", function () {
    if (picture.parentNode) box.removeChild(picture);
    box.appendChild(createElement("span", "item-emoji", item.emoji));
  });

  picture.alt = item.name;
  picture.src = item.image;
  box.appendChild(picture);
  return box;
}


/* =====================================================
   3. ORDERS
   ===================================================== */

// BACKEND: replace loadOrders / saveOrders with requests to your server.
function loadOrders() {
  var saved = [];
  try {
    saved = JSON.parse(loadValue(KEYS.orders, "[]"));
  } catch (error) {
    saved = [];
  }

  // Keep only orders for items that still exist on the menu
  state.orders = saved.filter(function (order) {
    return findMenuItem(order.id) && order.quantity > 0;
  });
}

function saveOrders() {
  saveValue(KEYS.orders, JSON.stringify(state.orders));
}

// Adds an item. If it was already ordered, the quantity goes up.
function addToOrders(itemId, quantity) {
  for (var i = 0; i < state.orders.length; i++) {
    if (state.orders[i].id === itemId) {
      state.orders[i].quantity += quantity;
      saveOrders();
      return;
    }
  }
  state.orders.push({ id: itemId, quantity: quantity });
  saveOrders();
}

/* Every line on the bill:
   first the Unlimited Samgyupsal (199 x pax), then the add-ons. */
function getOrderLines() {
  var lines = [{ item: DINE_IN_SET, quantity: SETTINGS.paxCount, status: "Dine-in" }];

  state.orders.forEach(function (order) {
    // BACKEND: the status ("Preparing", "Served", ...) should come from the kitchen.
    lines.push({ item: findMenuItem(order.id), quantity: order.quantity, status: "Ordered" });
  });

  return lines;
}

function getOrderTotal() {
  var total = 0;
  getOrderLines().forEach(function (line) {
    total += line.item.price * line.quantity;
  });
  return total;
}


/* =====================================================
   4. SWITCHING SCREENS
   ===================================================== */
var VIEW_IDS = {
  menu: "view-menu",
  orders: "view-orders",
  bill: "view-bill"
};

function showView(name) {
  state.currentView = name;

  Object.keys(VIEW_IDS).forEach(function (key) {
    byId(VIEW_IDS[key]).hidden = key !== name;
  });

  if (name === "orders") renderOrders();
  if (name === "bill") renderBill();

  // The Bill Out screen belongs to the "My Orders" menu button
  highlightNav(name === "bill" ? "orders" : name);
  window.scrollTo(0, 0);
}

// Makes one side-menu button look selected
function highlightNav(navName) {
  document.querySelectorAll(".nav-button").forEach(function (button) {
    var isActive = button.getAttribute("data-nav") === navName;
    button.classList.toggle("nav-button--active", isActive);
  });
}


/* =====================================================
   5. MENU SCREEN
   ===================================================== */
function renderMenu() {
  var grid = byId("menu-grid");
  var search = state.searchText.trim().toLowerCase();

  grid.innerHTML = "";

  var shownItems = MENU_ITEMS.filter(function (item) {
    var categoryMatches = state.activeCategory === "All" || item.category === state.activeCategory;
    var textMatches = item.name.toLowerCase().indexOf(search) !== -1;
    return categoryMatches && textMatches;
  });

  shownItems.forEach(function (item) {
    grid.appendChild(createMenuCard(item));
  });

  byId("menu-empty").hidden = shownItems.length > 0;
}

function createMenuCard(item) {
  var card = createElement("article", "menu-card");
  card.appendChild(createItemImage(item, "item-image--card"));

  var footer = createElement("div", "menu-card-footer");
  var text = createElement("div", "menu-card-text");
  text.appendChild(createElement("p", "menu-card-name", item.name));
  text.appendChild(createElement("p", "menu-card-price", formatPrice(item.price)));

  var addButton = createElement("button", "add-button");
  addButton.type = "button";
  addButton.setAttribute("aria-label", "Add " + item.name);
  addButton.innerHTML = '<svg class="icon"><use href="#icon-plus"></use></svg>';

  footer.appendChild(text);
  footer.appendChild(addButton);
  card.appendChild(footer);

  // Clicking anywhere on the card (or the + button) opens the quantity pop-up
  card.addEventListener("click", function () {
    openItemModal(item);
  });

  return card;
}

function setCategory(categoryName) {
  state.activeCategory = categoryName;

  document.querySelectorAll(".category-tab").forEach(function (tab) {
    var isActive = tab.getAttribute("data-category") === categoryName;
    tab.classList.toggle("category-tab--active", isActive);
  });

  renderMenu();
}


/* =====================================================
   6. MY ORDERS SCREEN
   ===================================================== */
function renderOrders() {
  var list = byId("orders-list");
  list.innerHTML = "";

  getOrderLines().forEach(function (line) {
    var item = line.item;
    var row = createElement("div", "orders-row orders-row--item");

    // Column 1: picture, name, category
    var itemCell = createElement("div", "item-cell");
    itemCell.appendChild(createItemImage(item, "item-image--thumb"));
    var names = createElement("div");
    names.appendChild(createElement("p", "item-cell-name", item.name));
    names.appendChild(createElement("p", "item-cell-sub", item.category));
    itemCell.appendChild(names);
    row.appendChild(itemCell);

    // Columns 2 to 5
    row.appendChild(createElement("span", "cell-center", String(line.quantity)));

    var statusCell = createElement("span");
    statusCell.appendChild(createElement("span", "status-label", line.status));
    row.appendChild(statusCell);

    row.appendChild(createElement("span", "", formatPrice(item.price)));
    row.appendChild(createElement("span", "", formatPrice(item.price * line.quantity)));

    list.appendChild(row);
  });

  // There is always at least the Unlimited Samgyupsal line
  byId("orders-empty").hidden = true;
  byId("orders-total").textContent = formatPrice(getOrderTotal());

  byId("bill-out-button").textContent = state.billRequested ? "View Order Details" : "Bill Out";
}


/* =====================================================
   7. BILL OUT SCREEN AND BILL-OUT REQUEST
   ===================================================== */
function renderBill() {
  var list = byId("bill-list");
  list.innerHTML = "";

  getOrderLines().forEach(function (line) {
    var item = line.item;
    var row = createElement("div", "bill-row bill-row--item");

    var itemCell = createElement("div", "item-cell");
    itemCell.appendChild(createItemImage(item, "item-image--thumb"));
    var names = createElement("div");
    names.appendChild(createElement("p", "item-cell-name", item.name));
    names.appendChild(createElement("p", "item-cell-sub", item.category));
    itemCell.appendChild(names);
    row.appendChild(itemCell);

    row.appendChild(createElement("span", "cell-center", String(line.quantity)));
    row.appendChild(createElement("span", "", formatPrice(item.price * line.quantity)));

    list.appendChild(row);
  });

  byId("bill-total").textContent = formatPrice(getOrderTotal());
  updatePaymentButtons();

  // After bill out is requested, this screen becomes "Order Details" (view only)
  var requested = state.billRequested;
  byId("bill-title").textContent = requested ? "Order Details" : "Confirm Billing Out";
  byId("bill-subtitle").textContent = requested
    ? "Your bill out request has been sent. Please wait for the cashier at your table."
    : "Please review the details before proceeding.";
  byId("payment-choose").hidden = requested;
  byId("payment-status").hidden = !requested;
  byId("proceed-button").hidden = requested;
  byId("status-method").textContent = PAYMENT_METHODS[state.paymentMethod].label;
}

function setPaymentMethod(methodName) {
  state.paymentMethod = methodName;
  updatePaymentButtons();
}

// Updates which payment button is selected and the note under it
function updatePaymentButtons() {
  document.querySelectorAll(".payment-option").forEach(function (button) {
    var isSelected = button.getAttribute("data-payment") === state.paymentMethod;
    button.classList.toggle("payment-option--selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });

  byId("payment-note-text").textContent = PAYMENT_METHODS[state.paymentMethod].note;
}

// The customer confirmed the payment method: send the bill-out request.
// This is NOT the payment yet. The cashier still has to go to the table.
function requestBillOut() {
  // BACKEND: send the table number, chosen payment method and total to the cashier here.
  state.billRequested = true;
  saveValue(KEYS.billRequested, "yes");

  byId("bill-requested-method").textContent = PAYMENT_METHODS[state.paymentMethod].label;
  byId("bill-requested-total").textContent = formatPrice(getOrderTotal());
  openModal("modal-thanks");
  updateTimer(); // locks the menu right away
}

// After the request, show the Order Details while waiting for the cashier
function closeBillRequested() {
  closeModal();
  showView("bill");
}

/* Clears the table for the next guests.
   BACKEND: the cashier/staff side should trigger this AFTER the payment is received.
   For testing, type resetTable() in the browser console. */
function resetTable() {
  state.orders = [];
  saveOrders();
  state.paymentMethod = "cash";
  state.billRequested = false;

  removeValue(KEYS.billRequested);
  removeValue(KEYS.sessionEnd);
  removeValue(KEYS.warningShown);
  removeValue(KEYS.timeUpShown);
  startSession();
  updateTimer();

  closeModal();
  setCategory("All");
  byId("search-input").value = "";
  state.searchText = "";
  renderMenu();
  showView("menu");
}


/* =====================================================
   8. POP-UPS (MODALS)
   ===================================================== */
function openModal(modalId) {
  // Hide every pop-up first, then show the one we want
  document.querySelectorAll(".modal").forEach(function (modal) {
    modal.hidden = true;
  });

  byId("modal-overlay").hidden = false;
  byId(modalId).hidden = false;
  state.openModal = modalId;

  // The Assistance button looks selected while its pop-up is open
  if (modalId === "modal-assist-ask" || modalId === "modal-assist-done") {
    highlightNav("assistance");
  }
}

function closeModal() {
  state.openModal = "";
  byId("modal-overlay").hidden = true;
  document.querySelectorAll(".modal").forEach(function (modal) {
    modal.hidden = true;
  });

  highlightNav(state.currentView === "bill" ? "orders" : state.currentView);
}

// true when the table can no longer add orders
function isOrderingClosed() {
  return isTimeUp() || state.billRequested;
}

function orderingClosedMessage() {
  return state.billRequested
    ? "Ordering is closed. You have already requested bill out."
    : "Ordering is closed. Your dining time is over.";
}

/* ----- Select item pop-up ----- */
function openItemModal(item) {
  if (isOrderingClosed()) {
    showToast(orderingClosedMessage());
    return;
  }

  state.selectedItem = item;

  var imageSlot = byId("item-modal-image");
  imageSlot.innerHTML = "";
  imageSlot.appendChild(createItemImage(item, "item-image--modal"));

  byId("item-modal-name").textContent = item.name;
  byId("item-modal-price").textContent = formatPrice(item.price);
  setQuantity(1);

  openModal("modal-item");
}

// Keeps the quantity between 1 and the maximum
function setQuantity(value) {
  var quantity = parseInt(value, 10);
  if (isNaN(quantity) || quantity < 1) quantity = 1;
  if (quantity > SETTINGS.maxQuantity) quantity = SETTINGS.maxQuantity;
  byId("quantity-input").value = quantity;
  return quantity;
}

function confirmItem() {
  if (isOrderingClosed()) {
    closeModal();
    showToast(orderingClosedMessage());
    return;
  }

  var quantity = setQuantity(byId("quantity-input").value);
  var item = state.selectedItem;

  // BACKEND: send this order to the kitchen / server.
  addToOrders(item.id, quantity);
  closeModal();
  showToast(quantity + " x " + item.name + " added to your orders.");
}

/* ----- Payment pop-up ----- */
function openPaymentConfirm() {
  byId("pay-confirm-method").textContent = PAYMENT_METHODS[state.paymentMethod].label;
  openModal("modal-pay-confirm");
}


/* =====================================================
   9. REMAINING-TIME COUNTDOWN
   ===================================================== */

// Starts (or continues after a refresh) the dining-time countdown
function startSession() {
  var savedEnd = parseInt(loadValue(KEYS.sessionEnd, ""), 10);

  if (isNaN(savedEnd)) {
    // A brand-new dining session
    savedEnd = Date.now() + SETTINGS.sessionMinutes * 60 * 1000;
    saveValue(KEYS.sessionEnd, savedEnd);
    removeValue(KEYS.warningShown);
    removeValue(KEYS.timeUpShown);
    removeValue(KEYS.billRequested);
  }

  state.sessionEndTime = savedEnd;
  state.warningShown = loadValue(KEYS.warningShown, "") === "yes";
  state.timeUpShown = loadValue(KEYS.timeUpShown, "") === "yes";
  state.billRequested = loadValue(KEYS.billRequested, "") === "yes";
}

function getSecondsLeft() {
  return Math.max(0, Math.floor((state.sessionEndTime - Date.now()) / 1000));
}

// true when the dining time is over
function isTimeUp() {
  return getSecondsLeft() === 0;
}

function isModalOpen() {
  return !byId("modal-overlay").hidden;
}

function padTwoDigits(number) {
  return number < 10 ? "0" + number : String(number);
}

// Turns 7199 seconds into "1:59:59"
function formatTime(totalSeconds) {
  var hours = Math.floor(totalSeconds / 3600);
  var minutes = Math.floor((totalSeconds % 3600) / 60);
  var seconds = totalSeconds % 60;
  return hours + ":" + padTwoDigits(minutes) + ":" + padTwoDigits(seconds);
}

// Runs every second
function updateTimer() {
  var secondsLeft = getSecondsLeft();
  var timerBox = document.querySelector(".info-item--timer");

  byId("time-remaining").textContent = formatTime(secondsLeft);

  // The timer changes color when time is almost up / over (see order.css)
  timerBox.classList.toggle("timer--warning", secondsLeft > 0 && secondsLeft <= SETTINGS.warningMinutes * 60);
  timerBox.classList.toggle("timer--over", secondsLeft === 0);

  lockOrdering(isOrderingClosed());
  checkTimePopups(secondsLeft);
}

// Greys out the menu and shows a message when ordering is closed
function lockOrdering(isLocked) {
  byId("menu-grid").classList.toggle("menu-grid--closed", isLocked);
  byId("closed-banner").hidden = !isLocked;

  byId("closed-banner").textContent = state.billRequested
    ? "You have requested bill out, so ordering is now closed. Please wait for the cashier at your table."
    : "Your dining time is over, so ordering is now closed. Please bill out or ask our staff for help.";
}

// Shows the "almost up" and "time's up" pop-ups (each one only once per dining session)
function checkTimePopups(secondsLeft) {
  // No time pop-ups once the bill has been requested
  if (state.billRequested) return;

  var warningSeconds = SETTINGS.warningMinutes * 60;

  if (secondsLeft === 0) {
    // Close anything that is still about ordering
    if (state.openModal === "modal-item" || state.openModal === "modal-time-warning") {
      closeModal();
    }

    if (!state.timeUpShown && !isModalOpen()) {
      state.timeUpShown = true;
      saveValue(KEYS.timeUpShown, "yes");
      openModal("modal-time-up");
    }
    return;
  }

  // If another pop-up is open (for example payment), wait until it is closed
  if (secondsLeft <= warningSeconds && !state.warningShown && !isModalOpen()) {
    state.warningShown = true;
    saveValue(KEYS.warningShown, "yes");

    var minutesLeft = Math.ceil(secondsLeft / 60);
    byId("time-warning-minutes").textContent = minutesLeft + (minutesLeft === 1 ? " minute" : " minutes");
    openModal("modal-time-warning");
  }
}

/* =====================================================
   10. START-UP
   ===================================================== */
// Opens the Bill Out screen (or the Order Details, if bill out was already requested)
function goToBillOut() {
  showView("bill");
}

function setUpEvents() {
  // Side menu
  document.querySelectorAll(".nav-button").forEach(function (button) {
    button.addEventListener("click", function () {
      var target = button.getAttribute("data-nav");
      if (target === "assistance") {
        openModal("modal-assist-ask");
      } else {
        showView(target);
      }
    });
  });

  // Category tabs and search
  document.querySelectorAll(".category-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      setCategory(tab.getAttribute("data-category"));
    });
  });

  byId("search-input").addEventListener("input", function (event) {
    state.searchText = event.target.value;
    renderMenu();
  });

  // Quantity pop-up
  byId("quantity-minus").addEventListener("click", function () {
    setQuantity(parseInt(byId("quantity-input").value, 10) - 1);
  });
  byId("quantity-plus").addEventListener("click", function () {
    setQuantity(parseInt(byId("quantity-input").value, 10) + 1);
  });
  byId("quantity-input").addEventListener("change", function (event) {
    setQuantity(event.target.value);
  });
  byId("item-cancel-button").addEventListener("click", closeModal);
  byId("item-confirm-button").addEventListener("click", confirmItem);

  // My Orders -> Bill Out (always allowed, since the per-pax set is always on the bill)
  byId("bill-out-button").addEventListener("click", goToBillOut);

  // Payment method and bill-out request
  document.querySelectorAll(".payment-option").forEach(function (button) {
    button.addEventListener("click", function () {
      setPaymentMethod(button.getAttribute("data-payment"));
    });
  });
  byId("proceed-button").addEventListener("click", openPaymentConfirm);
  byId("pay-cancel-button").addEventListener("click", closeModal);
  byId("pay-confirm-button").addEventListener("click", requestBillOut);
  byId("bill-requested-ok-button").addEventListener("click", closeBillRequested);

  // Time pop-ups
  byId("time-warning-ok-button").addEventListener("click", closeModal);
  byId("time-up-ok-button").addEventListener("click", closeModal);
  byId("time-up-bill-button").addEventListener("click", function () {
    closeModal();
    goToBillOut();
  });

  // Request assistance
  byId("assist-no-button").addEventListener("click", closeModal);
  byId("assist-yes-button").addEventListener("click", function () {
    // BACKEND: send a "table needs help" message to the staff here.
    openModal("modal-assist-done");
  });
  byId("assist-ok-button").addEventListener("click", closeModal);
}

/* Deletes everything saved in the browser.
   Called on every page load, so pressing the browser's Refresh button
   starts a brand-new table: no orders, full 2:00:00 timer, no bill-out request.
   To KEEP the data after a refresh instead, delete the clearSavedData() line below. */
function clearSavedData() {
  Object.keys(KEYS).forEach(function (name) {
    removeValue(KEYS[name]);
  });
}

document.addEventListener("DOMContentLoaded", function () {
  byId("table-number").textContent = SETTINGS.tableNumber;
  byId("pax-count").textContent = SETTINGS.paxCount;

  clearSavedData(); // refresh = reset
  loadOrders();
  startSession();
  updateTimer();
  setInterval(updateTimer, 1000);

  setUpEvents();
  updatePaymentButtons();
  renderMenu();
  showView("menu");
});