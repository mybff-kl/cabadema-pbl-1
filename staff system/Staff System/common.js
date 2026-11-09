/* =====================================================
   UNLTD 199 - COMMON HELPERS
   Used by login.html and frontdesk.html.
   -----------------------------------------------------
   These are the same helper functions that the Queuing Screen
   (script.js) and the Customer Order Screen (order.js) already
   use (saving values in the browser, toast messages, ...),
   gathered in one file so the new pages do not repeat them.
   The existing screens keep their own copies and are not
   affected by this file.
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

/* ----- Saving values in the browser (localStorage) -----
   There is no database. Everything is saved in the browser. */
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

// Reads a list/object that was saved as text (JSON)
function loadJson(key, fallback) {
  try {
    var value = JSON.parse(loadValue(key, ""));
    return value === null || value === undefined ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

function saveJson(key, value) {
  saveValue(key, JSON.stringify(value));
}

/* ----- Saving values for this browser tab only (sessionStorage) -----
   Used for "is the Front Desk logged in?". Closing the tab logs out. */
function saveSessionValue(key, value) {
  try {
    sessionStorage.setItem(key, String(value));
  } catch (error) {
    console.warn("Could not save session data.", error);
  }
}

function loadSessionValue(key, fallback) {
  try {
    var value = sessionStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

function removeSessionValue(key) {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.warn("Could not remove session data.", error);
  }
}

/* ----- Time helpers ----- */
function padTwoDigits(number) {
  return number < 10 ? "0" + number : String(number);
}

// Turns 7199 seconds into "1:59:59"
function formatClock(totalSeconds) {
  var hours = Math.floor(totalSeconds / 3600);
  var minutes = Math.floor((totalSeconds % 3600) / 60);
  var seconds = totalSeconds % 60;
  return hours + ":" + padTwoDigits(minutes) + ":" + padTwoDigits(seconds);
}

// Turns a time stamp into "3:12 pm"
function formatTimeOfDay(timestamp) {
  var date = new Date(timestamp);
  var hours = date.getHours();
  var suffix = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return hours + ":" + padTwoDigits(date.getMinutes()) + " " + suffix;
}

/* ----- Messages and navigation ----- */

// Shows a short message at the bottom of the screen (needs <div id="toast" class="toast">)
var toastTimer = null;

function showToast(message, duration) {
  var toast = byId("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("toast--visible");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.classList.remove("toast--visible");
  }, duration || 3000);
}

// Go to another page (path is relative to the page that is open)
function goTo(path) {
  window.location.href = path;
}
