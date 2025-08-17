// Array of quote objects
const quotes = [
  { text: "The best way to get started is to quit talking and begin doing.", category: "Motivation" },
  { text: "Don’t let yesterday take up too much of today.", category: "Wisdom" },
  { text: "It’s not whether you get knocked down, it’s whether you get up.", category: "Resilience" },
  { text: "Success is not in what you have, but who you are.", category: "Success" }
];

// Get references to DOM elements
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteBtn = document.getElementById("newQuote");
const textInput = document.getElementById("newQuoteText");
const categoryInput = document.getElementById("newQuoteCategory");

// Function: Show a random quote
function showRandomQuote() {
  const randomIndex = Math.floor(Math.random() * quotes.length);
  const randomQuote = quotes[randomIndex];
  
  // Clear previous content
  quoteDisplay.innerHTML = "";

  // Create elements dynamically
  const quoteText = document.createElement("p");
  quoteText.textContent = `"${randomQuote.text}"`;

  const quoteCategory = document.createElement("span");
  quoteCategory.textContent = ` - ${randomQuote.category}`;
  quoteCategory.style.fontStyle = "italic";
  quoteCategory.style.color = "gray";

  // Append elements
  quoteDisplay.appendChild(quoteText);
  quoteDisplay.appendChild(quoteCategory);
}

// Function: Add a new quote dynamically
function addQuote() {
  const newText = textInput.value.trim();
  const newCategory = categoryInput.value.trim();

  if (newText && newCategory) {
    const newQuote = { text: newText, category: newCategory };
    quotes.push(newQuote);

    // Immediately display the new quote
    quoteDisplay.innerHTML = "";
    const quoteText = document.createElement("p");
    quoteText.textContent = `"${newQuote.text}"`;

    const quoteCategory = document.createElement("span");
    quoteCategory.textContent = ` - ${newQuote.category}`;
    quoteCategory.style.fontStyle = "italic";
    quoteCategory.style.color = "gray";

    quoteDisplay.appendChild(quoteText);
    quoteDisplay.appendChild(quoteCategory);

    // Reset input fields
    textInput.value = "";
    categoryInput.value = "";

    alert("Quote added successfully!");
  } else {
    alert("Please enter both quote text and category.");
  }
}

// Event listener for random quote button
newQuoteBtn.addEventListener("click", showRandomQuote);

// Initialize with a random quote on page load
showRandomQuote();
