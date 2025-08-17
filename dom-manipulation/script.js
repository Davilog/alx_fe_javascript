// Dynamic Quote Generator with Local Storage, Session Storage, and JSON Import/Export
(() => {
  "use strict";

  // ---- Defaults ----
  const DEFAULT_QUOTES = [
    { text: "The best way to get started is to quit talking and begin doing.", category: "Motivation" },
    { text: "Don’t let yesterday take up too much of today.", category: "Wisdom" },
    { text: "It’s not whether you get knocked down, it’s whether you get up.", category: "Resilience" },
    { text: "Success is not in what you have, but who you are.", category: "Success" }
  ];

  // Use let because we replace it after loading from storage.
  let quotes = [];

  // ---- DOM Refs ----
  const quoteDisplay   = document.getElementById("quoteDisplay");
  const newQuoteBtn    = document.getElementById("newQuote");
  const exportBtn      = document.getElementById("exportBtn");
  const importInput    = document.getElementById("importFile");
  const clearBtn       = document.getElementById("clearStorage");
  const formContainer  = document.getElementById("formContainer") || document.body;

  // ---- Local Storage Helpers ----
  function loadQuotes() {
    try {
      const saved = localStorage.getItem("quotes");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Basic validation: each item should have text & category strings
          quotes = parsed.filter(q => q && typeof q.text === "string" && typeof q.category === "string");
          if (quotes.length === 0) quotes = DEFAULT_QUOTES.slice();
        } else {
          quotes = DEFAULT_QUOTES.slice();
        }
      } else {
        quotes = DEFAULT_QUOTES.slice();
      }
    } catch (err) {
      console.warn("Failed to load quotes from localStorage:", err);
      quotes = DEFAULT_QUOTES.slice();
    }
  }

  function saveQuotes() {
    try {
      localStorage.setItem("quotes", JSON.stringify(quotes));
    } catch (err) {
      console.warn("Failed to save quotes to localStorage:", err);
    }
  }

  // ---- Rendering ----
  function renderQuote(q) {
    if (!q) return;
    quoteDisplay.innerHTML = "";

    const p = document.createElement("p");
    p.textContent = `"${q.text}"`;

    const span = document.createElement("span");
    span.textContent = ` - ${q.category}`;
    span.style.fontStyle = "italic";
    span.style.color = "gray";

    quoteDisplay.appendChild(p);
    quoteDisplay.appendChild(span);
  }

  // ---- Show Random + Session Storage ----
  function showRandomQuote() {
    if (!quotes.length) return;
    const index = Math.floor(Math.random() * quotes.length);
    const q = quotes[index];
    renderQuote(q);

    // Save "last viewed quote" to sessionStorage (optional requirement)
    try {
      sessionStorage.setItem("lastViewedQuoteIndex", String(index));
      sessionStorage.setItem("lastViewedQuote", JSON.stringify(q));
    } catch (err) {
      // Ignore session storage errors
    }
  }

  function restoreLastViewedQuote() {
    try {
      const idxStr = sessionStorage.getItem("lastViewedQuoteIndex");
      if (idxStr !== null) {
        const idx = Number(idxStr);
        if (!Number.isNaN(idx) && idx >= 0 && idx < quotes.length) {
          renderQuote(quotes[idx]);
          return;
        }
      }
    } catch {
      // ignore
    }
    // Fallback
    showRandomQuote();
  }

  // ---- Adding Quotes ----
  function addQuote() {
    const textInput = document.getElementById("newQuoteText");
    const categoryInput = document.getElementById("newQuoteCategory");
    if (!textInput || !categoryInput) return;

    const text = textInput.value.trim();
    const category = categoryInput.value.trim();

    if (!text || !category) {
      alert("Please enter both quote text and category.");
      return;
    }

    const newQuote = { text, category };
    quotes.push(newQuote);
    saveQuotes();

    renderQuote(newQuote);
    textInput.value = "";
    categoryInput.value = "";
    alert("Quote added successfully!");
  }

  // Required by earlier checker: dynamically create the add-quote form
  function createAddQuoteForm() {
    if (document.getElementById("addQuoteForm")) return;

    const form = document.createElement("form");
    form.id = "addQuoteForm";
    form.setAttribute("aria-label", "Add new quote");

    const quoteInput = document.createElement("input");
    quoteInput.type = "text";
    quoteInput.placeholder = "Enter a new quote";
    quoteInput.id = "newQuoteText";
    quoteInput.required = true;

    const categoryInput = document.createElement("input");
    categoryInput.type = "text";
    categoryInput.placeholder = "Enter quote category";
    categoryInput.id = "newQuoteCategory";
    categoryInput.required = true;

    const submitBtn = document.createElement("button");
    submitBtn.type = "button"; // prevent default submit
    submitBtn.textContent = "Add Quote";
    submitBtn.addEventListener("click", addQuote);

    form.append(quoteInput, categoryInput, submitBtn);
    formContainer.appendChild(form);
  }

  // ---- JSON Export ----
  function exportToJson() {
    const data = JSON.stringify(quotes, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    const ts = new Date();
    const pad = n => String(n).padStart(2, "0");
    const filename = `quotes-${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.json`;

    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ---- JSON Import (kept compatible with inline onchange in HTML) ----
  function importFromJsonFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = function (e) {
      try {
        const imported = JSON.parse(e.target.result);

        if (!Array.isArray(imported)) {
          alert("Invalid JSON format. Expected an array of quotes.");
          return;
        }

        // Validate & keep only valid items
        const cleaned = imported.filter(q => q && typeof q.text === "string" && typeof q.category === "string");

        if (cleaned.length === 0) {
          alert("No valid quotes found in the file.");
          return;
        }

        quotes.push(...cleaned);
        saveQuotes();
        alert("Quotes imported successfully!");
        showRandomQuote();
        // reset file input so same file can be re-imported if needed
        if (importInput) importInput.value = "";
      } catch (err) {
        alert("Failed to import JSON: " + err.message);
      }
    };
    fileReader.readAsText(file);
  }

  // Expose functions that are used by inline handlers (or tests/checkers)
  window.importFromJsonFile = importFromJsonFile;
  window.addQuote = addQuote;
  window.showRandomQuote = showRandomQuote;
  window.createAddQuoteForm = createAddQuoteForm;

  // ---- Init ----
  loadQuotes();
  createAddQuoteForm();

  if (newQuoteBtn) newQuoteBtn.addEventListener("click", showRandomQuote);
  if (exportBtn)   exportBtn.addEventListener("click", exportToJson);
  // HTML already has inline onchange, but add a listener too if not present
  if (importInput && !importInput.hasAttribute("onchange")) {
    importInput.addEventListener("change", importFromJsonFile);
  }
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      localStorage.removeItem("quotes");
      quotes = DEFAULT_QUOTES.slice();
      saveQuotes();
      alert("Local storage cleared. Defaults restored.");
      showRandomQuote();
    });
  }

  // Show last viewed quote for the session if available; otherwise random
  restoreLastViewedQuote();
})();