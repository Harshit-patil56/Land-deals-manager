"""
Backfill payment_parties.role using simple heuristics.
- If party.role is already present, skip.
- Heuristics (conservative):
  * If payment.party_type == 'owner' and there is at least one investor party: mark investor(s) as payer, owner(s) as payee.
  * If payment.party_type == 'investor' and there is at least one owner party: mark investor(s) as payer, owner(s) as payee.
  * If only owners present and amount < 50000, mark owner as payee and role='payee' (document/fee scenario) — conservative.
  * Otherwise, leave NULL.
Usage: set DB env vars or rely on .env; then run with python scripts/backfill_roles.py
"""
import os
import sys
import mysql.connector

DB = {
    'host': os.environ.get('DB_HOST', 'mysql-3ca7d4a2-romitmeher-d46c.g.aivencloud.com'),
    'port': int(os.environ.get('DB_PORT', 17231)),
    'user': os.environ.get('DB_USER', 'avnadmin'),
    'password': os.environ.get('DB_PASS', os.environ.get('DB_PASSWORD', '')),
    'database': os.environ.get('DB_NAME', os.environ.get('DB_NAME', 'land_deals_db'))
}


def connect():
    try:
        return mysql.connector.connect(host=DB['host'], port=DB['port'], user=DB['user'], password=DB['password'], database=DB['database'])
    except Exception as e:
        print('Failed to connect to DB:', e)
        sys.exit(2)


def run_backfill():
    conn = connect()
    cur = conn.cursor(dictionary=True)
    try:
        # Find payments that have at least one payment_parties row with NULL role
        cur.execute("SELECT DISTINCT p.id, p.deal_id, p.party_type, p.amount FROM payments p JOIN payment_parties pp ON pp.payment_id = p.id WHERE pp.role IS NULL")
        payments = cur.fetchall() or []
        print(f'Found {len(payments)} payments with parties missing role')
        updated = 0
        for p in payments:
            pid = p['id']
            # load parties for this payment
            cur.execute("SELECT id, party_type, party_id, amount, percentage, role FROM payment_parties WHERE payment_id = %s", (pid,))
            parts = cur.fetchall() or []
            if not parts:
                continue
            # compute sets
            has_owner = any(pp['party_type'] == 'owner' for pp in parts)
            has_investor = any(pp['party_type'] == 'investor' for pp in parts)
            # conservative backfill decisions
            to_update = []
            if (p['party_type'] == 'owner' or p['party_type'] == 'investor') and has_owner and has_investor:
                # investors paid to owners (common when money is invested or sale)
                for pp in parts:
                    if pp['role'] is not None:
                        continue
                    if pp['party_type'] == 'investor':
                        to_update.append((pp['id'], 'payer'))
                    elif pp['party_type'] == 'owner':
                        to_update.append((pp['id'], 'payee'))
            else:
                # only owners present and small amount -> treat as payee (doc costs)
                if has_owner and not has_investor and float(p.get('amount') or 0) < 50000:
                    for pp in parts:
                        if pp['role'] is None and pp['party_type'] == 'owner':
                            to_update.append((pp['id'], 'payee'))
            # apply updates
            for party_id, role in to_update:
                try:
                    cur.execute("UPDATE payment_parties SET role = %s WHERE id = %s", (role, party_id))
                    updated += 1
                except Exception as e:
                    print('Failed to update party', party_id, e)
        conn.commit()
        print(f'Backfill applied to {updated} party rows')
    finally:
        cur.close()
        conn.close()


if __name__ == '__main__':
    run_backfill()
