// script.js

let quotes = [];
let selectedCategory = "all";

// Load quotes from localStorage
function loadQuotes() {
  const storedQuotes = localStorage.getItem("quotes");
  if (storedQuotes) {
    quotes = JSON.parse(storedQuotes);
  } else {
    quotes = [
      { text: "The only limit to our realization of tomorrow is our doubts of today.", category: "Motivation" },
      { text: "In the middle of every difficulty lies opportunity.", category: "Inspiration" }
    ];
    saveQuotes();
  }
}

// Save quotes to localStorage
function saveQuotes() {
  localStorage.setItem("quotes", JSON.stringify(quotes));
}

// Display random quote
function showRandomQuote() {
  let filtered = quotes;
  if (selectedCategory !== "all") {
    filtered = quotes.filter(q => q.category === selectedCategory);
  }
  if (filtered.length === 0) return;
  const randomIndex = Math.floor(Math.random() * filtered.length);
  const quote = filtered[randomIndex];

  const display = document.getElementById("quoteDisplay");
  display.innerHTML = `<p>"${quote.text}"</p><span>- ${quote.category}</span>`;
  sessionStorage.setItem("lastQuote", JSON.stringify(quote));
}

// Populate categories dynamically
function populateCategories() {
  const filter = document.getElementById("categoryFilter");
  const categories = [...new Set(quotes.map(q => q.category))];
  filter.innerHTML = `<option value="all">All Categories</option>`;
  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    filter.appendChild(option);
  });

  const storedCategory = localStorage.getItem("selectedCategory");
  if (storedCategory) {
    selectedCategory = storedCategory;
    filter.value = storedCategory;
  }
}

// Filter quotes by category
function filterQuotes() {
  const filter = document.getElementById("categoryFilter");
  selectedCategory = filter.value;
  localStorage.setItem("selectedCategory", selectedCategory);
  showRandomQuote();
}

// Add new quote
function addQuote(text, category) {
  if (!text || !category) {
    alert("Please enter both text and category.");
    return;
  }
  const newQuote = { text, category };
  quotes.push(newQuote);
  saveQuotes();
  populateCategories();
  notifyUser("New quote added locally!");
  postQuoteToServer(newQuote);
}

// Create Add-Quote form
function createAddQuoteForm() {
  const container = document.getElementById("formContainer");
  container.innerHTML = `
    <form id="addQuoteForm" onsubmit="event.preventDefault(); addQuote(
      document.getElementById('newQuoteText').value,
      document.getElementById('newQuoteCategory').value
    ); this.reset();">
      <input id="newQuoteText" type="text" placeholder="Enter a new quote" />
      <input id="newQuoteCategory" type="text" placeholder="Enter quote category" />
      <button type="submit">Add Quote</button>
    </form>
  `;
}

// ====== SERVER SYNCING ======

// Fetch quotes from server
async function fetchQuotesFromServer() {
  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/posts");
    const data = await response.json();
    // Simulate server quotes using "title" and "body"
    return data.slice(0, 5).map(item => ({
      text: item.title,
      category: "Server"
    }));
  } catch (error) {
    console.error("Error fetching from server", error);
    return [];
  }
}

// Post a quote to the server
async function postQuoteToServer(quote) {
  try {
    await fetch("https://jsonplaceholder.typicode.com/posts", {
      method: "POST",
      body: JSON.stringify(quote),
      headers: { "Content-Type": "application/json" }
    });
    notifyUser("Quote synced with server!");
  } catch (error) {
    console.error("Error posting to server", error);
  }
}

// Sync local quotes with server quotes
async function syncQuotes() {
  const serverQuotes = await fetchQuotesFromServer();

  // Conflict resolution: Server takes precedence
  if (serverQuotes.length > 0) {
    quotes = [...quotes, ...serverQuotes];
    quotes = Array.from(new Map(quotes.map(q => [q.text, q])).values()); // remove duplicates
    saveQuotes();
    populateCategories();
    notifyUser("Quotes synced with server. Conflicts resolved.");
  }
}

// Notify user of updates
function notifyUser(message) {
  const notify = document.getElementById("notification");
  notify.textContent = message;
  notify.style.display = "block";
  setTimeout(() => (notify.style.display = "none"), 4000);
}

// ====== EVENT LISTENERS ======
document.getElementById("newQuote").addEventListener("click", showRandomQuote);
document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(quotes, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "quotes.json";
  a.click();
  URL.revokeObjectURL(url);
});
document.getElementById("clearStorage").addEventListener("click", () => {
  localStorage.clear();
  quotes = [];
  saveQuotes();
  showRandomQuote();
});

// JSON import function
function importFromJsonFile(event) {
  const fileReader = new FileReader();
  fileReader.onload = function (e) {
    const importedQuotes = JSON.parse(e.target.result);
    quotes.push(...importedQuotes);
    saveQuotes();
    populateCategories();
    notifyUser("Quotes imported successfully!");
  };
  fileReader.readAsText(event.target.files[0]);
}

// Initialize
loadQuotes();
populateCategories();
createAddQuoteForm();
showRandomQuote();

// Periodic sync every 20s
setInterval(syncQuotes, 20000);