"""
Backup specified tables (CREATE + INSERTs) and add missing columns safely.

Usage: set env vars DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME or ensure .env exists.
Then run:
    python scripts/migrate_add_columns.py
"""
import os
import sys
import mysql.connector
from datetime import datetime

DB = {
    'host': os.environ.get('DB_HOST', 'mysql-3ca7d4a2-romitmeher-d46c.g.aivencloud.com'),
    'port': int(os.environ.get('DB_PORT', 17231)),
    'user': os.environ.get('DB_USER', 'avnadmin'),
    'password': os.environ.get('DB_PASS', os.environ.get('DB_PASSWORD', '')),
    'database': os.environ.get('DB_NAME', os.environ.get('DB_NAME', 'land_deals_db'))
}

BACKUP_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backups')
os.makedirs(BACKUP_DIR, exist_ok=True)

TABLES = ['payments', 'payment_proofs', 'payment_parties']


def connect():
    try:
        return mysql.connector.connect(host=DB['host'], port=DB['port'], user=DB['user'], password=DB['password'], database=DB['database'])
    except Exception as e:
        print('Failed to connect to DB:', e)
        sys.exit(2)


def write_backup_for_table(conn, table):
    cur = conn.cursor()
    # SHOW CREATE
    cur.execute(f"SHOW CREATE TABLE `{table}`")
    row = cur.fetchone()
    create_sql = row[1] if row and len(row) > 1 else None
    ts = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
    filename = os.path.join(BACKUP_DIR, f"{table}_backup_{ts}.sql")
    with open(filename, 'w', encoding='utf-8') as f:
        f.write('-- Backup of table: %s\n' % table)
        if create_sql:
            f.write(create_sql + ';\n')
        # Dump rows as INSERTs
        cur.execute(f"SELECT * FROM `{table}`")
        rows = cur.fetchall()
        if rows:
            cols = [d[0] for d in cur.description]
            for r in rows:
                vals = []
                for v in r:
                    if v is None:
                        vals.append('NULL')
                    elif isinstance(v, (int, float)):
                        vals.append(str(v))
                    else:
                        s = str(v).replace("\\", "\\\\").replace("'", "\\'")
                        vals.append("'" + s + "'")
                f.write(f"INSERT INTO `{table}` ({', '.join(cols)}) VALUES ({', '.join(vals)});\n")
    cur.close()
    print(f'Backup written: {filename}')
    return filename


def column_exists(conn, table, col):
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=%s AND TABLE_NAME=%s AND COLUMN_NAME=%s", (DB['database'], table, col))
    exists = cur.fetchone()[0] > 0
    cur.close()
    return exists


def alter_add_columns(conn):
    cur = conn.cursor()
    changes = []
    if not column_exists(conn, 'payments', 'category'):
        changes.append("ALTER TABLE payments ADD COLUMN category ENUM('buy','sell','docs','other') DEFAULT NULL;")
    if not column_exists(conn, 'payment_proofs', 'file_name'):
        changes.append("ALTER TABLE payment_proofs ADD COLUMN file_name VARCHAR(255) AFTER file_path;")
    if not column_exists(conn, 'payment_parties', 'role'):
        # role allows 'payer','payee','split' to indicate direction
        changes.append("ALTER TABLE payment_parties ADD COLUMN role ENUM('payer','payee','split') DEFAULT NULL;")
    if not changes:
        print('No schema changes required; columns already present.')
        return
    try:
        for sql in changes:
            print('Executing:', sql)
            cur.execute(sql)
        conn.commit()
        print('Schema changes applied successfully')
    except Exception as e:
        print('Schema change failed:', e)
        conn.rollback()
        cur.close()
        sys.exit(3)
    cur.close()


def describe_table(conn, table):
    cur = conn.cursor()
    cur.execute(f"DESCRIBE `{table}`")
    rows = cur.fetchall()
    cur.close()
    print('\nDESCRIBE', table)
    for r in rows:
        print(r)


if __name__ == '__main__':
    print('DB:', DB['host'], DB['port'], DB['database'])
    conn = connect()
    try:
        # create backups
        for t in TABLES:
            write_backup_for_table(conn, t)
        # apply alter
        alter_add_columns(conn)
        # verify
        for t in TABLES:
            describe_table(conn, t)
    finally:
        conn.close()
