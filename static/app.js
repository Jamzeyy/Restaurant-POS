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
const openPrinterSettingsBtn = document.getElementById("open-printer-settings");
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
const printerModalEl = document.getElementById("printer-modal");
const printerListEl = document.getElementById("printer-list");
const printerFormEl = document.getElementById("printer-form");
const printerNameInput = document.getElementById("printer-name");
const printerTypeSelect = document.getElementById("printer-type");
const printerDeviceInput = document.getElementById("printer-device");
const kitchenPrinterSelect = document.getElementById("kitchen-printer-select");
const receiptPrinterSelect = document.getElementById("receipt-printer-select");
const savePrinterMappingBtn = document.getElementById("save-printer-mapping");
const printerMappingStatusEl = document.getElementById(
  "printer-mapping-status"
);
const printJobListEl = document.getElementById("print-job-list");

const ADMIN_PASSCODE = "admin";

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
    const kitchenPrintMessage = data.kitchenPrintJobId
      ? " Kitchen ticket queued."
      : " Kitchen printer not configured.";
    orderStatusEl.textContent = `Order #${
      data.orderId
    } saved. Total ${currencyFormatter.format(data.total)}.${kitchenPrintMessage}`;
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
    const receiptPrintMessage = data.receiptPrintJobId
      ? " Receipt queued."
      : " Receipt printer not configured.";
    orderStatusEl.textContent = `Payment recorded for Order #${data.orderId}.${receiptPrintMessage}`;
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

const isAdminUnlocked = () =>
  window.localStorage.getItem("posAdminUnlocked") === "true";

const requestAdminAccess = () => {
  if (isAdminUnlocked()) return true;
  const response = window.prompt("Enter admin passcode to continue:");
  if (response && response.trim() === ADMIN_PASSCODE) {
    window.localStorage.setItem("posAdminUnlocked", "true");
    return true;
  }
  window.alert("Incorrect passcode.");
  return false;
};

const openPrinterModal = async () => {
  if (!requestAdminAccess()) return;
  printerModalEl?.classList.remove("is-hidden");
  printerModalEl?.setAttribute("aria-hidden", "false");
  await refreshPrinterConfig();
};

const closePrinterModal = () => {
  printerModalEl?.classList.add("is-hidden");
  printerModalEl?.setAttribute("aria-hidden", "true");
};

const renderPrinterList = (printers) => {
  if (!printerListEl) return;
  if (!printers.length) {
    printerListEl.textContent = "No printers configured.";
    return;
  }
  printerListEl.innerHTML = "";
  printers.forEach((printer) => {
    const row = document.createElement("div");
    row.className = "printer-list__item";
    row.innerHTML = `
      <div class="printer-list__meta">
        <strong>${printer.name}</strong>
        <span class="muted">${printer.connection_type.toUpperCase()} · ${
      printer.device_identifier
    }</span>
      </div>
      <button class="ghost" data-printer-id="${printer.id}">Remove</button>
    `;
    row
      .querySelector("button")
      .addEventListener("click", async () => {
        await fetch(`/api/printers/${printer.id}`, { method: "DELETE" });
        await refreshPrinterConfig();
      });
    printerListEl.appendChild(row);
  });
};

const renderPrinterOptions = (printers, mapping) => {
  if (!kitchenPrinterSelect || !receiptPrinterSelect) return;
  const buildOptions = (selectedId) =>
    [
      { id: "", label: "Unassigned" },
      ...printers.map((printer) => ({
        id: printer.id,
        label: `${printer.name} (${printer.connection_type.toUpperCase()})`,
      })),
    ]
      .map(
        (option) =>
          `<option value="${option.id}" ${
            String(option.id) === String(selectedId) ? "selected" : ""
          }>${option.label}</option>`
      )
      .join("");

  kitchenPrinterSelect.innerHTML = buildOptions(mapping.kitchen_printer_id);
  receiptPrinterSelect.innerHTML = buildOptions(mapping.receipt_printer_id);
};

const renderPrintJobs = (jobs) => {
  if (!printJobListEl) return;
  if (!jobs.length) {
    printJobListEl.textContent = "No print jobs queued.";
    return;
  }
  printJobListEl.innerHTML = "";
  jobs.forEach((job) => {
    const row = document.createElement("div");
    row.className = "printer-list__item";
    row.innerHTML = `
      <div class="printer-list__meta">
        <strong>${job.job_type.toUpperCase()} · ${job.printer_name}</strong>
        <span class="muted">${job.status} · ${job.created_at}</span>
      </div>
    `;
    printJobListEl.appendChild(row);
  });
};

const refreshPrinterConfig = async () => {
  const [printersResponse, mappingResponse, jobsResponse] = await Promise.all([
    fetch("/api/printers"),
    fetch("/api/printer-mappings"),
    fetch("/api/print-jobs"),
  ]);
  const printersData = await printersResponse.json();
  const mappingData = await mappingResponse.json();
  const jobsData = await jobsResponse.json();
  renderPrinterList(printersData.printers || []);
  renderPrinterOptions(printersData.printers || [], mappingData.mapping || {});
  renderPrintJobs(jobsData.jobs || []);
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
openPrinterSettingsBtn?.addEventListener("click", openPrinterModal);
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
tenderModalEl?.addEventListener("click", (event) => {
  const closeTarget = event.target?.closest?.("[data-action='close']");
  if (closeTarget) {
    closeTenderModal();
  }
});
printerModalEl?.querySelectorAll("[data-action='close-printer']").forEach((button) => {
  button.addEventListener("click", closePrinterModal);
});
printerModalEl?.addEventListener("click", (event) => {
  const closeTarget = event.target?.closest?.("[data-action='close-printer']");
  if (closeTarget) {
    closePrinterModal();
  }
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

printerFormEl?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!printerNameInput || !printerTypeSelect || !printerDeviceInput) return;
  const payload = {
    name: printerNameInput.value.trim(),
    connectionType: printerTypeSelect.value,
    deviceIdentifier: printerDeviceInput.value.trim(),
  };
  const response = await fetch("/api/printers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json();
    printerMappingStatusEl.textContent =
      data.error || "Unable to add printer.";
    printerMappingStatusEl.classList.add("error");
    return;
  }
  printerMappingStatusEl.textContent = "Printer added.";
  printerMappingStatusEl.classList.remove("error");
  printerNameInput.value = "";
  printerDeviceInput.value = "";
  await refreshPrinterConfig();
});

savePrinterMappingBtn?.addEventListener("click", async () => {
  const payload = {
    kitchenPrinterId: kitchenPrinterSelect?.value
      ? Number(kitchenPrinterSelect.value)
      : null,
    receiptPrinterId: receiptPrinterSelect?.value
      ? Number(receiptPrinterSelect.value)
      : null,
  };
  const response = await fetch("/api/printer-mappings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json();
    printerMappingStatusEl.textContent =
      data.error || "Unable to save routing.";
    printerMappingStatusEl.classList.add("error");
    return;
  }
  printerMappingStatusEl.textContent = "Routing updated.";
  printerMappingStatusEl.classList.remove("error");
  await refreshPrinterConfig();
});

loadMenu();
renderTicket();
renderReceipt();
updateOrderTypeUI();
updatePaymentControls();
