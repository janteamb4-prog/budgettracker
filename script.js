const STORAGE_KEY = "cutoff-budget-tracker-v1";
const $ = id => document.getElementById(id);
const money = n => "₱" + Number(n || 0).toLocaleString("en-PH", {minimumFractionDigits: 2, maximumFractionDigits: 2});
const today = new Date();
const localDate = [today.getFullYear(), String(today.getMonth()+1).padStart(2,"0"), String(today.getDate()).padStart(2,"0")].join("-");
let state = { budget: 0, periodName: "", expenses: [] };

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  if (saved && Array.isArray(saved.expenses)) {
    state = {...state, ...saved};
  } else if (saved && Array.isArray(saved.options)) {
    // Import records from the earlier options-based tracker format.
    state.budget = Number(saved.budget) || 0;
    state.expenses = saved.options
      .filter(item => item && item.name && Number(item.amount) > 0)
      .map((item, index) => ({
        id: "imported-" + Date.now() + "-" + index,
        name: String(item.name),
        amount: Number(item.amount),
        category: "General",
        date: localDate,
        createdAt: Date.now() + index
      }));
  }
} catch (error) {
  console.warn("Could not load saved budget data.", error);
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    $("saveStatus").textContent = "Saved on this device";
  } catch (error) {
    $("saveStatus").textContent = "Could not save";
  }
}
function totals() {
  const spent = state.expenses.reduce((sum, item) => sum + Math.max(0, Number(item.amount) || 0), 0);
  const budget = Math.max(0, Number(state.budget) || 0);
  return {spent, budget, remaining: budget - spent};
}
function updateDashboard() {
  const {spent, budget, remaining} = totals();
  const percent = budget > 0 ? spent / budget * 100 : 0;
  $("remainingTop").textContent = money(remaining);
  $("budgetMetric").textContent = money(budget);
  $("spentMetric").textContent = money(spent);
  $("summarySpent").textContent = money(spent);
  $("summaryRemaining").textContent = money(remaining);
  $("summaryBudget").textContent = money(budget);
  $("budgetFoot").textContent = "of " + money(budget) + " budget";
  $("progressText").textContent = Math.round(percent) + "%";
  $("progressFill").style.width = Math.min(100, Math.max(0, percent)) + "%";
  $("expenseCount").textContent = state.expenses.length + (state.expenses.length === 1 ? " recorded expense" : " recorded expenses");
  $("historyCount").textContent = state.expenses.length + (state.expenses.length === 1 ? " ITEM" : " ITEMS");
  $("budgetHealth").textContent = remaining < 0 ? "Over budget" : percent >= 85 ? "Almost at your limit" : "Looking good";
  $("remainingTop").style.color = remaining < 0 ? "#ffe0e7" : "#fff";
}
function formatDate(date) {
  if (!date) return "—";
  const parsed = new Date(date + "T00:00:00");
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("en-PH", {month:"short", day:"numeric", year:"numeric"});
}
function renderExpenses() {
  const rows = $("expenseRows");
  rows.replaceChildren();
  const search = $("searchInput").value.trim().toLowerCase();
  const category = $("categoryFilter").value;
  const filtered = state.expenses.filter(item => {
    const matchesSearch = (item.name || "").toLowerCase().includes(search) || (item.category || "").toLowerCase().includes(search);
    return matchesSearch && (category === "All" || item.category === category);
  }).slice().sort((a,b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || 0) - (a.createdAt || 0));

  filtered.forEach(item => {
    const tr = document.createElement("tr");
    const name = document.createElement("td"); name.textContent = item.name;
    const catCell = document.createElement("td");
    const tag = document.createElement("span"); tag.className = "category-tag"; tag.textContent = item.category || "General"; catCell.append(tag);
    const date = document.createElement("td"); date.className = "date-text"; date.textContent = formatDate(item.date);
    const amount = document.createElement("td"); amount.className = "amount-cell"; amount.textContent = money(item.amount);
    const actions = document.createElement("td");
    const actionWrap = document.createElement("div"); actionWrap.className = "row-actions";
    const edit = document.createElement("button"); edit.type = "button"; edit.className = "row-action"; edit.textContent = "✎"; edit.title = "Edit expense"; edit.setAttribute("aria-label", "Edit " + item.name);
    edit.addEventListener("click", () => editExpense(item.id));
    const del = document.createElement("button"); del.type = "button"; del.className = "row-action delete"; del.textContent = "×"; del.title = "Delete expense"; del.setAttribute("aria-label", "Delete " + item.name);
    del.addEventListener("click", () => deleteExpense(item.id));
    actionWrap.append(edit, del); actions.append(actionWrap);
    tr.append(name, catCell, date, amount, actions); rows.append(tr);
  });
  $("emptyState").classList.toggle("visible", filtered.length === 0);
  $("showingText").textContent = `Showing ${filtered.length} of ${state.expenses.length} expenses`;
}
function render() {
  $("budgetInput").value = state.budget || "";
  $("periodName").value = state.periodName || "";
  updateDashboard();
  renderExpenses();
}
function editExpense(id) {
  const item = state.expenses.find(expense => expense.id === id);
  if (!item) return;
  const name = prompt("Expense name:", item.name);
  if (name === null) return;
  const cleanName = name.trim();
  if (!cleanName) { alert("Expense name cannot be empty."); return; }
  const amountText = prompt("Amount in pesos:", String(item.amount));
  if (amountText === null) return;
  const amount = Number(amountText);
  if (!Number.isFinite(amount) || amount <= 0) { alert("Enter an amount greater than zero."); return; }
  item.name = cleanName;
  item.amount = amount;
  save(); render();
}
function deleteExpense(id) {
  const item = state.expenses.find(expense => expense.id === id);
  if (!item || !confirm(`Delete "${item.name}"?`)) return;
  state.expenses = state.expenses.filter(expense => expense.id !== id);
  save(); render();
}
$("budgetInput").addEventListener("input", event => {
  state.budget = Math.max(0, Number(event.target.value) || 0);
  save(); updateDashboard();
});
$("periodName").addEventListener("input", event => {
  state.periodName = event.target.value;
  save();
});
$("expenseDate").value = localDate;
$("expenseForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("expenseName").value.trim();
  const amount = Number($("expenseAmount").value);
  const date = $("expenseDate").value || localDate;
  if (!name) { alert("Please enter an expense name."); return; }
  if (!Number.isFinite(amount) || amount <= 0) { alert("Please enter an amount greater than zero."); return; }
  state.expenses.push({
    id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
    name, amount, category: $("expenseCategory").value, date, createdAt: Date.now()
  });
  save();
  $("expenseForm").reset();
  $("expenseDate").value = localDate;
  $("expenseCategory").value = "General";
  render();
  $("expenseName").focus();
});
$("searchInput").addEventListener("input", renderExpenses);
$("categoryFilter").addEventListener("change", renderExpenses);
$("clearAll").addEventListener("click", () => {
  if (!state.expenses.length) { alert("There are no expenses to clear."); return; }
  if (!confirm("Clear all expenses for this cutoff? Your budget amount will stay.")) return;
  state.expenses = []; save(); render();
});
$("resetTracker").addEventListener("click", () => {
  if (!confirm("Reset the entire tracker? This clears the cutoff name, budget, and all expenses.")) return;
  state = {budget:0, periodName:"", expenses:[]};
  save(); render();
});
$("exportCsv").addEventListener("click", () => {
  if (!state.expenses.length) { alert("Add at least one expense before exporting."); return; }
  const rows = [["Expense","Category","Date","Amount (PHP)"], ...state.expenses.map(item => [item.name,item.category,item.date,item.amount])];
  const csv = rows.map(row => row.map(value => `"${String(value ?? "").replace(/"/g,'""')}"`).join(",")).join("\\r\\n");
  const blob = new Blob(["\\ufeff" + csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = "budget-expenses.csv"; link.click();
  URL.revokeObjectURL(url);
});
$("printReport").addEventListener("click", () => window.print());
$("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("budget-tracker-theme", document.body.classList.contains("dark") ? "dark" : "light");
});
if (localStorage.getItem("budget-tracker-theme") === "dark") document.body.classList.add("dark");
render();
