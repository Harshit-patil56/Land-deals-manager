#!/usr/bin/env python3
"""Test if investors table exists and check its structure"""

import mysql.connector
import os
from pprint import pprint

# Database configuration (same as in app.py)
DB_CONFIG = {
    'host': 'mysql-3ca7d4a2-romitmeher-d46c.g.aivencloud.com',
    'port': 17231,
    'user': 'avnadmin',
    'password': os.environ.get('DB_PASSWORD', 'YOUR_DB_PASSWORD_HERE'),
    'database': 'land_deals_db',
    'ssl_ca': os.path.join(os.path.dirname(__file__), 'ca-certificate.pem'),
    'ssl_verify_cert': True,
    'ssl_verify_identity': True
}

def test_investors_table():
    """Test investors table existence and structure"""
    try:
        print("Connecting to database...")
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor(dictionary=True)
        
        # Check if investors table exists
        print("\n1. Checking if investors table exists...")
        cursor.execute("SHOW TABLES LIKE 'investors'")
        table_exists = cursor.fetchone()
        
        if table_exists:
            print("✅ Investors table exists")
            
            # Check table structure
            print("\n2. Checking table structure...")
            cursor.execute("DESCRIBE investors")
            columns = cursor.fetchall()
            print("Table structure:")
            for col in columns:
                print(f"  - {col['Field']}: {col['Type']} {'(NULL)' if col['Null'] == 'YES' else '(NOT NULL)'}")
            
            # Check if there's any data
            print("\n3. Checking for data...")
            cursor.execute("SELECT COUNT(*) as count FROM investors")
            count = cursor.fetchone()['count']
            print(f"Number of records: {count}")
            
            if count > 0:
                print("\n4. Sample data:")
                cursor.execute("SELECT * FROM investors LIMIT 3")
                sample_data = cursor.fetchall()
                for record in sample_data:
                    print(f"  - ID: {record['id']}, Name: {record['investor_name']}, Deal ID: {record['deal_id']}")
                    
        else:
            print("❌ Investors table does not exist")
            print("\n2. Available tables:")
            cursor.execute("SHOW TABLES")
            tables = cursor.fetchall()
            for table in tables:
                print(f"  - {table[list(table.keys())[0]]}")
                
            # Create the table
            print("\n3. Creating investors table...")
            create_table_sql = """
            CREATE TABLE IF NOT EXISTS investors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                deal_id INT NOT NULL,
                investor_name VARCHAR(100) NOT NULL,
                investment_amount DECIMAL(15,2),
                investment_percentage DECIMAL(5,2),
                mobile VARCHAR(15),
                email VARCHAR(100),
                aadhar_card VARCHAR(14),
                pan_card VARCHAR(10),
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
            )
            """
            cursor.execute(create_table_sql)
            connection.commit()
            print("✅ Investors table created successfully")
            
    except mysql.connector.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        if connection:
            connection.close()
    
    return True

if __name__ == "__main__":
    test_investors_table()
