import os
import mysql.connector

DB_CONFIG = {
    'host': 'mysql-3ca7d4a2-romitmeher-d46c.g.aivencloud.com',
    'port': 17231,
    'user': 'avnadmin',
    'password': os.environ.get('DB_PASSWORD'),
    'database': 'land_deals_db',
    'ssl_ca': os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ca-certificate.pem')
}

print('Connecting to DB...')
conn = None
try:
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    check_sql = ("SELECT COUNT(*) FROM information_schema.TABLES "
                 "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s")
    cursor.execute(check_sql, (DB_CONFIG['database'], 'payment_parties'))
    cnt = cursor.fetchone()[0]
    if cnt and int(cnt) > 0:
        print('Table payment_parties already exists — nothing to do.')
    else:
        print('payment_parties missing — creating table...')
        create_sql = (
            "CREATE TABLE `payment_parties` ("
            "`id` INT AUTO_INCREMENT PRIMARY KEY,"
            "`payment_id` INT NOT NULL,"
            "`party_type` VARCHAR(64) NOT NULL,"
            "`party_id` INT NULL,"
            "`amount` DECIMAL(15,2) NULL,"
            "`percentage` DECIMAL(5,2) NULL,"
            "INDEX (`payment_id`)"
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"
        )
        cursor.execute(create_sql)
        conn.commit()
        print('Table payment_parties created.')
except Exception as e:
    print('Migration failed:', e)
finally:
    if conn:
        conn.close()
