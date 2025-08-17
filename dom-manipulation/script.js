// script.js

// DOM elements
const quoteInput = document.getElementById("quoteInput");
const addQuoteBtn = document.getElementById("addQuoteBtn");
const quotesList = document.getElementById("quotesList");
const syncBtn = document.getElementById("syncBtn");
const messageBox = document.getElementById("messageBox"); // container for notifications

// Load quotes from localStorage
function loadQuotes() {
  const quotes = JSON.parse(localStorage.getItem("quotes")) || [];
  quotesList.innerHTML = "";
  quotes.forEach((quote, index) => {
    const li = document.createElement("li");
    li.textContent = quote;
    li.classList.add("quote-item");

    // Delete button
    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.classList.add("delete-btn");
    delBtn.onclick = () => deleteQuote(index);

    li.appendChild(delBtn);
    quotesList.appendChild(li);
  });
}

// Add a new quote
function addQuote() {
  const quote = quoteInput.value.trim();
  if (quote === "") return;

  const quotes = JSON.parse(localStorage.getItem("quotes")) || [];
  quotes.push(quote);
  localStorage.setItem("quotes", JSON.stringify(quotes));
  quoteInput.value = "";
  loadQuotes();
}

// Delete a quote
function deleteQuote(index) {
  const quotes = JSON.parse(localStorage.getItem("quotes")) || [];
  quotes.splice(index, 1);
  localStorage.setItem("quotes", JSON.stringify(quotes));
  loadQuotes();
}

// Sync quotes (dummy example)
function syncQuotes() {
  const quotes = JSON.parse(localStorage.getItem("quotes")) || [];

  // Simulate sending to server
  console.log("Syncing with server:", quotes);

  // Show feedback message
  showMessage("Quotes synced with server!");
}

// Utility: show notification
function showMessage(msg) {
  if (!messageBox) return;
  messageBox.textContent = msg;
  messageBox.style.display = "block";

  // Hide after 3 seconds
  setTimeout(() => {
    messageBox.style.display = "none";
  }, 3000);
}

// Event listeners
addQuoteBtn.addEventListener("click", addQuote);
syncBtn.addEventListener("click", syncQuotes);

// Initial load
loadQuotes();
