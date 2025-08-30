"""One-off migration script to add new payment status / due_date columns and
role + pay_to columns for payment_parties, idempotently.

Usage (PowerShell):
  $env:DB_HOST='your-host'
  $env:DB_USER='your-user'
  $env:DB_PASSWORD='your-pass'
  $env:DB_NAME='your-database'
  python migrate_add_status_and_pay_to.py

The script:
  1. Connects using mysql.connector
  2. Detects missing columns via information_schema
  3. Issues ALTER TABLE only for missing columns
  4. Creates the pay_to index if absent
  5. Backfills status for existing rows (paid if payment_date <= today, else pending) when status column newly added

Safe to re-run; it will skip existing artifacts.
"""

from __future__ import annotations
import os
import sys
from datetime import date
from typing import List, Tuple
from pathlib import Path

try:
    import mysql.connector  # type: ignore
except ImportError:
    print("mysql-connector-python not installed. Install with: pip install mysql-connector-python", file=sys.stderr)
    sys.exit(1)


def env(name: str, default: str | None = None, required: bool = False) -> str | None:
    v = os.environ.get(name, default)
    if required and (v is None or v == ""):
        print(f"Missing required env var {name}", file=sys.stderr)
        sys.exit(2)
    return v


DB_CONFIG = {
    # Defaults set to cloud instance; override via env if needed
    'host': env('DB_HOST', 'mysql-3ca7d4a2-romitmeher-d46c.g.aivencloud.com'),
    'user': env('DB_USER', 'avnadmin'),
    'password': env('DB_PASSWORD', required=True),
    'database': env('DB_NAME', 'land_deals_db'),
    'port': int(env('DB_PORT', '17231') or 17231),
}

# Optional SSL for cloud providers (e.g., Aiven, PlanetScale etc.)
if (os.environ.get('DB_SSL', '0').lower() in ('1', 'true', 'yes')):
    # Allow override path, else try local ca-certificate.pem
    ca_path = os.environ.get('DB_SSL_CA') or str(Path(__file__).parent / 'ca-certificate.pem')
    if Path(ca_path).exists():
        DB_CONFIG['ssl_ca'] = ca_path
        print(f"Using SSL CA: {ca_path}")
    else:
        print(f"SSL requested but CA file not found at {ca_path}; proceeding without ssl_ca", file=sys.stderr)


def get_conn():
    return mysql.connector.connect(**DB_CONFIG)


def column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(
        """SELECT COUNT(*) AS c FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s""",
        (DB_CONFIG['database'], table, column)
    )
    return cursor.fetchone()[0] > 0


def index_exists(cursor, table: str, index: str) -> bool:
    cursor.execute(
        """SELECT COUNT(*) FROM information_schema.STATISTICS 
            WHERE TABLE_SCHEMA=%s AND TABLE_NAME=%s AND INDEX_NAME=%s""",
        (DB_CONFIG['database'], table, index)
    )
    return cursor.fetchone()[0] > 0


def add_column(cursor, table: str, ddl: str):
    # ddl must be a single ADD COLUMN ... clause (without ALTER TABLE prefix)
    sql = f"ALTER TABLE {table} {ddl}"
    cursor.execute(sql)


def create_index(cursor, table: str, index_sql: str):
    cursor.execute(index_sql)


def main():
    print("Connecting to database ...")
    conn = get_conn()
    cursor = conn.cursor()
    try:
        to_add: List[Tuple[str, str, str]] = []  # (table, column, ddl)

        # payments table columns
        payments_columns = [
            ("payment_type", "ADD COLUMN payment_type ENUM('land_purchase','investment_sale','documentation_legal','other') DEFAULT 'other' AFTER notes"),
            ("status", "ADD COLUMN status ENUM('paid','pending','overdue') DEFAULT NULL AFTER payment_type"),
            ("due_date", "ADD COLUMN due_date DATE AFTER payment_date"),
        ]
        for col, ddl in payments_columns:
            if not column_exists(cursor, 'payments', col):
                to_add.append(('payments', col, ddl))

        # payment_parties table columns
        party_columns = [
            ("role", "ADD COLUMN role ENUM('payer','payee') DEFAULT NULL AFTER percentage"),
            ("pay_to_id", "ADD COLUMN pay_to_id INT DEFAULT NULL AFTER role"),
            ("pay_to_type", "ADD COLUMN pay_to_type ENUM('owner','buyer','investor','other') DEFAULT NULL AFTER pay_to_id"),
            ("pay_to_name", "ADD COLUMN pay_to_name VARCHAR(255) DEFAULT NULL AFTER pay_to_type"),
        ]
        for col, ddl in party_columns:
            if not column_exists(cursor, 'payment_parties', col):
                to_add.append(('payment_parties', col, ddl))

        if not to_add:
            print("All target columns already exist.")
        else:
            print("Adding missing columns:")
            for table, col, ddl in to_add:
                print(f" - {table}.{col}")
                add_column(cursor, table, ddl)

        # Index for pay_to lookups
        if not index_exists(cursor, 'payment_parties', 'idx_payment_parties_pay_to'):
            print("Creating index idx_payment_parties_pay_to ...")
            create_index(cursor, 'payment_parties', 'CREATE INDEX idx_payment_parties_pay_to ON payment_parties(pay_to_type, pay_to_id)')
        else:
            print("Index idx_payment_parties_pay_to already exists.")

        # Backfill status if it was just added
        if any(t == 'payments' and c == 'status' for t, c, _ in to_add):
            print("Backfilling status values ...")
            # paid if payment_date <= today else pending
            today_str = date.today().isoformat()
            cursor.execute("UPDATE payments SET status='paid' WHERE status IS NULL AND payment_date <= %s", (today_str,))
            cursor.execute("UPDATE payments SET status='pending' WHERE status IS NULL")

        conn.commit()
        print("Migration complete.")
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}", file=sys.stderr)
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == '__main__':
    main()
