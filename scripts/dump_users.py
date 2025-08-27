import importlib.util
spec = importlib.util.spec_from_file_location('app', r'c:/Users/user/Desktop/Land-deals-manager/land-deals-backend/app.py')
app_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app_mod)
DB_CONFIG = app_mod.DB_CONFIG
import mysql.connector
conn = mysql.connector.connect(**DB_CONFIG)
cur = conn.cursor(dictionary=True)
cur.execute('SELECT id, username, role, password, full_name FROM users')
rows = cur.fetchall()
for r in rows:
    print(r)
conn.close()
