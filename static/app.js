const state = {
  menu: {},
  activeCategory: null,
  ticketItems: [],
  tip: 0,
  discount: 0,
  searchTerm: "",
  activeFilters: new Set(),
  currentOrderId: null,
  lastOrderTotal: 0,
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const ticketItemsEl = document.getElementById("ticket-items");
const menuItemsEl = document.getElementById("menu-items");
const categoryTabsEl = document.getElementById("category-tabs");
const menuSearchInput = document.getElementById("menu-search");
const quickFiltersEl = document.getElementById("quick-filters");
const itemCountEl = document.getElementById("item-count");
const subtotalEl = document.getElementById("subtotal");
const taxEl = document.getElementById("tax");
const totalEl = document.getElementById("total");
const tipInput = document.getElementById("tip");
const discountInput = document.getElementById("discount");
const orderStatusEl = document.getElementById("order-status");
const orderTypeSelect = document.getElementById("order-type");
const tableLabelInput = document.getElementById("table-label");
const tableLabelText = document.getElementById("table-label-text");
const deliveryFields = document.getElementById("delivery-fields");
const deliveryAddressInput = document.getElementById("delivery-address");
const deliveryContactInput = document.getElementById("delivery-contact");
const receiptOrderTypeEl = document.getElementById("receipt-order-type");
const receiptDeliveryAddressEl = document.getElementById(
  "receipt-delivery-address"
);
const receiptDeliveryContactEl = document.getElementById(
  "receipt-delivery-contact"
);
const submitOrderBtn = document.getElementById("submit-order");
const takePaymentBtn = document.getElementById("take-payment");
const paymentMethodEl = document.getElementById("payment-method");
const paymentTenderedEl = document.getElementById("payment-tendered");
const paymentChangeEl = document.getElementById("payment-change");
const paymentStatusEl = document.getElementById("payment-status");
const tenderModalEl = document.getElementById("tender-modal");
const tenderTotalEl = document.getElementById("tender-total");
const cashPanelEl = document.getElementById("cash-panel");
const cardPanelEl = document.getElementById("card-panel");
const cashTenderedInput = document.getElementById("cash-tendered");
const cashChangeEl = document.getElementById("cash-change");
const cardStatusEl = document.getElementById("card-status");
const tenderErrorEl = document.getElementById("tender-error");
const confirmPaymentBtn = document.getElementById("confirm-payment");
const paymentMethodInputs = document.querySelectorAll(
  "input[name='payment-method']"
);

const taxRate = window.POS_CONFIG?.taxRate ?? 0;
const taxRateLabel = document.getElementById("tax-rate");
if (taxRateLabel) {
  taxRateLabel.textContent = `${(taxRate * 100).toFixed(2)}%`;
}

const quickFilters = [
  { id: "spicy", label: "Spicy" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "seafood", label: "Seafood" },
];

const loadMenu = async () => {
  const response = await fetch("/api/menu");
  const data = await response.json();
  state.menu = data.categories;
  const categories = Object.keys(state.menu);
  const preferredCategories = ["Dimsum", "Lunch", "Dinner"];
  const orderedCategories = [
    ...preferredCategories.filter((category) => categories.includes(category)),
    ...categories.filter((category) => !preferredCategories.includes(category)),
  ];
  state.activeCategory = orderedCategories[0];
  renderCategories(orderedCategories);
  renderQuickFilters();
  renderMenuItems();
};

const renderCategories = (categories) => {
  categoryTabsEl.innerHTML = "";
  categories.forEach((category) => {
    const button = document.createElement("button");
    button.textContent = category;
    button.className = category === state.activeCategory ? "tab active" : "tab";
    button.addEventListener("click", () => {
      state.activeCategory = category;
      renderCategories(categories);
      renderMenuItems();
    });
    categoryTabsEl.appendChild(button);
  });
};

const renderQuickFilters = () => {
  if (!quickFiltersEl) return;
  quickFiltersEl.innerHTML = "";
  quickFilters.forEach((filter) => {
    const button = document.createElement("button");
    button.textContent = filter.label;
    button.className = state.activeFilters.has(filter.id)
      ? "filter-pill active"
      : "filter-pill";
    button.addEventListener("click", () => {
      if (state.activeFilters.has(filter.id)) {
        state.activeFilters.delete(filter.id);
      } else {
        state.activeFilters.add(filter.id);
      }
      renderQuickFilters();
      renderMenuItems();
    });
    quickFiltersEl.appendChild(button);
  });

  if (state.activeFilters.size > 0) {
    const clearButton = document.createElement("button");
    clearButton.textContent = "Clear";
    clearButton.className = "filter-pill clear";
    clearButton.addEventListener("click", () => {
      state.activeFilters.clear();
      renderQuickFilters();
      renderMenuItems();
    });
    quickFiltersEl.appendChild(clearButton);
  }
};

const renderMenuItems = () => {
  menuItemsEl.innerHTML = "";
  const items = state.menu[state.activeCategory] || [];
  const searchTerm = state.searchTerm.trim().toLowerCase();
  const activeFilters = Array.from(state.activeFilters);
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      item.name.toLowerCase().includes(searchTerm) ||
      item.description.toLowerCase().includes(searchTerm);
    const matchesFilters =
      activeFilters.length === 0 ||
      activeFilters.every((filter) => item.tags?.includes(filter));
    return matchesSearch && matchesFilters;
  });

  if (filteredItems.length === 0) {
    menuItemsEl.innerHTML =
      "<p class='muted'>No menu items match your search and filters.</p>";
    return;
  }

  filteredItems.forEach((item) => {
    const card = document.createElement("div");
    card.className = "menu-card";
    const tags = item.tags?.length
      ? `<div class="menu-card__tags">${item.tags
          .map((tag) => `<span>${tag}</span>`)
          .join("")}</div>`
      : "";
    card.innerHTML = `
      <div>
        <h3>${item.name}</h3>
        <p class="muted">${item.description}</p>
        <p class="muted">SKU ${item.sku}</p>
        ${tags}
      </div>
      <div class="menu-card__footer">
        <span>${currencyFormatter.format(item.price)}</span>
        <button class="ghost">Quick Add</button>
      </div>
    `;
    card.querySelector("button").addEventListener("click", () => addItem(item));
    menuItemsEl.appendChild(card);
  });
};

const addItem = (item) => {
  const existing = state.ticketItems.find((entry) => entry.sku === item.sku);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.ticketItems.push({ ...item, quantity: 1 });
  }
  markOrderDirty();
  renderTicket();
};

const updateQuantity = (sku, delta) => {
  const entry = state.ticketItems.find((item) => item.sku === sku);
  if (!entry) return;
  entry.quantity = Math.max(0, entry.quantity + delta);
  if (entry.quantity === 0) {
    state.ticketItems = state.ticketItems.filter((item) => item.sku !== sku);
  }
  markOrderDirty();
  renderTicket();
};

const renderTicket = () => {
  ticketItemsEl.innerHTML = "";
  if (state.ticketItems.length === 0) {
    ticketItemsEl.innerHTML = "<p class='muted'>No items added yet.</p>";
  }
  state.ticketItems.forEach((item) => {
    const row = document.createElement("div");
    row.className = "ticket-row";
    row.innerHTML = `
      <div>
        <strong>${item.name}</strong>
        <p class="muted">${item.sku}</p>
      </div>
      <div class="ticket-row__controls">
        <button class="ghost" data-action="decrease">-</button>
        <span>${item.quantity}</span>
        <button class="ghost" data-action="increase">+</button>
        <span>${currencyFormatter.format(item.price * item.quantity)}</span>
      </div>
    `;
    row.querySelector("[data-action='decrease']").addEventListener("click", () =>
      updateQuantity(item.sku, -1)
    );
    row.querySelector("[data-action='increase']").addEventListener("click", () =>
      updateQuantity(item.sku, 1)
    );
    ticketItemsEl.appendChild(row);
  });
  itemCountEl.textContent = `${state.ticketItems.length} items`;
  renderReceipt();
};

const calculateTotals = () => {
  const subtotal = state.ticketItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  const tax = subtotal * taxRate;
  const total = subtotal + tax + state.tip - state.discount;
  return { subtotal, tax, total };
};

const renderReceipt = () => {
  const { subtotal, tax, total } = calculateTotals();

  const orderType = orderTypeSelect?.value || "dine-in";
  if (receiptOrderTypeEl) {
    receiptOrderTypeEl.textContent = formatOrderType(orderType);
  }
  updateReceiptDeliveryDetails(orderType);
  subtotalEl.textContent = currencyFormatter.format(subtotal);
  taxEl.textContent = currencyFormatter.format(tax);
  totalEl.textContent = currencyFormatter.format(total);
};

const formatOrderType = (orderType) => {
  switch (orderType) {
    case "dine-in":
      return "Dine In";
    case "takeout":
      return "Takeout";
    case "delivery":
      return "Delivery";
    default:
      return "Order";
  }
};

const updateReceiptDeliveryDetails = (orderType) => {
  if (!receiptDeliveryAddressEl || !receiptDeliveryContactEl) return;
  const shouldShow = orderType === "delivery";
  receiptDeliveryAddressEl.classList.toggle("is-hidden", !shouldShow);
  receiptDeliveryContactEl.classList.toggle("is-hidden", !shouldShow);
  if (shouldShow) {
    const address = deliveryAddressInput?.value.trim() || "Address needed";
    const contact = deliveryContactInput?.value.trim() || "Contact needed";
    receiptDeliveryAddressEl.querySelector("strong").textContent = address;
    receiptDeliveryContactEl.querySelector("strong").textContent = contact;
  }
};

const updateOrderTypeUI = () => {
  const orderType = orderTypeSelect?.value || "dine-in";
  if (deliveryFields) {
    deliveryFields.classList.toggle("is-hidden", orderType !== "delivery");
  }
  if (tableLabelText) {
    tableLabelText.textContent = orderType === "dine-in" ? "Table" : "Order Label";
  }
  if (tableLabelInput) {
    tableLabelInput.placeholder =
      orderType === "dine-in" ? "Table 12" : "Uber Eats, DoorDash";
  }
  renderReceipt();
};

const updatePaymentControls = () => {
  if (!takePaymentBtn) return;
  takePaymentBtn.disabled = !state.currentOrderId;
};

const updatePaymentSummary = (payment) => {
  if (!paymentMethodEl || !paymentTenderedEl || !paymentChangeEl) return;
  paymentMethodEl.textContent = payment.method === "card" ? "Credit Card" : "Cash";
  paymentTenderedEl.textContent = currencyFormatter.format(payment.amountTendered);
  paymentChangeEl.textContent = currencyFormatter.format(payment.changeDue);
  if (paymentStatusEl) {
    paymentStatusEl.textContent = `Payment ${payment.status} (${payment.reference}).`;
  }
};

const markOrderDirty = () => {
  if (!state.currentOrderId) return;
  state.currentOrderId = null;
  state.lastOrderTotal = 0;
  updatePaymentControls();
};

const updateCashChange = () => {
  const amountDue = state.lastOrderTotal;
  const tendered = parseFloat(cashTenderedInput?.value || 0);
  const change = Math.max(0, tendered - amountDue);
  if (cashChangeEl) {
    cashChangeEl.textContent = currencyFormatter.format(change);
  }
};

const setTenderError = (message = "") => {
  if (!tenderErrorEl) return;
  tenderErrorEl.textContent = message;
  tenderErrorEl.classList.toggle("is-hidden", !message);
};

const openTenderModal = () => {
  if (!state.currentOrderId) {
    orderStatusEl.textContent = "Send the order before taking payment.";
    orderStatusEl.classList.add("error");
    return;
  }
  orderStatusEl.classList.remove("error");
  if (tenderTotalEl) {
    tenderTotalEl.textContent = currencyFormatter.format(state.lastOrderTotal);
  }
  if (cashTenderedInput) {
    cashTenderedInput.value = state.lastOrderTotal.toFixed(2);
  }
  updateCashChange();
  setTenderError("");
  if (cardStatusEl) {
    cardStatusEl.textContent = "Awaiting authorization";
  }
  tenderModalEl?.classList.remove("is-hidden");
  tenderModalEl?.setAttribute("aria-hidden", "false");
};

const closeTenderModal = () => {
  tenderModalEl?.classList.add("is-hidden");
  tenderModalEl?.setAttribute("aria-hidden", "true");
};

const handleOrderSubmit = async () => {
  orderStatusEl.textContent = "Saving order...";
  const orderType = orderTypeSelect.value;
  const tableLabel = tableLabelInput.value.trim();
  const deliveryAddress = deliveryAddressInput?.value.trim() || "";
  const deliveryContact = deliveryContactInput?.value.trim() || "";

  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderType,
        tableLabel,
        deliveryAddress,
        deliveryContact,
        tip: state.tip,
        discount: state.discount,
        items: state.ticketItems,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      orderStatusEl.textContent = data.error || "Unable to save order.";
      orderStatusEl.classList.add("error");
      return;
    }
    orderStatusEl.classList.remove("error");
    orderStatusEl.textContent = `Order #${data.orderId} saved. Total ${currencyFormatter.format(
      data.total
    )}.`;
    state.currentOrderId = data.orderId;
    state.lastOrderTotal = data.total;
    updatePaymentControls();
    state.ticketItems = [];
    renderTicket();
  } catch (error) {
    orderStatusEl.textContent = "Unable to save order.";
    orderStatusEl.classList.add("error");
  }
};

const handlePaymentSubmit = async () => {
  const selectedMethod = document.querySelector(
    "input[name='payment-method']:checked"
  )?.value;
  if (!selectedMethod) {
    setTenderError("Select a payment method.");
    return;
  }
  const amountDue = state.lastOrderTotal;
  const amountTendered =
    selectedMethod === "cash"
      ? parseFloat(cashTenderedInput?.value || 0)
      : amountDue;
  if (selectedMethod === "cash") {
    if (amountTendered < amountDue) {
      setTenderError("Cash tendered must cover the amount due.");
      return;
    }
  }
  setTenderError("");
  confirmPaymentBtn.disabled = true;
  if (cardStatusEl && selectedMethod === "card") {
    cardStatusEl.textContent = "Authorizing...";
  }

  try {
    const response = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: state.currentOrderId,
        method: selectedMethod,
        amountTendered,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setTenderError(data.error || "Unable to process payment.");
      if (cardStatusEl && selectedMethod === "card") {
        cardStatusEl.textContent = "Authorization failed";
      }
      confirmPaymentBtn.disabled = false;
      return;
    }
    updatePaymentSummary(data);
    orderStatusEl.textContent = `Payment recorded for Order #${data.orderId}.`;
    orderStatusEl.classList.remove("error");
    state.currentOrderId = null;
    state.lastOrderTotal = 0;
    updatePaymentControls();
    closeTenderModal();
  } catch (error) {
    setTenderError("Unable to process payment.");
    confirmPaymentBtn.disabled = false;
    if (cardStatusEl && selectedMethod === "card") {
      cardStatusEl.textContent = "Authorization failed";
    }
  } finally {
    confirmPaymentBtn.disabled = false;
  }
};

tipInput.addEventListener("input", (event) => {
  state.tip = parseFloat(event.target.value || 0);
  markOrderDirty();
  renderReceipt();
});

discountInput.addEventListener("input", (event) => {
  state.discount = parseFloat(event.target.value || 0);
  markOrderDirty();
  renderReceipt();
});

submitOrderBtn.addEventListener("click", handleOrderSubmit);
orderTypeSelect.addEventListener("change", () => {
  markOrderDirty();
  updateOrderTypeUI();
});
deliveryAddressInput.addEventListener("input", renderReceipt);
deliveryContactInput.addEventListener("input", renderReceipt);
if (menuSearchInput) {
  menuSearchInput.addEventListener("input", (event) => {
    state.searchTerm = event.target.value;
    renderMenuItems();
  });
}

takePaymentBtn?.addEventListener("click", openTenderModal);
cashTenderedInput?.addEventListener("input", updateCashChange);
confirmPaymentBtn?.addEventListener("click", handlePaymentSubmit);
tenderModalEl?.querySelectorAll("[data-action='close']").forEach((button) => {
  button.addEventListener("click", closeTenderModal);
});
paymentMethodInputs.forEach((input) => {
  input.addEventListener("change", (event) => {
    const method = event.target.value;
    if (cashPanelEl && cardPanelEl) {
      cashPanelEl.classList.toggle("is-hidden", method !== "cash");
      cardPanelEl.classList.toggle("is-hidden", method !== "card");
    }
    setTenderError("");
  });
});

loadMenu();
renderTicket();
renderReceipt();
updateOrderTypeUI();
updatePaymentControls();
