#!/usr/bin/env python3
"""migrate_users_schema.py
Idempotent migration helper for the `users` table. It will:
 - add `role` VARCHAR(32) NOT NULL DEFAULT 'user' if missing
 - add `full_name` VARCHAR(255) NOT NULL DEFAULT '' if missing
 - ensure `username` is NOT NULL if there are no NULL usernames
 - create a UNIQUE index `ux_users_username` on (username) if missing

The script reads DB_PASSWORD from the repo .env and uses the same host/port/user/database as the app.
Run:
  python checks/migrate_users_schema.py
"""
import os
import sys
from pathlib import Path
import mysql.connector
from mysql.connector import errorcode

# locate repo .env (tries parent directories)
env_path = Path(__file__).resolve().parents[2] / '.env'
if not env_path.exists():
    p = Path(__file__).resolve()
    for _ in range(4):
        p = p.parent
        candidate = p / '.env'
        if candidate.exists():
            env_path = candidate
            break

if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip())

DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_HOST = os.environ.get('DB_HOST', 'mysql-3ca7d4a2-romitmeher-d46c.g.aivencloud.com')
DB_PORT = int(os.environ.get('DB_PORT', 17231))
DB_USER = os.environ.get('DB_USER', 'avnadmin')
DB_NAME = os.environ.get('DB_NAME', 'land_deals_db')
SSL_CA = os.path.join(os.path.dirname(__file__), '..', 'ca-certificate.pem')

if not DB_PASSWORD:
    print('ERROR: DB_PASSWORD not found in .env or environment')
    sys.exit(2)

cfg = {
    'host': DB_HOST,
    'port': DB_PORT,
    'user': DB_USER,
    'password': DB_PASSWORD,
    'database': DB_NAME,
    'ssl_ca': SSL_CA
}

def connect():
    try:
        return mysql.connector.connect(**cfg)
    except Exception as e:
        print('Failed to connect to DB:', e)
        sys.exit(3)


def column_exists(cur, db, table, column):
    cur.execute("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=%s AND TABLE_NAME=%s AND COLUMN_NAME=%s", (db, table, column))
    return cur.fetchone()[0] > 0


def index_exists(cur, db, table, index_name):
    cur.execute("SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=%s AND TABLE_NAME=%s AND INDEX_NAME=%s", (db, table, index_name))
    return cur.fetchone()[0] > 0


def is_column_nullable(cur, db, table, column):
    cur.execute("SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=%s AND TABLE_NAME=%s AND COLUMN_NAME=%s", (db, table, column))
    r = cur.fetchone()
    if not r:
        return None
    return r[0] == 'YES'


def count_nulls(cur, table, column):
    cur.execute(f"SELECT COUNT(*) FROM {table} WHERE {column} IS NULL")
    return cur.fetchone()[0]


def main():
    conn = connect()
    cur = conn.cursor()
    changed = []
    try:
        tbl = 'users'
        # role
        if not column_exists(cur, DB_NAME, tbl, 'role'):
            print('Adding column `role`...')
            cur.execute("ALTER TABLE users ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT 'user'")
            changed.append('added role')
        else:
            print('Column `role` exists')

        # full_name
        if not column_exists(cur, DB_NAME, tbl, 'full_name'):
            print('Adding column `full_name`...')
            cur.execute("ALTER TABLE users ADD COLUMN full_name VARCHAR(255) NOT NULL DEFAULT ''")
            changed.append('added full_name')
        else:
            print('Column `full_name` exists')

        # username not null
        nullable = is_column_nullable(cur, DB_NAME, tbl, 'username')
        if nullable is None:
            print('Column `username` not found; please verify users table exists')
        elif nullable:
            null_count = count_nulls(cur, tbl, 'username')
            if null_count > 0:
                print(f'username column allows NULL and there are {null_count} NULL rows; skipping NOT NULL migration')
            else:
                print('Making `username` NOT NULL')
                cur.execute("ALTER TABLE users MODIFY COLUMN username VARCHAR(150) NOT NULL")
                changed.append('username set NOT NULL')
        else:
            print('username column is already NOT NULL')

        # unique index on username
        idx = 'ux_users_username'
        if not index_exists(cur, DB_NAME, tbl, idx):
            print('Creating UNIQUE index on username...')
            try:
                cur.execute(f"CREATE UNIQUE INDEX {idx} ON users (username)")
                changed.append('created unique index ux_users_username')
            except mysql.connector.Error as e:
                # if duplicate usernames exist this will fail; report and skip
                print('Failed to create unique index (possible duplicates):', e)
        else:
            print('Unique index ux_users_username already exists')

        if changed:
            conn.commit()
            print('\nMigration applied:', ', '.join(changed))
        else:
            print('\nNothing to change')
    except Exception as e:
        print('Migration error:', e)
        conn.rollback()
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass

if __name__ == '__main__':
    main()
