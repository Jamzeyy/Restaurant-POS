from dataclasses import dataclass
from datetime import datetime
import json
import sqlite3
from flask import Flask, jsonify, render_template, request

DB_PATH = "/tmp/orders.db"
TAX_RATE = 0.0825

app = Flask(__name__)
app.config.setdefault("DB_INITIALIZED", False)


@dataclass
class MenuItem:
    sku: str
    name: str
    description: str
    price: float
    category: str
    tags: list[str]


MENU_ITEMS = [
    MenuItem(
        "DS-01",
        "Shrimp Dumplings",
        "Har gow with sweet shrimp and bamboo shoots.",
        7.5,
        "Dimsum",
        ["seafood"],
    ),
    MenuItem(
        "DS-02",
        "Pork Siu Mai",
        "Steamed pork dumplings with ginger and scallion.",
        6.75,
        "Dimsum",
        [],
    ),
    MenuItem(
        "DS-03",
        "Veggie Spring Rolls",
        "Crisp rolls with cabbage, carrots, and glass noodles.",
        5.25,
        "Dimsum",
        ["vegetarian"],
    ),
    MenuItem(
        "LN-01",
        "Kung Pao Chicken",
        "Wok-tossed chicken with peanuts and chili glaze.",
        12.5,
        "Lunch",
        ["spicy"],
    ),
    MenuItem(
        "LN-02",
        "Beef Chow Fun",
        "Stir-fried rice noodles with marinated beef and soy.",
        13.25,
        "Lunch",
        [],
    ),
    MenuItem(
        "LN-03",
        "Mapo Tofu",
        "Silken tofu in spicy fermented bean sauce.",
        11.0,
        "Lunch",
        ["spicy", "vegetarian"],
    ),
    MenuItem(
        "DN-01",
        "Peking Duck",
        "Crispy duck with pancakes, scallions, and hoisin.",
        28.0,
        "Dinner",
        [],
    ),
    MenuItem(
        "DN-02",
        "Seafood Fried Rice",
        "Jasmine rice with shrimp, scallop, and egg.",
        16.5,
        "Dinner",
        ["seafood"],
    ),
    MenuItem(
        "DN-03",
        "Szechuan Eggplant",
        "Braised eggplant with garlic, basil, and chili.",
        14.25,
        "Dinner",
        ["spicy", "vegetarian"],
    ),
]


def connect_db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
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
            delivery_address TEXT,
            delivery_contact TEXT,
            created_at TEXT NOT NULL,
            subtotal REAL NOT NULL,
            tax REAL NOT NULL,
            tip REAL NOT NULL,
            discount REAL NOT NULL,
            total REAL NOT NULL
        )
        """
    )
    ensure_column(cursor, "orders", "delivery_address", "TEXT")
    ensure_column(cursor, "orders", "delivery_contact", "TEXT")
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
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            method TEXT NOT NULL,
            amount_due REAL NOT NULL,
            amount_tendered REAL NOT NULL,
            change_due REAL NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(order_id) REFERENCES orders(id)
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            payment_id INTEGER NOT NULL,
            provider TEXT NOT NULL,
            reference TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(payment_id) REFERENCES payments(id)
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS printers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            connection_type TEXT NOT NULL,
            device_identifier TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS printer_mappings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kitchen_printer_id INTEGER,
            receipt_printer_id INTEGER,
            created_at TEXT NOT NULL,
            FOREIGN KEY(kitchen_printer_id) REFERENCES printers(id),
            FOREIGN KEY(receipt_printer_id) REFERENCES printers(id)
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS print_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            payment_id INTEGER,
            printer_id INTEGER NOT NULL,
            job_type TEXT NOT NULL,
            payload TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(order_id) REFERENCES orders(id),
            FOREIGN KEY(payment_id) REFERENCES payments(id),
            FOREIGN KEY(printer_id) REFERENCES printers(id)
        )
        """
    )
    ensure_printer_mapping_row(cursor)
    connection.commit()
    connection.close()


def ensure_column(cursor, table_name, column_name, column_type):
    cursor.execute(f"PRAGMA table_info({table_name})")
    existing_columns = {row[1] for row in cursor.fetchall()}
    if column_name not in existing_columns:
        cursor.execute(
            f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"
        )


def ensure_printer_mapping_row(cursor):
    cursor.execute("SELECT COUNT(*) AS count FROM printer_mappings")
    row = cursor.fetchone()
    if row and row["count"] == 0:
        cursor.execute(
            """
            INSERT INTO printer_mappings (kitchen_printer_id, receipt_printer_id, created_at)
            VALUES (?, ?, ?)
            """,
            (None, None, datetime.utcnow().isoformat()),
        )


def fetch_order_details(cursor, order_id):
    cursor.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
    order = cursor.fetchone()
    if not order:
        return None, []
    cursor.execute("SELECT * FROM order_items WHERE order_id = ?", (order_id,))
    items = [dict(row) for row in cursor.fetchall()]
    return dict(order), items


def fetch_printer_mapping(cursor):
    cursor.execute(
        "SELECT kitchen_printer_id, receipt_printer_id FROM printer_mappings LIMIT 1"
    )
    mapping = cursor.fetchone()
    return dict(mapping) if mapping else {"kitchen_printer_id": None, "receipt_printer_id": None}


def fetch_printer(cursor, printer_id):
    if not printer_id:
        return None
    cursor.execute("SELECT * FROM printers WHERE id = ?", (printer_id,))
    row = cursor.fetchone()
    return dict(row) if row else None


def format_ticket_header(title, order):
    lines = [
        title,
        f"Order #{order['id']} · {order['ticket_type'].replace('-', ' ').title()}",
    ]
    if order.get("table_label"):
        lines.append(f"Table/Label: {order['table_label']}")
    if order.get("delivery_address"):
        lines.append(f"Address: {order['delivery_address']}")
    if order.get("delivery_contact"):
        lines.append(f"Contact: {order['delivery_contact']}")
    lines.append(f"Placed: {order['created_at']}")
    return "\n".join(lines)


def build_kitchen_ticket(order, items):
    header = format_ticket_header("KITCHEN TICKET", order)
    lines = [header, "", "Items:"]
    for item in items:
        lines.append(f"- {item['quantity']} x {item['name']}")
    lines.append("")
    lines.append("Notes: __________________________________")
    return "\n".join(lines)


def build_customer_receipt(order, items, payment):
    header = format_ticket_header("CUSTOMER RECEIPT", order)
    lines = [header, "", "Items:"]
    for item in items:
        line_total = item["price"] * item["quantity"]
        lines.append(
            f"- {item['name']} ({item['quantity']} @ ${item['price']:.2f}) = ${line_total:.2f}"
        )
    lines.extend(
        [
            "",
            f"Subtotal: ${order['subtotal']:.2f}",
            f"Tax: ${order['tax']:.2f}",
            f"Tip: ${order['tip']:.2f}",
            f"Discount: -${order['discount']:.2f}",
            f"Total: ${order['total']:.2f}",
        ]
    )
    if payment:
        lines.extend(
            [
                "",
                f"Payment Method: {payment['method'].title()}",
                f"Amount Tendered: ${payment['amount_tendered']:.2f}",
                f"Change Due: ${payment['change_due']:.2f}",
                f"Status: {payment['status']}",
            ]
        )
    return "\n".join(lines)


def format_print_payload(printer, content):
    if printer["connection_type"] == "escpos":
        return f"\x1b@\n{content}\n\n\x1dV\x00"
    return content


def queue_print_job(connection, order_id, payment_id, job_type, printer, content):
    payload = format_print_payload(printer, content)
    cursor = connection.cursor()
    cursor.execute(
        """
        INSERT INTO print_jobs (
            order_id, payment_id, printer_id, job_type, payload, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            order_id,
            payment_id,
            printer["id"],
            job_type,
            payload,
            "queued",
            datetime.utcnow().isoformat(),
        ),
    )
    return cursor.lastrowid


def queue_kitchen_ticket(connection, order_id):
    cursor = connection.cursor()
    mapping = fetch_printer_mapping(cursor)
    printer = fetch_printer(cursor, mapping.get("kitchen_printer_id"))
    if not printer:
        return None
    order, items = fetch_order_details(cursor, order_id)
    if not order:
        return None
    content = build_kitchen_ticket(order, items)
    return queue_print_job(connection, order_id, None, "kitchen", printer, content)


def queue_receipt(connection, order_id, payment_id):
    cursor = connection.cursor()
    mapping = fetch_printer_mapping(cursor)
    printer = fetch_printer(cursor, mapping.get("receipt_printer_id"))
    if not printer:
        return None
    order, items = fetch_order_details(cursor, order_id)
    if not order:
        return None
    cursor.execute("SELECT * FROM payments WHERE id = ?", (payment_id,))
    payment = cursor.fetchone()
    payment_data = dict(payment) if payment else None
    content = build_customer_receipt(order, items, payment_data)
    return queue_print_job(connection, order_id, payment_id, "receipt", printer, content)


@app.before_request
def setup_database():
    if not app.config["DB_INITIALIZED"]:
        init_db()
        app.config["DB_INITIALIZED"] = True


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
                "description": item.description,
                "price": item.price,
                "category": item.category,
                "tags": item.tags,
            }
        )
    return jsonify({"categories": categories})


@app.route("/api/orders", methods=["POST"])
def create_order():
    payload = request.get_json(force=True)
    order_type = payload.get("orderType")
    table_label = payload.get("tableLabel")
    delivery_address = payload.get("deliveryAddress")
    delivery_contact = payload.get("deliveryContact")
    items = payload.get("items", [])
    tip = float(payload.get("tip", 0))
    discount = float(payload.get("discount", 0))

    if not order_type:
        return jsonify({"error": "Order type is required."}), 400
    if order_type not in {"dine-in", "takeout", "delivery"}:
        return jsonify({"error": "Order type is invalid."}), 400
    if order_type == "dine-in" and not table_label:
        return jsonify({"error": "Table label is required for dine-in orders."}), 400
    if order_type == "delivery" and not delivery_address:
        return jsonify({"error": "Delivery address is required."}), 400
    if order_type == "delivery" and not delivery_contact:
        return jsonify({"error": "Delivery contact is required."}), 400
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
            ticket_type, table_label, delivery_address, delivery_contact, created_at,
            subtotal, tax, tip, discount, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            order_type,
            table_label,
            delivery_address,
            delivery_contact,
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
    kitchen_print_job_id = queue_kitchen_ticket(connection, order_id)
    connection.commit()
    connection.close()

    return jsonify(
        {
            "orderId": order_id,
            "total": total,
            "kitchenPrintJobId": kitchen_print_job_id,
        }
    )


def _fetch_order_total(cursor, order_id):
    cursor.execute("SELECT total FROM orders WHERE id = ?", (order_id,))
    return cursor.fetchone()


@app.route("/api/payments", methods=["POST"])
def create_payment():
    payload = request.get_json(force=True)
    order_id = payload.get("orderId")
    method = payload.get("method")
    amount_tendered = float(payload.get("amountTendered", 0))

    if not order_id:
        return jsonify({"error": "Order ID is required."}), 400
    if method not in {"cash", "card"}:
        return jsonify({"error": "Payment method is invalid."}), 400

    connection = connect_db()
    cursor = connection.cursor()
    order = _fetch_order_total(cursor, order_id)
    if not order:
        connection.close()
        return jsonify({"error": "Order not found."}), 404

    amount_due = float(order["total"])
    if method == "cash":
        if amount_tendered < amount_due:
            connection.close()
            return (
                jsonify({"error": "Cash tendered must cover the amount due."}),
                400,
            )
        change_due = round(amount_tendered - amount_due, 2)
        status = "received"
        provider = "cash"
        reference = f"CASH-{order_id}-{int(datetime.utcnow().timestamp())}"
    else:
        amount_tendered = amount_due
        change_due = 0.0
        status = "approved"
        provider = "stripe-terminal"
        reference = f"STR-{order_id}-{int(datetime.utcnow().timestamp())}"

    cursor.execute(
        """
        INSERT INTO payments (
            order_id, method, amount_due, amount_tendered, change_due, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            order_id,
            method,
            amount_due,
            amount_tendered,
            change_due,
            status,
            datetime.utcnow().isoformat(),
        ),
    )
    payment_id = cursor.lastrowid
    cursor.execute(
        """
        INSERT INTO transactions (
            payment_id, provider, reference, status, created_at
        ) VALUES (?, ?, ?, ?, ?)
        """,
        (
            payment_id,
            provider,
            reference,
            status,
            datetime.utcnow().isoformat(),
        ),
    )
    receipt_print_job_id = queue_receipt(connection, order_id, payment_id)
    connection.commit()
    connection.close()

    return jsonify(
        {
            "paymentId": payment_id,
            "orderId": order_id,
            "method": method,
            "amountDue": amount_due,
            "amountTendered": amount_tendered,
            "changeDue": change_due,
            "status": status,
            "reference": reference,
            "receiptPrintJobId": receipt_print_job_id,
        }
    )


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


@app.route("/api/printers", methods=["GET", "POST"])
def printers():
    connection = connect_db()
    cursor = connection.cursor()
    if request.method == "POST":
        payload = request.get_json(force=True)
        name = payload.get("name", "").strip()
        connection_type = payload.get("connectionType")
        device_identifier = payload.get("deviceIdentifier", "").strip()
        if not name:
            return jsonify({"error": "Printer name is required."}), 400
        if connection_type not in {"escpos", "driver"}:
            return jsonify({"error": "Connection type is invalid."}), 400
        if not device_identifier:
            return jsonify({"error": "Device identifier is required."}), 400
        cursor.execute(
            """
            INSERT INTO printers (name, connection_type, device_identifier, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (
                name,
                connection_type,
                device_identifier,
                datetime.utcnow().isoformat(),
            ),
        )
        printer_id = cursor.lastrowid
        connection.commit()
        connection.close()
        return jsonify({"id": printer_id}), 201

    cursor.execute("SELECT * FROM printers ORDER BY name")
    printers = [dict(row) for row in cursor.fetchall()]
    connection.close()
    return jsonify({"printers": printers})


@app.route("/api/printers/<int:printer_id>", methods=["DELETE"])
def delete_printer(printer_id):
    connection = connect_db()
    cursor = connection.cursor()
    cursor.execute(
        """
        UPDATE printer_mappings
        SET
            kitchen_printer_id = CASE WHEN kitchen_printer_id = ? THEN NULL ELSE kitchen_printer_id END,
            receipt_printer_id = CASE WHEN receipt_printer_id = ? THEN NULL ELSE receipt_printer_id END
        """,
        (printer_id, printer_id),
    )
    cursor.execute("DELETE FROM printers WHERE id = ?", (printer_id,))
    connection.commit()
    connection.close()
    return jsonify({"deleted": printer_id})


@app.route("/api/printer-mappings", methods=["GET", "PUT"])
def printer_mappings():
    connection = connect_db()
    cursor = connection.cursor()
    if request.method == "PUT":
        payload = request.get_json(force=True)
        kitchen_printer_id = payload.get("kitchenPrinterId")
        receipt_printer_id = payload.get("receiptPrinterId")
        if kitchen_printer_id:
            cursor.execute(
                "SELECT 1 FROM printers WHERE id = ?", (kitchen_printer_id,)
            )
            if not cursor.fetchone():
                connection.close()
                return jsonify({"error": "Kitchen printer not found."}), 400
        if receipt_printer_id:
            cursor.execute(
                "SELECT 1 FROM printers WHERE id = ?", (receipt_printer_id,)
            )
            if not cursor.fetchone():
                connection.close()
                return jsonify({"error": "Receipt printer not found."}), 400
        cursor.execute(
            """
            UPDATE printer_mappings
            SET kitchen_printer_id = ?, receipt_printer_id = ?
            WHERE id = (SELECT id FROM printer_mappings LIMIT 1)
            """,
            (kitchen_printer_id, receipt_printer_id),
        )
        mapping = fetch_printer_mapping(cursor)
        connection.commit()
        connection.close()
        return jsonify({"updated": True, "mapping": mapping})

    mapping = fetch_printer_mapping(cursor)
    connection.close()
    return jsonify({"mapping": mapping})


@app.route("/api/print-jobs")
def print_jobs():
    connection = connect_db()
    cursor = connection.cursor()
    cursor.execute(
        """
        SELECT print_jobs.*, printers.name AS printer_name
        FROM print_jobs
        JOIN printers ON printers.id = print_jobs.printer_id
        ORDER BY print_jobs.created_at DESC
        LIMIT 20
        """
    )
    jobs = [dict(row) for row in cursor.fetchall()]
    connection.close()
    return jsonify({"jobs": jobs})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
