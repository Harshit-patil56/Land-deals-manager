import mysql.connector
cfg=dict(host='mysql-3ca7d4a2-romitmeher-d46c.g.aivencloud.com',port=17231,user='avnadmin',password='AVNS_1crzK1k3O2GYxeljOl2',database='land_deals_db')
conn=mysql.connector.connect(**cfg)
cur=conn.cursor(dictionary=True)
cur.execute('SELECT * FROM payments WHERE deal_id=50 ORDER BY id DESC')
rows=cur.fetchall()
for p in rows:
    cur2=conn.cursor(dictionary=True)
    cur2.execute('SELECT * FROM payment_parties WHERE payment_id=%s',(p['id'],))
    p['parties']=cur2.fetchall()
    cur2.close()

def classify(p):
    if not p: return 'other'
    cat = (p.get('category') or '')
    if cat and isinstance(cat,str):
        c=cat.lower()
        if c in ['buy','sell','docs','other']: return c
    text = ((p.get('notes') or '') + ' ' + (p.get('reference') or '') + ' ' + (p.get('payment_mode') or '')).lower()
    if any(k in text for k in ['doc','document','stamp','registration','fees','charges']):
        return 'docs'
    if p.get('parties') and any(pp.get('party_type')=='owner' for pp in p.get('parties')): return 'buy'
    if p.get('parties') and any(pp.get('party_type')=='investor' for pp in p.get('parties')): return 'sell'
    if p.get('party_type')=='owner': return 'buy'
    if p.get('party_type')=='investor': return 'sell'
    return 'other'

print('Payments classification:')
for p in rows:
    print(p['id'], p.get('amount'), 'category=', p.get('category'), '->', classify(p))

conn.close()
