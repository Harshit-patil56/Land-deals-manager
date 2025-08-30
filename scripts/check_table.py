"""
Small utility to check for a table in the configured MySQL database.

Usage examples (PowerShell):
    # use environment variables DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME
    python .\scripts\check_table.py --table ttable --show-create --rows 5

    # or pass DB details on the command line (safer to use env vars)
    python .\scripts\check_table.py --host 127.0.0.1 --port 3306 --user root --password secret --database mydb --table ttable --show-create --rows 3

The script prints whether the table exists, optionally the CREATE TABLE DDL, columns, row count and a sample of rows.
"""

import os
import sys
import argparse
import mysql.connector
from mysql.connector import errorcode


def parse_args():
    p = argparse.ArgumentParser(description='Check existence and contents of a table in MySQL')
    p.add_argument('--host', help='DB host (env DB_HOST)', default=os.environ.get('DB_HOST', 'localhost'))
    p.add_argument('--port', help='DB port (env DB_PORT)', type=int, default=int(os.environ.get('DB_PORT', 3306)))
    p.add_argument('--user', help='DB user (env DB_USER)', default=os.environ.get('DB_USER', 'root'))
    p.add_argument('--password', help='DB password (env DB_PASS)', default=os.environ.get('DB_PASS', ''))
    p.add_argument('--database', help='DB name (env DB_NAME)', default=os.environ.get('DB_NAME'))
    p.add_argument('--table', help='Table name to check', default='ttable')
    p.add_argument('--rows', help='Number of sample rows to print', type=int, default=10)
    p.add_argument('--show-create', help='Show CREATE TABLE output', action='store_true')
    p.add_argument('--show-columns', help='Show column definition (DESCRIBE)', action='store_true')
    p.add_argument('--count', help='Also show row count', action='store_true')
    return p.parse_args()


def connect(cfg):
    try:
        conn = mysql.connector.connect(
            host=cfg.host,
            port=cfg.port,
            user=cfg.user,
            password=cfg.password,
            database=cfg.database
        )
        return conn
    except mysql.connector.Error as e:
        print(f"ERROR: could not connect to database: {e}")
        sys.exit(2)


def table_exists(conn, schema, table):
    cur = conn.cursor()
    cur.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=%s AND TABLE_NAME=%s", (schema, table))
    row = cur.fetchone()
    cur.close()
    return bool(row)


def show_create(conn, table):
    cur = conn.cursor()
    cur.execute(f"SHOW CREATE TABLE `{table}`")
    row = cur.fetchone()
    cur.close()
    if row and len(row) >= 2:
        print('\n=== CREATE TABLE ===')
        print(row[1])
    else:
        print('No CREATE TABLE output')


def show_describe(conn, table):
    cur = conn.cursor()
    cur.execute(f"DESCRIBE `{table}`")
    rows = cur.fetchall()
    cur.close()
    if not rows:
        print('No columns returned')
        return
    print('\n=== COLUMNS (DESCRIBE) ===')
    for r in rows:
        print(' | '.join(str(x) for x in r))


def show_count(conn, table):
    cur = conn.cursor()
    cur.execute(f"SELECT COUNT(*) FROM `{table}`")
    cnt = cur.fetchone()[0]
    cur.close()
    print(f'\nRow count: {cnt}')


def show_rows(conn, table, limit):
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM `{table}` LIMIT %s", (limit,))
    rows = cur.fetchall()
    cols = [c[0] for c in cur.description] if cur.description else []
    cur.close()

    if not rows:
        print('\nNo rows found (or table is empty).')
        return

    print('\n=== SAMPLE ROWS ===')
    # print header
    print(' | '.join(cols))
    print('-' * 80)
    for r in rows:
        print(' | '.join(str(x) for x in r))


def main():
    args = parse_args()

    if not args.database:
        print('ERROR: database name is required. Provide --database or set DB_NAME environment variable.')
        sys.exit(1)

    cfg = args
    print(f"Connecting to {cfg.user}@{cfg.host}:{cfg.port}/{cfg.database} ...")
    conn = connect(cfg)

    try:
        exists = table_exists(conn, cfg.database, cfg.table)
        if not exists:
            print(f"Table '{cfg.table}' does NOT exist in database '{cfg.database}'.")
            sys.exit(0)

        print(f"Table '{cfg.table}' exists in database '{cfg.database}'.")

        if args.show_create:
            show_create(conn, cfg.table)

        if args.show_columns:
            show_describe(conn, cfg.table)

        if args.count:
            show_count(conn, cfg.table)

        if args.rows and args.rows > 0:
            show_rows(conn, cfg.table, args.rows)

    finally:
        conn.close()


if __name__ == '__main__':
    main()
