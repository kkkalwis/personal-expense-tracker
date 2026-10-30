const STORAGE_KEY = "personalExpenseTracker.transactions";

const form = document.getElementById("transactionForm");
const typeInput = document.getElementById("type");
const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const formMessage = document.getElementById("formMessage");
const tableBody = document.getElementById("transactionTableBody");
const filterType = document.getElementById("filterType");
const searchInput = document.getElementById("searchInput");

let transactions = loadTransactions();

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadTransactions() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter(isValidStoredTransaction) : [];
  } catch {
    return [];
  }
}

function isValidStoredTransaction(item) {
  return item && typeof item.id === "string" &&
    ["Income", "Expense"].includes(item.type) &&
    typeof item.description === "string" &&
    typeof item.category === "string" &&
    Number.isFinite(Number(item.amount)) && Number(item.amount) > 0 &&
    typeof item.date === "string";
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}


function formatCurrency(amount) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function updateSummary() {
  const income = transactions
    .filter(item => item.type === "Income")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const expenses = transactions
    .filter(item => item.type === "Expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  document.getElementById("totalIncome").textContent = formatCurrency(income);
  document.getElementById("totalExpenses").textContent = formatCurrency(expenses);
  document.getElementById("currentBalance").textContent = formatCurrency(income - expenses);
}

function renderTransactions() {
  const selectedType = filterType.value;
  const searchTerm = searchInput.value.trim().toLowerCase();

  const visibleTransactions = transactions
    .filter(item => selectedType === "All" || item.type === selectedType)
    .filter(item => {
      const searchableText = `${item.description} ${item.category} ${item.type} ${item.date}`.toLowerCase();
      return searchableText.includes(searchTerm);
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  document.getElementById("recordCount").textContent =
    `${visibleTransactions.length} ${visibleTransactions.length === 1 ? "record" : "records"}`;

  if (visibleTransactions.length === 0) {
    const hasAnyTransactions = transactions.length > 0;
    tableBody.innerHTML = `<tr class="empty-row"><td colspan="6">${
      hasAnyTransactions ? "No transactions match your search or filter." : "No transactions yet. Add your first record."
    }</td></tr>`;
    return;
  }

  tableBody.innerHTML = visibleTransactions.map(item => `
    <tr>
      <td>${escapeHTML(formatDate(item.date))}</td>
      <td class="description-cell">${escapeHTML(item.description)}</td>
      <td><span class="type-pill ${item.type === "Income" ? "type-income" : "type-expense"}">${item.type}</span></td>
      <td>${escapeHTML(item.category)}</td>
      <td class="amount-cell">${item.type === "Expense" ? "−" : "+"}${escapeHTML(formatCurrency(Number(item.amount)))}</td>
      <td><button class="delete-button" type="button" data-delete-id="${escapeHTML(item.id)}" aria-label="Delete ${escapeHTML(item.description)}" title="Delete transaction">✕</button></td>
    </tr>
  `).join("");
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function refreshUI() {
  updateSummary();
  renderTransactions();
}



form.addEventListener("submit", event => {
  event.preventDefault();
  formMessage.textContent = "";

  const type = typeInput.value;
  const description = descriptionInput.value.trim();
  const amount = Number(amountInput.value);
  const category = categoryInput.value;
  const date = dateInput.value;

  if (!type || !description || !category || !date || amountInput.value.trim() === "") {
    formMessage.textContent = "Please complete every field before adding the transaction.";
    return;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    formMessage.textContent = "Enter an amount greater than zero.";
    amountInput.focus();
    return;
  }
  if (description.length > 70) {
    formMessage.textContent = "Description must be 70 characters or fewer.";
    descriptionInput.focus();
    return;
  }

  transactions.push({
    id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    description,
    amount: Math.round(amount * 100) / 100,
    category,
    date
  });

  saveTransactions();
  form.reset();
  dateInput.value = localDateString();
  typeInput.value = "Expense";
  formMessage.textContent = "";
  refreshUI();
  alert("Transaction added successfully!");
});

form.addEventListener("reset", () => {

  formMessage.textContent = "";
});

tableBody.addEventListener("click", event => {
  const deleteButton = event.target.closest("[data-delete-id]");
  if (!deleteButton) return;

  const transactionId = deleteButton.dataset.deleteId;
  transactions = transactions.filter(item => item.id !== transactionId);
  saveTransactions();
  refreshUI();
});

filterType.addEventListener("change", renderTransactions);
searchInput.addEventListener("input", renderTransactions);

document.getElementById("todayLabel").textContent = new Date().toLocaleDateString("en-US", {
  weekday: "short", day: "numeric", month: "long", year: "numeric"
});
dateInput.value = localDateString();

refreshUI();
