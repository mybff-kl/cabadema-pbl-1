/* =====================================================
   UNLTD 199 - Queue Kiosk
   MAIN JAVASCRIPT (used by all four screens)
   -----------------------------------------------------
   1. Settings (EDIT NUMBERS HERE)
   2. Helper functions
   3. Screen 1 - Keypad (main.html)
   4. Screen 2 - Confirm (confirm.html)
   5. Screen 3 - Queue number (queue-number.html)
   6. Screen 4 - Queue view (queue-view.html)
   7. Start-up: run the code for whichever page is open

   IMPORTANT: There is NO real database or server here.
   Queue numbers are saved in the browser (localStorage) and the
   "Now Serving" number is sample data. To use real data later,
   replace the functions in section 2 marked "MOCK DATA".
   ===================================================== */


/* =====================================================
   1. SETTINGS
   ===================================================== */
var SETTINGS = {
  maxPartySize: 20,         // largest group allowed
  maxDigits: 2,             // how many digits the keypad accepts
  queuePrefix: "",       
  minutesPerGroup: 5,       // used to estimate the wait time
  countdownSeconds: 10,     // seconds before screen 3 moves to screen 4
  startingNowServing: 3,    // sample data: first number being served
  startingLastIssued: 4     // sample data: last number already handed out
};

// Names used to save data in the browser
var KEYS = {
  partySize: "kioskPartySize",
  queueNumber: "kioskQueueNumber",
  waitMinutes: "kioskWaitMinutes",
  lastIssued: "kioskLastIssued",
  nowServing: "kioskNowServing"
};


/* =====================================================
   2. HELPER FUNCTIONS
   ===================================================== */

// Save a value in the browser
function saveValue(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch (error) {
    console.warn("Could not save data in this browser.", error);
  }
}

// Read a value from the browser (returns fallback if nothing saved)
function loadValue(key, fallback) {
  try {
    var value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

function loadNumber(key, fallback) {
  var number = parseInt(loadValue(key, ""), 10);
  return isNaN(number) ? fallback : number;
}

// Turn 5 into "A-005"
function formatQueueNumber(number) {
  var text = String(number);
  while (text.length < 3) {
    text = "0" + text;
  }
  return SETTINGS.queuePrefix + text;
}

// Show a short message at the bottom of the screen
function showToast(message) {
  var toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("toast--visible");

  setTimeout(function () {
    toast.classList.remove("toast--visible");
  }, 2500);
}

// Go to another page (path is relative to the page that is open)
function goTo(path) {
  window.location.href = path;
}

// If the logo image is missing, show the text version instead
function setUpLogoFallback() {
  var logoImages = document.querySelectorAll(".logo-image");

  logoImages.forEach(function (image) {
    function showFallback() {
      image.parentElement.classList.add("logo-missing");
    }

    image.addEventListener("error", showFallback);

    // The image may have already failed before this code ran
    if (image.complete && image.naturalWidth === 0) {
      showFallback();
    }
  });
}

/* ---------- MOCK DATA ----------
   Replace these two functions with real requests to a server
   when you build the backend. */

// Hands out the next queue number and works out the wait time
function createQueueTicket() {
  var lastIssued = loadNumber(KEYS.lastIssued, SETTINGS.startingLastIssued);
  var nowServing = loadNumber(KEYS.nowServing, SETTINGS.startingNowServing);

  var newNumber = lastIssued + 1;
  var groupsAhead = newNumber - nowServing - 1;
  if (groupsAhead < 0) groupsAhead = 0;

  // At least one "slot" of waiting time, then 5 minutes per group ahead
  var waitMinutes = (groupsAhead + 1) * SETTINGS.minutesPerGroup;

  saveValue(KEYS.lastIssued, newNumber);
  saveValue(KEYS.queueNumber, newNumber);
  saveValue(KEYS.waitMinutes, waitMinutes);
}


/* =====================================================
   3. SCREEN 1 - KEYPAD (main.html)
   ===================================================== */
function setUpKeypadScreen() {
  var display = document.getElementById("keypad-display");
  var keyButtons = document.querySelectorAll(".keypad-button");
  var generateButton = document.getElementById("generate-button");
  var typedDigits = "";

  function updateDisplay() {
    display.textContent = typedDigits;
  }

  function pressKey(key) {
    if (key === "backspace") {
      typedDigits = typedDigits.slice(0, -1);
    } else if (typedDigits.length < SETTINGS.maxDigits) {
      typedDigits = typedDigits + key;
    }
    updateDisplay();
  }

  keyButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      pressKey(button.getAttribute("data-key"));
    });
  });

  // Also allow the computer keyboard (handy when testing)
  document.addEventListener("keydown", function (event) {
    if (event.key >= "0" && event.key <= "9") {
      pressKey(event.key);
    } else if (event.key === "Backspace") {
      pressKey("backspace");
    } else if (event.key === "Enter") {
      generateButton.click();
    }
  });

  generateButton.addEventListener("click", function () {
    var partySize = parseInt(typedDigits, 10);

    if (isNaN(partySize) || partySize < 1) {
      showToast("Please enter the number of people.");
      return;
    }
    if (partySize > SETTINGS.maxPartySize) {
      showToast("Maximum group size is " + SETTINGS.maxPartySize + ". Please ask our staff.");
      return;
    }

    saveValue(KEYS.partySize, partySize);
    goTo("confirm.html");
  });
}


/* =====================================================
   4. SCREEN 2 - CONFIRM (confirm.html)
   ===================================================== */
function setUpConfirmScreen() {
  var partySize = loadNumber(KEYS.partySize, 0);

  // Nothing was entered, so go back to the start
  if (partySize < 1) {
    goTo("main.html");
    return;
  }

  document.getElementById("confirm-number").textContent = partySize;
  document.getElementById("confirm-label").textContent = partySize === 1 ? "person" : "people";

  document.getElementById("cancel-button").addEventListener("click", function () {
    goTo("main.html");
  });

  document.getElementById("confirm-button").addEventListener("click", function () {
    createQueueTicket();
    goTo("queue-number.html");
  });
}


/* =====================================================
   5. SCREEN 3 - QUEUE NUMBER (queue-number.html)
   ===================================================== */
function setUpQueueNumberScreen() {
  var queueNumber = loadNumber(KEYS.queueNumber, 0);

  // No ticket yet, so go back to the start
  if (queueNumber < 1) {
    goTo("main.html");
    return;
  }

  var waitMinutes = loadNumber(KEYS.waitMinutes, SETTINGS.minutesPerGroup);

  document.getElementById("queue-number-text").textContent = formatQueueNumber(queueNumber);
  document.getElementById("wait-time-text").textContent = waitMinutes + " min";

  // Countdown, then move to the queue view
  var secondsLeft = SETTINGS.countdownSeconds;
  var countdownDisplay = document.getElementById("countdown-number");
  countdownDisplay.textContent = secondsLeft;

  var timer = setInterval(function () {
    secondsLeft = secondsLeft - 1;
    countdownDisplay.textContent = secondsLeft;

    if (secondsLeft <= 0) {
      clearInterval(timer);
      goTo("queue-view.html");
    }
  }, 1000);
}


/* =====================================================
   6. SCREEN 4 - QUEUE VIEW (queue-view.html)
   ===================================================== */
function setUpQueueViewScreen() {
  var nowServingBox = document.getElementById("now-serving-number");
  var nextBox = document.getElementById("next-number");

  function showQueue() {
    var lastIssued = loadNumber(KEYS.lastIssued, SETTINGS.startingLastIssued);
    var nowServing = loadNumber(KEYS.nowServing, SETTINGS.startingNowServing);

    nowServingBox.textContent = formatQueueNumber(nowServing);

    // Only show a "next" number if someone is actually waiting
    if (nowServing < lastIssued) {
      nextBox.textContent = formatQueueNumber(nowServing + 1);
    } else {
      nextBox.textContent = "---";
    }
  }

  showQueue();

  // If the queue changes in another tab, update this screen too
  window.addEventListener("storage", showQueue);
}


/* =====================================================
   7. START-UP
   Checks which page is open and runs the matching code.
   ===================================================== */
document.addEventListener("DOMContentLoaded", function () {
  setUpLogoFallback();

  if (document.getElementById("keypad-display")) {
    setUpKeypadScreen();
  }
  if (document.getElementById("confirm-number")) {
    setUpConfirmScreen();
  }
  if (document.getElementById("queue-number-text")) {
    setUpQueueNumberScreen();
  }
  if (document.getElementById("now-serving-number")) {
    setUpQueueViewScreen();
  }
});
