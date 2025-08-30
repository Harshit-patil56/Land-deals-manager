import mysql.connector
cfg = dict(host='mysql-3ca7d4a2-romitmeher-d46c.g.aivencloud.com', port=17231, user='avnadmin', password='AVNS_1crzK1k3O2GYxeljOl2', database='land_deals_db')
conn = mysql.connector.connect(**cfg)
cur = conn.cursor()
cur.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=%s AND TABLE_NAME=%s", (cfg['database'], 'payments'))
cols = [r[0] for r in cur.fetchall()]
print('payments columns:', cols)
cur.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=%s AND TABLE_NAME=%s", (cfg['database'], 'payment_proofs'))
cols2 = [r[0] for r in cur.fetchall()]
print('payment_proofs columns:', cols2)
conn.close()
