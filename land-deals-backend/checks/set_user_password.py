#!/usr/bin/env python3
"""set_user_password.py
Interactive script to set (or reset) a user's password in the users table.
The script hashes the password using werkzeug.generate_password_hash before updating.

Usage:
  python checks/set_user_password.py

It will prompt for DB .env location automatically (repo root) and then prompt for username
and password (hidden). It will update the `users` table for the given username.
"""
import os
import getpass
from pathlib import Path
import mysql.connector
from werkzeug.security import generate_password_hash

# find .env at repo root
env = Path(__file__).resolve().parents[2] / '.env'
if not env.exists():
    p = Path(__file__).resolve()
    for _ in range(4):
        p = p.parent
        candidate = p / '.env'
        if candidate.exists():
            env = candidate
            break

if env.exists():
    for line in env.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip())

DB_PASSWORD = os.environ.get('DB_PASSWORD')
if not DB_PASSWORD:
    print('DB_PASSWORD not found in .env. Set DB_PASSWORD env var and retry.')
    raise SystemExit(2)

cfg = {
    'host': 'mysql-3ca7d4a2-romitmeher-d46c.g.aivencloud.com',
    'port': 17231,
    'user': 'avnadmin',
    'password': DB_PASSWORD,
    'database': 'land_deals_db',
    'ssl_ca': os.path.join(os.path.dirname(__file__), '..', 'ca-certificate.pem')
}

username = input('Username to update: ').strip()
if not username:
    print('No username provided; aborting.')
    raise SystemExit(2)

pw = getpass.getpass('New password: ')
pw2 = getpass.getpass('Confirm password: ')
if pw != pw2:
    print('Passwords do not match; aborting.')
    raise SystemExit(2)

hashed = generate_password_hash(pw)

try:
    conn = mysql.connector.connect(**cfg)
    cur = conn.cursor()
    cur.execute('SELECT id, username FROM users WHERE username = %s', (username,))
    row = cur.fetchone()
    if not row:
        print('User not found:', username)
        raise SystemExit(2)
    cur.execute('UPDATE users SET password = %s WHERE username = %s', (hashed, username))
    conn.commit()
    print('Password updated for user', username)
except Exception as e:
    print('ERROR:', e)
finally:
    try:
        conn.close()
    except Exception:
        pass
