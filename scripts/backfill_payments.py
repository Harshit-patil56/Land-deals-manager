"""
Backfill `payment_proofs.file_name` from `file_path` and populate `payments.category` where NULL.

Heuristics for category:
 - If payment has proofs and any proof filename or doc_type contains 'bank' or 'receipt' -> docs
 - If notes/reference contain doc-related keywords -> docs
 - If any payment_parties has party_type owner -> buy
 - If any payment_parties has party_type investor -> sell
 - Else leave as 'other'

This script is idempotent for already-set columns.
"""
import os
import mysql.connector
from urllib.parse import urlparse

cfg = dict(
    host=os.environ.get('DB_HOST','mysql-3ca7d4a2-romitmeher-d46c.g.aivencloud.com'),
    port=int(os.environ.get('DB_PORT',17231)),
    user=os.environ.get('DB_USER','avnadmin'),
    password=os.environ.get('DB_PASS',os.environ.get('DB_PASSWORD','')),
    database=os.environ.get('DB_NAME','land_deals_db')
)

conn = mysql.connector.connect(**cfg)
cur = conn.cursor(dictionary=True)

# 1) populate file_name where NULL by using basename of file_path
cur.execute("SELECT id, file_path FROM payment_proofs WHERE file_name IS NULL OR file_name = ''")
rows = cur.fetchall()
print('Found', len(rows), 'proofs missing file_name')
for r in rows:
    fid = r['id']
    fp = r['file_path'] or ''
    bn = os.path.basename(fp)
    if bn:
        cur2 = conn.cursor()
        cur2.execute("UPDATE payment_proofs SET file_name=%s WHERE id=%s", (bn, fid))
        cur2.close()
        print('Updated proof', fid, 'file_name=', bn)
conn.commit()

# 2) backfill payments.category where NULL
cur.execute("SELECT id, notes, reference, payment_mode FROM payments WHERE category IS NULL")
payments = cur.fetchall()
print('Found', len(payments), 'payments missing category')
for p in payments:
    pid = p['id']
    notes = (p.get('notes') or '') + ' ' + (p.get('reference') or '') + ' ' + (p.get('payment_mode') or '')
    text = notes.lower()
    cat = None
    # check proofs
    cur2 = conn.cursor(dictionary=True)
    cur2.execute('SELECT file_name, doc_type, file_path FROM payment_proofs WHERE payment_id=%s', (pid,))
    proofs = cur2.fetchall()
    if proofs:
        for pr in proofs:
            fname = (pr.get('file_name') or '')
            doc = (pr.get('doc_type') or '')
            if any(k in (fname+doc).lower() for k in ['bank','receipt','bill','invoice','transfer','cheque']):
                cat = 'docs'
                break
    cur2.close()
    if not cat:
        if any(k in text for k in ['doc','document','stamp','registration','fees','charges','receipt']):
            cat = 'docs'
    if not cat:
        # party splits
        cur3 = conn.cursor(dictionary=True)
        cur3.execute('SELECT party_type FROM payment_parties WHERE payment_id=%s', (pid,))
        parts = cur3.fetchall()
        if parts:
            if any(pp.get('party_type') == 'owner' for pp in parts):
                cat = 'buy'
            elif any(pp.get('party_type') == 'investor' for pp in parts):
                cat = 'sell'
        cur3.close()
    if not cat:
        # no good heuristic, mark other
        cat = 'other'
    # update
    cur4 = conn.cursor()
    cur4.execute('UPDATE payments SET category=%s WHERE id=%s', (cat, pid))
    cur4.close()
    print('Payment', pid, 'set category ->', cat)

conn.commit()
cur.close()
conn.close()
print('Backfill complete')
