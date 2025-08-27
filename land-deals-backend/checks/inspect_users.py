#!/usr/bin/env python3
"""Inspect users table to diagnose login failures.
Prints id, username, role, full_name, whether password is present and whether it looks hashed.
"""
import os
import mysql.connector
from pathlib import Path

# Load DB_PASSWORD from .env (repo root)
# Find repository root .env (two levels up from this checks/ file)
env = Path(__file__).resolve().parents[2] / '.env'
if not env.exists():
    # fallback: search upwards up to 4 levels
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
    print('NO_DB_PASSWORD')
    raise SystemExit(2)

cfg = {
    'host': 'mysql-3ca7d4a2-romitmeher-d46c.g.aivencloud.com',
    'port': 17231,
    'user': 'avnadmin',
    'password': DB_PASSWORD,
    'database': 'land_deals_db',
    'ssl_ca': os.path.join(os.path.dirname(__file__), '..', 'ca-certificate.pem')
}

try:
    conn = mysql.connector.connect(**cfg)
    cur = conn.cursor(dictionary=True)
    cur.execute('SELECT id, username, role, full_name, password FROM users')
    rows = cur.fetchall()
    if not rows:
        print('NO_USERS')
    for r in rows:
        pwd = r.get('password')
        has = 'YES' if pwd else 'NO'
        looks_hashed = 'UNKNOWN'
        if pwd:
            s = str(pwd)
            if s.startswith('pbkdf2:') or s.startswith('$2') or s.startswith('sha1$') or len(s) > 20:
                looks_hashed = 'LIKELY'
            else:
                looks_hashed = 'NO'
        print(f"USER {r['id']} | {r['username']} | role={r.get('role')} | full_name={r.get('full_name') or '-'} | password_present={has} | password_hashed={looks_hashed} | pwd_len={(len(str(pwd)) if pwd else 0)}")
except Exception as e:
    print('ERROR', e)
finally:
    try:
        conn.close()
    except Exception:
        pass
