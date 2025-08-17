// script.js
// Dynamic Quote Generator with: localStorage, sessionStorage, filtering, JSON import/export,
// periodic server sync (JSONPlaceholder used for simulation), and conflict handling UI.

(() => {
  "use strict";

  // --- Config ---
  const SERVER_GET_URL = "https://jsonplaceholder.typicode.com/posts?_limit=8"; // mock GET
  const SERVER_POST_URL = "https://jsonplaceholder.typicode.com/posts"; // mock POST
  const SYNC_INTERVAL_MS = 60_000; // periodic sync interval (60s)

  // --- Defaults ---
  const DEFAULT_QUOTES = [
    { text: "The best way to get started is to quit talking and begin doing.", category: "Motivation" },
    { text: "Don’t let yesterday take up too much of today.", category: "Wisdom" },
    { text: "It’s not whether you get knocked down, it’s whether you get up.", category: "Resilience" },
    { text: "Success is not in what you have, but who you are.", category: "Success" }
  ];

  // --- State ---
  let quotes = []; // array of {id, text, category, lastModified, source}
  let conflicts = []; // array of { id, local, server }
  let autoSyncIntervalId = null;

  // --- DOM refs ---
  const categorySel  = document.getElementById("categoryFilter");
  const quoteDisplay = document.getElementById("quoteDisplay");
  const newQuoteBtn  = document.getElementById("newQuote");
  const exportBtn    = document.getElementById("exportQuotes");
  const importInput  = document.getElementById("importFile");
  const clearBtn     = document.getElementById("clearStorage");
  const formContainer= document.getElementById("formContainer");
  const syncNowBtn   = document.getElementById("syncNow");
  const autoSyncChk  = document.getElementById("autoSync");
  const syncStatus   = document.getElementById("syncStatus");
  const conflictList = document.getElementById("conflictList");
  const conflictsInner = document.getElementById("conflictsInner");
  const pushLocalBtn = document.getElementById("pushLocalBtn");

  // --- Helpers: IDs & metadata ---
  function makeLocalId() {
    return `local-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  }
  function ensureMetadataForQuotes(arr) {
    arr.forEach((q, idx) => {
      if (!q.id) q.id = q.source === "server" && q.serverId ? `server-${q.serverId}` : (q.source === "server" ? `server-${Date.now()}-${idx}` : makeLocalId());
      if (!q.lastModified) q.lastModified = Date.now();
      if (!q.source) q.source = q.id && q.id.toString().startsWith("server-") ? "server" : "local";
      // keep text & category normalized
      q.text = String(q.text || "").trim();
      q.category = String(q.category || "Uncategorized").trim();
    });
  }

  // --- localStorage load/save ---
  function loadQuotes() {
    try {
      const raw = localStorage.getItem("quotes");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          quotes = parsed;
        } else {
          quotes = DEFAULT_QUOTES.slice();
        }
      } else {
        quotes = DEFAULT_QUOTES.slice();
      }
    } catch (err) {
      console.warn("Failed to parse saved quotes:", err);
      quotes = DEFAULT_QUOTES.slice();
    }
    ensureMetadataForQuotes(quotes);
  }

  function saveQuotes() {
    try {
      localStorage.setItem("quotes", JSON.stringify(quotes));
    } catch (err) {
      console.warn("Failed to save quotes:", err);
    }
  }

  // --- Rendering ---
  function renderSingleQuote(q) {
    if (!q) {
      quoteDisplay.innerHTML = `<div class="meta">No quote available.</div>`;
      return;
    }
    quoteDisplay.innerHTML =
      `<div class="quote">"${escapeHtml(q.text)}"</div>
       <div class="meta">— ${escapeHtml(q.category)} ${q.source ? `(${q.source})` : ""}</div>`;
  }

  function renderQuoteList(list) {
    if (!list || list.length === 0) {
      quoteDisplay.innerHTML = `<div class="meta">No quotes match this category.</div>`;
      return;
    }
    const html = list.map(q =>
      `<div class="quote">"${escapeHtml(q.text)}" <div class="meta">— ${escapeHtml(q.category)} ${q.source ? `(${q.source})` : ""}</div></div>`
    ).join("");
    quoteDisplay.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  // --- Categories & filter ---
  function getUniqueCategories() {
    const set = new Set(quotes.map(q => (q.category||"").trim()).filter(Boolean));
    return Array.from(set).sort((a,b) => a.localeCompare(b));
  }

  function populateCategories() {
    if (!categorySel) return;
    const current = categorySel.value || loadLastCategory();
    categorySel.innerHTML = "";
    const allOpt = document.createElement("option");
    allOpt.value = "all";
    allOpt.textContent = "All Categories";
    categorySel.appendChild(allOpt);
    getUniqueCategories().forEach(cat => {
      const o = document.createElement("option");
      o.value = cat;
      o.textContent = cat;
      categorySel.appendChild(o);
    });
    const toSelect = [...categorySel.options].some(o => o.value === current) ? current : "all";
    categorySel.value = toSelect;
    saveLastCategory(toSelect);
  }

  // Persistence for last selected category
  function saveLastCategory(val) { try { localStorage.setItem("lastSelectedCategory", val); } catch {} }
  function loadLastCategory() { try { return localStorage.getItem("lastSelectedCategory") || "all"; } catch { return "all"; } }

  // --- Show random / restore ---
  function showRandomQuote() {
    if (!quotes.length) { renderSingleQuote(null); return; }
    const idx = Math.floor(Math.random() * quotes.length);
    const q = quotes[idx];
    renderSingleQuote(q);
    try { sessionStorage.setItem("lastViewedQuoteIndex", String(idx)); sessionStorage.setItem("lastViewedQuote", JSON.stringify(q)); } catch {}
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

  // --- Filter logic (uses selectedCategory variable as required) ---
  function filterQuotes() {
    if (!categorySel) return;
    const selectedCategory = categorySel.value;
    saveLastCategory(selectedCategory);

    if (selectedCategory === "all") {
      // show a single random quote when "all"
      showRandomQuote();
    } else {
      const filtered = quotes.filter(q => q.category === selectedCategory);
      renderQuoteList(filtered);
    }
  }

  // --- Add quote workflow ---
  function addQuote() {
    const textInput = document.getElementById("newQuoteText");
    const categoryInput = document.getElementById("newQuoteCategory");
    if (!textInput || !categoryInput) return;

    const text = textInput.value.trim();
    const category = categoryInput.value.trim();
    if (!text || !category) { alert("Please enter both quote text and category."); return; }

    const newQ = { id: makeLocalId(), text, category, lastModified: Date.now(), source: "local" };
    quotes.push(newQ);
    saveQuotes();
    populateCategories();
    filterQuotes();
    textInput.value = ""; categoryInput.value = "";
    alert("Quote added and saved locally.");
  }

  // Build add form dynamically
  function createAddQuoteForm() {
    if (document.getElementById("addQuoteForm")) return;
    const form = document.createElement("form");
    form.id = "addQuoteForm";
    form.onsubmit = (e) => { e.preventDefault(); addQuote(); };

    const quoteInput = document.createElement("input");
    quoteInput.type = "text"; quoteInput.id = "newQuoteText"; quoteInput.placeholder = "Enter a new quote"; quoteInput.required = true;

    const categoryInput = document.createElement("input");
    categoryInput.type = "text"; categoryInput.id = "newQuoteCategory"; categoryInput.placeholder = "Enter quote category"; categoryInput.required = true;

    const submitBtn = document.createElement("button");
    submitBtn.type = "submit"; submitBtn.textContent = "Add Quote";

    form.append(quoteInput, categoryInput, submitBtn);
    formContainer.appendChild(form);
  }

  // --- JSON export/import ---
  function exportToJsonFile() {
    const data = JSON.stringify(quotes, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ts = new Date(); const pad = n => String(n).padStart(2,"0");
    a.download = `quotes-${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}.json`;
    document.body.appendChild(a);
    a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function importFromJsonFile(event) {
    const file = event.target && event.target.files && event.target.files[0];
    if (!file) return;
    const fr = new FileReader();
    fr.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!Array.isArray(parsed)) { alert("JSON must be an array of quote objects."); return; }
        // Clean & add
        const cleaned = parsed.map(p => ({
          id: p.id ? String(p.id) : makeLocalId(),
          text: String(p.text || p.body || p.title || "").trim(),
          category: String(p.category || p.cat || "Imported").trim(),
          lastModified: p.lastModified ? Number(p.lastModified) : Date.now(),
          source: p.source || (p.id && String(p.id).startsWith("server-") ? "server" : "local")
        })).filter(q => q.text);
        if (cleaned.length === 0) { alert("No valid quotes found in the file."); return; }
        quotes.push(...cleaned);
        ensureMetadataForQuotes(quotes);
        saveQuotes(); populateCategories(); filterQuotes();
        alert(`Imported ${cleaned.length} quotes.`);
        if (importInput) importInput.value = "";
      } catch (err) {
        alert("Failed to import JSON: " + (err.message || err));
      }
    };
    fr.readAsText(file);
  }

  // --- Server sync simulation & conflict resolution ---
  // Map JSONPlaceholder posts -> quote objects
  function mapServerPostToQuote(post) {
    return {
      id: `server-${post.id}`,
      text: String(post.body || post.title || "").trim(),
      category: `server-${post.userId || "u"}`,
      lastModified: Date.now(),
      source: "server",
      serverId: post.id
    };
  }

  async function fetchServerQuotes() {
    try {
      const res = await fetch(SERVER_GET_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("Network response not ok");
      const arr = await res.json();
      if (!Array.isArray(arr)) return [];
      return arr.map(mapServerPostToQuote);
    } catch (err) {
      console.warn("Failed to fetch server quotes:", err);
      return [];
    }
  }

  // Sync logic: server wins in conflicts; collect conflict records
  async function syncWithServer(showNotification = true) {
    const serverQuotes = await fetchServerQuotes();
    if (!serverQuotes.length) {
      if (showNotification) setSyncStatus("No server updates found.");
      return { added:0, merged:0, conflictsResolved:0 };
    }

    const localMap = new Map(quotes.map(q => [String(q.id), q]));
    const serverMap = new Map(serverQuotes.map(sq => [String(sq.id), sq]));

    let added = 0, merged = 0, conflictsResolved = 0;
    const foundConflicts = [];

    // Apply server items: if same id exists -> server takes precedence
    serverQuotes.forEach(sq => {
      const local = localMap.get(sq.id);
      if (local) {
        // If different (simple JSON compare by text/category), record conflict and apply server
        if (local.text !== sq.text || local.category !== sq.category) {
          foundConflicts.push({ id: sq.id, local: {...local}, server: {...sq} });
          // server wins => replace local
          const idx = quotes.findIndex(q => q.id === sq.id);
          if (idx >= 0) { quotes[idx] = sq; merged++; conflictsResolved++; }
        } else {
          // identical -> nothing
        }
      } else {
        // new server quote -> add
        quotes.push(sq);
        added++;
      }
    });

    // (Optional) We do not remove local-only items; they stay local
    ensureMetadataForQuotes(quotes);
    saveQuotes();
    populateCategories();

    // store conflicts to UI and allow revert
    if (foundConflicts.length) {
      conflicts = foundConflicts;
      showConflictUI();
    }

    const message = `Sync complete. Added ${added} new, merged ${merged} server updates. Conflicts: ${foundConflicts.length}.`;
    if (showNotification) setSyncStatus(message);
    return { added, merged, conflictsResolved: foundConflicts.length };
  }

  // Show conflict UI listing and actions
  function showConflictUI() {
    if (!conflicts || conflicts.length === 0) {
      conflictList.hidden = true; conflictsInner.innerHTML = ""; return;
    }
    conflictList.hidden = false;
    conflictsInner.innerHTML = "";
    conflicts.forEach((c, idx) => {
      const div = document.createElement("div");
      div.className = "conflictItem";
      div.innerHTML = `
        <div><strong>ID:</strong> ${escapeHtml(c.id)}</div>
        <div><strong>Server version:</strong> "${escapeHtml(c.server.text)}" — <span class="meta">${escapeHtml(c.server.category)}</span></div>
        <div><strong>Local version:</strong> "${escapeHtml(c.local.text)}" — <span class="meta">${escapeHtml(c.local.category)}</span></div>
      `;
      const btnKeepLocal = document.createElement("button");
      btnKeepLocal.textContent = "Revert to Local";
      btnKeepLocal.addEventListener("click", () => {
        // find index and replace with local
        const i = quotes.findIndex(q => q.id === c.id);
        if (i >= 0) {
          quotes[i] = { ...c.local, lastModified: Date.now(), source: "local" };
          saveQuotes();
          populateCategories();
          filterQuotes();
          // remove conflict from list
          conflicts.splice(idx, 1);
          showConflictUI();
        }
      });

      const btnAcceptServer = document.createElement("button");
      btnAcceptServer.textContent = "Keep Server";
      btnAcceptServer.addEventListener("click", () => {
        // already applied server; just remove conflict record
        conflicts.splice(idx, 1);
        showConflictUI();
      });

      div.appendChild(btnKeepLocal);
      div.appendChild(btnAcceptServer);
      conflictsInner.appendChild(div);
    });
  }

  function setSyncStatus(text) {
    if (!syncStatus) return;
    syncStatus.textContent = text;
    // store last sync time
    try { localStorage.setItem("lastSyncAt", String(Date.now())); } catch {}
  }

  // --- Push local-only to server (simulate POST) ---
  async function pushLocalToServer() {
    // Find local-only quotes (not server ids)
    const localOnly = quotes.filter(q => !String(q.id).startsWith("server-"));
    if (!localOnly.length) { alert("No local-only quotes to push."); return; }
    let pushed = 0;
    for (const item of localOnly) {
      try {
        const res = await fetch(SERVER_POST_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: item.text, body: item.text, userId: 1 })
        });
        if (!res.ok) continue;
        const created = await res.json();
        // JSONPlaceholder returns an id; map it to server-<id> and update local item
        const serverId = created.id;
        item.id = `server-${serverId}`;
        item.serverId = serverId;
        item.source = "server";
        item.lastModified = Date.now();
        pushed++;
      } catch (err) {
        console.warn("Push failed for", item, err);
      }
    }
    if (pushed) {
      saveQuotes(); populateCategories(); filterQuotes();
      alert(`Pushed ${pushed} local items to server (simulation).`);
    } else {
      alert("No items pushed (network or server simulation issue).");
    }
  }

  // --- Auto sync toggle ---
  function setAutoSync(on) {
    if (on) {
      if (!autoSyncIntervalId) autoSyncIntervalId = setInterval(() => syncWithServer(false), SYNC_INTERVAL_MS);
    } else {
      if (autoSyncIntervalId) { clearInterval(autoSyncIntervalId); autoSyncIntervalId = null; }
    }
  }

  // --- Utilities + Exposure for inline handlers/checkers ---
  window.importFromJsonFile = importFromJsonFile;
  window.addQuote = addQuote;
  window.showRandomQuote = showRandomQuote;
  window.createAddQuoteForm = createAddQuoteForm;
  window.populateCategories = populateCategories;
  window.filterQuotes = filterQuotes;
  window.syncWithServer = syncWithServer;
  window.pushLocalToServer = pushLocalToServer;
  window.exportToJsonFile = exportToJsonFile;

  // --- Initialization ---
  loadQuotes();
  createAddQuoteForm();
  populateCategories();

  // Event bindings
  if (newQuoteBtn) newQuoteBtn.addEventListener("click", () => {
    const sel = categorySel ? categorySel.value : "all";
    if (sel === "all") showRandomQuote();
    else filterQuotes();
  });
  if (exportBtn) exportBtn.addEventListener("click", exportToJsonFile);
  if (importInput && !importInput.hasAttribute("onchange")) importInput.addEventListener("change", importFromJsonFile);
  if (clearBtn) clearBtn.addEventListener("click", () => {
    localStorage.removeItem("quotes");
    quotes = DEFAULT_QUOTES.slice();
    ensureMetadataForQuotes(quotes);
    saveQuotes(); populateCategories(); filterQuotes();
    alert("Local storage cleared and defaults restored.");
  });
  if (syncNowBtn) syncNowBtn.addEventListener("click", () => syncWithServer(true));
  if (autoSyncChk) {
    autoSyncChk.addEventListener("change", (e) => setAutoSync(e.target.checked));
    // restore autoSync preference if any
    try {
      const st = localStorage.getItem("autoSyncEnabled");
      if (st === "true") { autoSyncChk.checked = true; setAutoSync(true); }
    } catch {}
    // persist preference
    autoSyncChk.addEventListener("change", (e) => { try { localStorage.setItem("autoSyncEnabled", String(e.target.checked)); } catch {} });
  }
  if (pushLocalBtn) pushLocalBtn.addEventListener("click", pushLocalToServer);

  // Restore last selected category & view
  const lastCat = loadLastCategory();
  if (categorySel) categorySel.value = lastCat;
  filterQuotes();

  // Kick off a background sync (but quiet)
  syncWithServer(false);

  // Optionally start auto sync if enabled by storage
  try { if (localStorage.getItem("autoSyncEnabled") === "true") setAutoSync(true); } catch {}

})();
