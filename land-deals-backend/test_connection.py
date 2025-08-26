#!/usr/bin/env python3
"""
Simple database connection test
"""

import mysql.connector
import os

# Database configuration
# It's recommended to use environment variables for sensitive data
DB_CONFIG = {
    'host': 'mysql-3ca7d4a2-romitmeher-d46c.g.aivencloud.com',
    'port': 17231,
    'user': 'avnadmin',
    'password': os.environ.get('DB_PASSWORD', 'YOUR_PASSWORD'),
    'database': 'defaultdb',
    'ssl_ca': os.path.join(os.path.dirname(__file__), 'ca-certificate.pem'),
    'ssl_verify_cert': True,
    'ssl_verify_identity': True
}

def test_connection():
    try:
        print("Testing connection to cloud MySQL database...")
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        print("✓ Connection successful!")
        
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()
        print(f"✓ MySQL version: {version[0]}")
        
        cursor.execute("SELECT DATABASE()")
        database = cursor.fetchone()
        print(f"✓ Current database: {database[0]}")
        
        # Check if land_deals_db table exists
        cursor.execute("SHOW TABLES LIKE 'land_deals_db'")
        result = cursor.fetchone()
        if result:
            print("✓ Found 'land_deals_db' table")
            cursor.execute("DESCRIBE land_deals_db")
            columns = cursor.fetchall()
            print("Table structure:")
            for column in columns:
                print(f"  - {column[0]} ({column[1]})")
        else:
            print("⚠ 'land_deals_db' table not found")
            print("Available tables:")
            cursor.execute("SHOW TABLES")
            tables = cursor.fetchall()
            for table in tables:
                print(f"  - {table[0]}")
        
        return True
        
    except mysql.connector.Error as err:
        print(f"✗ Connection failed: {err}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()
            print("✓ Connection closed")

if __name__ == "__main__":
    test_connection()
