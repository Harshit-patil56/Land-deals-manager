"""
Query recent payments for a deal and list associated proofs.
Usage:
  python scripts/check_payment_deal.py --deal 50
"""
import os
import sys
import argparse
import mysql.connector

p = argparse.ArgumentParser()
p.add_argument('--deal', type=int, required=True)
args = p.parse_args()

cfg = dict(
    host=os.environ.get('DB_HOST','mysql-3ca7d4a2-romitmeher-d46c.g.aivencloud.com'),
    port=int(os.environ.get('DB_PORT',17231)),
    user=os.environ.get('DB_USER','avnadmin'),
    password=os.environ.get('DB_PASS',os.environ.get('DB_PASSWORD','')),
    database=os.environ.get('DB_NAME','land_deals_db')
)

try:
    conn = mysql.connector.connect(**cfg)
except Exception as e:
    print('DB connect failed:', e)
    sys.exit(2)

cur = conn.cursor(dictionary=True)
cur.execute('SELECT * FROM payments WHERE deal_id=%s ORDER BY id DESC LIMIT 10', (args.deal,))
rows = cur.fetchall()
if not rows:
    print('No payments found for deal', args.deal)
else:
    print(f"Payments for deal {args.deal} (most recent first):")
    for r in rows:
        print('---')
        for k,v in r.items():
            print(f"{k}: {v}")
        pid = r.get('id')
        # fetch proofs
        cur2 = conn.cursor(dictionary=True)
        cur2.execute('SELECT id, file_path, file_name, doc_type, uploaded_by, uploaded_at FROM payment_proofs WHERE payment_id=%s', (pid,))
        proofs = cur2.fetchall()
        if proofs:
            print('Proofs:')
            for p in proofs:
                print('  -', p)
        else:
            print('Proofs: none')
        cur2.close()

cur.close()
conn.close()
