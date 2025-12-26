from dataclasses import dataclass
from datetime import datetime
import json
import sqlite3
from flask import Flask, jsonify, render_template, request

DB_PATH = "orders.db"
TAX_RATE = 0.0825

app = Flask(__name__)


@dataclass
class MenuItem:
    sku: str
    name: str
    price: float
    category: str


MENU_ITEMS = [
    MenuItem("DS-01", "Shrimp Dumplings", 7.5, "Dimsum"),
    MenuItem("DS-02", "Pork Siu Mai", 6.75, "Dimsum"),
    MenuItem("DS-03", "Veggie Spring Rolls", 5.25, "Dimsum"),
    MenuItem("LN-01", "Kung Pao Chicken", 12.5, "Lunch"),
    MenuItem("LN-02", "Beef Chow Fun", 13.25, "Lunch"),
    MenuItem("LN-03", "Mapo Tofu", 11.0, "Lunch"),
    MenuItem("DN-01", "Peking Duck", 28.0, "Dinner"),
    MenuItem("DN-02", "Seafood Fried Rice", 16.5, "Dinner"),
    MenuItem("DN-03", "Szechuan Eggplant", 14.25, "Dinner"),
]


def connect_db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    connection = connect_db()
    cursor = connection.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_type TEXT NOT NULL,
            table_label TEXT,
            created_at TEXT NOT NULL,
            subtotal REAL NOT NULL,
            tax REAL NOT NULL,
            tip REAL NOT NULL,
            discount REAL NOT NULL,
            total REAL NOT NULL
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            sku TEXT NOT NULL,
            name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            total REAL NOT NULL,
            FOREIGN KEY(order_id) REFERENCES orders(id)
        )
        """
    )
    connection.commit()
    connection.close()


@app.before_first_request
def setup_database():
    init_db()


@app.route("/")
def index():
    return render_template("index.html", tax_rate=TAX_RATE)


@app.route("/api/menu")
def menu():
    categories = {}
    for item in MENU_ITEMS:
        categories.setdefault(item.category, []).append(
            {
                "sku": item.sku,
                "name": item.name,
                "price": item.price,
                "category": item.category,
            }
        )
    return jsonify({"categories": categories})


@app.route("/api/orders", methods=["POST"])
def create_order():
    payload = request.get_json(force=True)
    ticket_type = payload.get("ticketType")
    table_label = payload.get("tableLabel")
    items = payload.get("items", [])
    tip = float(payload.get("tip", 0))
    discount = float(payload.get("discount", 0))

    if not ticket_type:
        return jsonify({"error": "Ticket type is required."}), 400
    if ticket_type == "table" and not table_label:
        return jsonify({"error": "Table label is required for table tickets."}), 400
    if not items:
        return jsonify({"error": "At least one item is required."}), 400

    subtotal = sum(item["price"] * item["quantity"] for item in items)
    tax = round(subtotal * TAX_RATE, 2)
    total = round(subtotal + tax + tip - discount, 2)

    connection = connect_db()
    cursor = connection.cursor()
    cursor.execute(
        """
        INSERT INTO orders (
            ticket_type, table_label, created_at, subtotal, tax, tip, discount, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            ticket_type,
            table_label,
            datetime.utcnow().isoformat(),
            subtotal,
            tax,
            tip,
            discount,
            total,
        ),
    )
    order_id = cursor.lastrowid

    item_rows = [
        (
            order_id,
            item["sku"],
            item["name"],
            item["quantity"],
            item["price"],
            item["price"] * item["quantity"],
        )
        for item in items
    ]
    cursor.executemany(
        """
        INSERT INTO order_items (
            order_id, sku, name, quantity, price, total
        ) VALUES (?, ?, ?, ?, ?, ?)
        """,
        item_rows,
    )
    connection.commit()
    connection.close()

    return jsonify({"orderId": order_id, "total": total})


@app.route("/api/orders/<int:order_id>")
def get_order(order_id):
    connection = connect_db()
    cursor = connection.cursor()
    cursor.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
    order = cursor.fetchone()
    if not order:
        connection.close()
        return jsonify({"error": "Order not found."}), 404
    cursor.execute("SELECT * FROM order_items WHERE order_id = ?", (order_id,))
    items = [dict(row) for row in cursor.fetchall()]
    connection.close()
    return jsonify({"order": dict(order), "items": items})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
