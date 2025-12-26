const canvas = document.getElementById("dining-canvas");
const ticketTable = document.getElementById("ticket-table");
const ticketBody = document.getElementById("ticket-body");
const editToggle = document.getElementById("edit-toggle");
const isAdmin = document.body.dataset.isAdmin === "true";

let tables = [];
let editMode = false;
let activeTableId = null;

async function fetchTables() {
  const response = await fetch("/api/tables");
  tables = await response.json();
  renderTables();
}

function renderTables() {
  canvas.querySelectorAll(".table-card").forEach((node) => node.remove());
  tables.forEach((table) => {
    const card = document.createElement("div");
    card.className = "table-card";
    if (table.id === activeTableId) {
      card.classList.add("active");
    }
    if (editMode) {
      card.classList.add("editable");
    }
    card.style.left = `${table.x}px`;
    card.style.top = `${table.y}px`;
    card.style.width = `${table.width}px`;
    card.style.height = `${table.height}px`;
    card.dataset.id = table.id;
    card.textContent = table.label;

    const resizeHandle = document.createElement("div");
    resizeHandle.className = "resize-handle";
    if (!editMode) {
      resizeHandle.style.display = "none";
    }

    card.appendChild(resizeHandle);
    canvas.appendChild(card);

    card.addEventListener("click", (event) => {
      if (editMode && (event.target === resizeHandle)) {
        return;
      }
      openTable(table.id);
    });

    if (editMode) {
      enableDrag(card, table.id);
      enableResize(card, resizeHandle, table.id);
    }
  });
}

function openTable(tableId) {
  activeTableId = tableId;
  const table = tables.find((item) => item.id === tableId);
  if (!table) return;

  ticketTable.textContent = table.label;
  ticketBody.innerHTML = "";
  const list = document.createElement("ul");
  list.className = "ticket-list";
  ["House Salad", "Grilled Salmon", "Sparkling Water"].forEach((item, index) => {
    const row = document.createElement("li");
    row.className = "ticket-item";
    row.innerHTML = `<span>${item}</span><span>#${index + 1}</span>`;
    list.appendChild(row);
  });
  ticketBody.appendChild(list);
  renderTables();
}

function enableDrag(card, tableId) {
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  const onMouseMove = (event) => {
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    card.style.left = `${startLeft + deltaX}px`;
    card.style.top = `${startTop + deltaY}px`;
  };

  const onMouseUp = async () => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    const updated = updateTableFromElement(card, tableId);
    await persistTable(updated);
  };

  card.addEventListener("mousedown", (event) => {
    if (event.target.classList.contains("resize-handle")) {
      return;
    }
    startX = event.clientX;
    startY = event.clientY;
    startLeft = parseFloat(card.style.left);
    startTop = parseFloat(card.style.top);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}

function enableResize(card, resizeHandle, tableId) {
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;

  const onMouseMove = (event) => {
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    const width = Math.max(80, startWidth + deltaX);
    const height = Math.max(60, startHeight + deltaY);
    card.style.width = `${width}px`;
    card.style.height = `${height}px`;
  };

  const onMouseUp = async () => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    const updated = updateTableFromElement(card, tableId);
    await persistTable(updated);
  };

  resizeHandle.addEventListener("mousedown", (event) => {
    event.stopPropagation();
    startX = event.clientX;
    startY = event.clientY;
    startWidth = card.offsetWidth;
    startHeight = card.offsetHeight;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}

function updateTableFromElement(card, tableId) {
  const table = tables.find((item) => item.id === tableId);
  if (!table) return null;
  table.x = parseFloat(card.style.left);
  table.y = parseFloat(card.style.top);
  table.width = parseFloat(card.style.width);
  table.height = parseFloat(card.style.height);
  return table;
}

async function persistTable(table) {
  if (!table) return;
  await fetch(`/api/tables/${table.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(table),
  });
}

if (editToggle) {
  editToggle.addEventListener("click", () => {
    editMode = !editMode;
    editToggle.classList.toggle("is-active", editMode);
    editToggle.textContent = editMode ? "Exit Edit" : "Edit Layout";
    renderTables();
  });
}

fetchTables();
