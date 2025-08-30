"""
List all tables in the configured MySQL database.

Usage (PowerShell):
  $env:DB_HOST='mysql-...'; $env:DB_PORT='17231'; $env:DB_USER='avnadmin'; $env:DB_PASS='...'; $env:DB_NAME='land_deals_db';
  python .\scripts\list_tables.py
"""
import os
import sys
try:
    import mysql.connector
except Exception as e:
    print('Please install mysql-connector-python in your environment:', e)
    sys.exit(2)

host = os.environ.get('DB_HOST', 'localhost')
port = int(os.environ.get('DB_PORT', 3306))
user = os.environ.get('DB_USER', 'root')
password = os.environ.get('DB_PASS', '')
database = os.environ.get('DB_NAME')

if not database:
    print('ERROR: DB_NAME environment variable not set (or pass --database in a different script).')
    sys.exit(1)

print(f"Connecting to {user}@{host}:{port}/{database} ...")
try:
    conn = mysql.connector.connect(host=host, port=port, user=user, password=password, database=database)
except Exception as e:
    print('ERROR: could not connect to database:', e)
    sys.exit(2)

try:
    cur = conn.cursor()
    cur.execute('SHOW TABLES')
    rows = cur.fetchall()
    if not rows:
        print('No tables found in database')
    else:
        print('\nTables:')
        for r in rows:
            print(' -', r[0])
finally:
    conn.close()
