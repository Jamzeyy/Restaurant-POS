from __future__ import annotations

import sqlite3
from dataclasses import asdict, dataclass
from pathlib import Path

from flask import Flask, jsonify, redirect, render_template, request, session, url_for

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "tables.db"

app = Flask(__name__)
app.secret_key = "dev-secret"


@dataclass
class Table:
    id: int
    label: str
    x: float
    y: float
    width: float
    height: float


DEFAULT_TABLES = [
    Table(id=1, label="Table 1", x=40, y=40, width=120, height=80),
    Table(id=2, label="Table 2", x=200, y=40, width=120, height=80),
    Table(id=3, label="Table 3", x=360, y=40, width=120, height=80),
    Table(id=4, label="Booth 4", x=40, y=160, width=160, height=100),
]


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS tables (
                id INTEGER PRIMARY KEY,
                label TEXT NOT NULL,
                x REAL NOT NULL,
                y REAL NOT NULL,
                width REAL NOT NULL,
                height REAL NOT NULL
            )
            """
        )
        cursor = connection.execute("SELECT COUNT(*) AS count FROM tables")
        if cursor.fetchone()["count"] == 0:
            connection.executemany(
                """
                INSERT INTO tables (id, label, x, y, width, height)
                VALUES (:id, :label, :x, :y, :width, :height)
                """,
                [asdict(table) for table in DEFAULT_TABLES],
            )


def fetch_tables() -> list[Table]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT id, label, x, y, width, height FROM tables ORDER BY id"
        ).fetchall()
    return [Table(**dict(row)) for row in rows]


@app.before_request
def ensure_db() -> None:
    init_db()


@app.route("/")
def dining_room() -> str:
    is_admin = session.get("role") == "admin"
    return render_template("index.html", is_admin=is_admin)


@app.route("/login/<role>")
def login(role: str):
    session["role"] = role
    return redirect(url_for("dining_room"))


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("dining_room"))


@app.get("/api/tables")
def list_tables():
    return jsonify([asdict(table) for table in fetch_tables()])


@app.put("/api/tables/<int:table_id>")
def update_table(table_id: int):
    payload = request.get_json(force=True)
    if session.get("role") != "admin":
        return jsonify({"error": "admin_required"}), 403

    with get_connection() as connection:
        connection.execute(
            """
            UPDATE tables
            SET label = ?, x = ?, y = ?, width = ?, height = ?
            WHERE id = ?
            """,
            (
                payload.get("label"),
                payload.get("x"),
                payload.get("y"),
                payload.get("width"),
                payload.get("height"),
                table_id,
            ),
        )
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
