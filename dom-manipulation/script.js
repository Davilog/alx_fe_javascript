// Dynamic Quote Generator with Category Filtering, Local/Session Storage, and JSON Import/Export
(() => {
  "use strict";

  // ---- Defaults ----
  const DEFAULT_QUOTES = [
    { text: "The best way to get started is to quit talking and begin doing.", category: "Motivation" },
    { text: "Don’t let yesterday take up too much of today.", category: "Wisdom" },
    { text: "It’s not whether you get knocked down, it’s whether you get up.", category: "Resilience" },
    { text: "Success is not in what you have, but who you are.", category: "Success" }
  ];

  let quotes = [];

  // ---- DOM Refs ----
  const quoteDisplay  = document.getElementById("quoteDisplay");
  const newQuoteBtn   = document.getElementById("newQuote");
  const exportBtn     = document.getElementById("exportQuotes");
  const importInput   = document.getElementById("importFile");
  const clearBtn      = document.getElementById("clearStorage");
  const formContainer = document.getElementById("formContainer") || document.body;
  const categorySel   = document.getElementById("categoryFilter");

  // ---- Local Storage Helpers ----
  function loadQuotes() {
    try {
      const saved = localStorage.getItem("quotes");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          quotes = parsed.filter(q => q && typeof q.text === "string" && typeof q.category === "string");
          if (quotes.length === 0) quotes = DEFAULT_QUOTES.slice();
        } else {
          quotes = DEFAULT_QUOTES.slice();
        }
      } else {
        quotes = DEFAULT_QUOTES.slice();
      }
    } catch {
      quotes = DEFAULT_QUOTES.slice();
    }
  }

  function saveQuotes() {
    try {
      localStorage.setItem("quotes", JSON.stringify(quotes));
    } catch {}
  }

  // Persist last selected category
  function saveLastCategory(val) {
    try { localStorage.setItem("lastSelectedCategory", val); } catch {}
  }
  function loadLastCategory() {
    try { return localStorage.getItem("lastSelectedCategory") || "all"; } catch { return "all"; }
  }

  // ---- Rendering helpers ----
  function renderSingleQuote(q) {
    quoteDisplay.innerHTML = "";
    if (!q) return;
    const p = document.createElement("p");
    p.textContent = `"${q.text}"`;
    const span = document.createElement("span");
    span.textContent = ` - ${q.category}`;
    span.style.fontStyle = "italic";
    span.style.color = "gray";
    quoteDisplay.append(p, span);
  }

  function renderQuoteList(list) {
    quoteDisplay.innerHTML = "";
    if (!list || list.length === 0) {
      quoteDisplay.textContent = "No quotes match this category.";
      return;
    }
    const frag = document.createDocumentFragment();
    list.forEach(q => {
      const wrap = document.createElement("div");
      const p = document.createElement("p");
      p.textContent = `"${q.text}"`;
      const span = document.createElement("span");
      span.textContent = ` - ${q.category}`;
      span.style.fontStyle = "italic";
      span.style.color = "gray";
      wrap.append(p, span);
      frag.appendChild(wrap);
    });
    quoteDisplay.appendChild(frag);
  }

  // ---- Show Random + Session Storage ----
  function showRandomQuote() {
    if (!quotes.length) return;
    const idx = Math.floor(Math.random() * quotes.length);
    const q = quotes[idx];
    renderSingleQuote(q);
    try {
      sessionStorage.setItem("lastViewedQuoteIndex", String(idx));
      sessionStorage.setItem("lastViewedQuote", JSON.stringify(q));
    } catch {}
  }

  function restoreLastViewedQuote() {
    try {
      const idxStr = sessionStorage.getItem("lastViewedQuoteIndex");
      if (idxStr !== null) {
        const idx = Number(idxStr);
        if (!Number.isNaN(idx) && idx >= 0 && idx < quotes.length) {
          renderSingleQuote(quotes[idx]);
          return;
        }
      }
    } catch {}
    showRandomQuote();
  }

  // ---- Categories & Filtering ----
  function getUniqueCategories() {
    const set = new Set(quotes.map(q => q.category.trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  function populateCategories() {
    if (!categorySel) return;
    // preserve current selection if possible
    const current = categorySel.value || loadLastCategory();

    // Reset options (keep "All Categories" as the first)
    categorySel.innerHTML = "";
    const allOpt = document.createElement("option");
    allOpt.value = "all";
    allOpt.textContent = "All Categories";
    categorySel.appendChild(allOpt);

    // Add unique categories
    getUniqueCategories().forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      categorySel.appendChild(opt);
    });

    // Restore last or current
    const toSelect = current && [...categorySel.options].some(o => o.value === current) ? current : "all";
    categorySel.value = toSelect;
    saveLastCategory(toSelect);
  }

  function filterQuotes() {
    if (!categorySel) return;
    const value = categorySel.value;
    saveLastCategory(value);

    if (value === "all") {
      // Show a single random quote when "all" is selected
      showRandomQuote();
    } else {
      const filtered = quotes.filter(q => q.category === value);
      renderQuoteList(filtered);
    }
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

    // Update categories dropdown (in case it's a new category)
    populateCategories();

    // Refresh view according to current filter
    filterQuotes();

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
    submitBtn.type = "button";
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

  // ---- JSON Import ----
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
        const cleaned = imported.filter(q => q && typeof q.text === "string" && typeof q.category === "string");
        if (cleaned.length === 0) {
          alert("No valid quotes found in the file.");
          return;
        }
        quotes.push(...cleaned);
        saveQuotes();
        populateCategories();
        alert("Quotes imported successfully!");
        filterQuotes();
        if (importInput) importInput.value = "";
      } catch (err) {
        alert("Failed to import JSON: " + err.message);
      }
    };
    fileReader.readAsText(file);
  }

  // Expose functions for inline handlers/checkers
  window.importFromJsonFile = importFromJsonFile;
  window.addQuote = addQuote;
  window.showRandomQuote = showRandomQuote;
  window.createAddQuoteForm = createAddQuoteForm;
  window.populateCategories = populateCategories;
  window.filterQuotes = filterQuotes;

  // ---- Init ----
  loadQuotes();
  createAddQuoteForm();
  populateCategories();

  if (newQuoteBtn) newQuoteBtn.addEventListener("click", () => {
    // If a specific category is active, show from that category list; else random
    const sel = categorySel ? categorySel.value : "all";
    if (sel === "all") showRandomQuote();
    else filterQuotes();
  });

  if (exportBtn) exportBtn.addEventListener("click", exportToJson);

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      localStorage.removeItem("quotes");
      // don't clear lastSelectedCategory to show persistence of preference even when quotes reset
      quotes = DEFAULT_QUOTES.slice();
      saveQuotes();
      populateCategories();
      alert("Local storage cleared. Defaults restored.");
      filterQuotes();
    });
  }

  if (importInput && !importInput.hasAttribute("onchange")) {
    importInput.addEventListener("change", importFromJsonFile);
  }

  // Restore last filter and render accordingly
  const lastCat = loadLastCategory();
  if (categorySel) categorySel.value = lastCat;
  filterQuotes(); // will show list for a category or a random when "all"
})();
