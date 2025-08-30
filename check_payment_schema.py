import mysql.connector
from mysql.connector import Error
import os

def check_payment_parties_schema():
    try:
        # Use the same DB config as the app
        DB_CONFIG = {
            'host': 'mysql-3ca7d4a2-romitmeher-d46c.g.aivencloud.com',
            'port': 17231,
            'user': 'avnadmin',
            'password': 'AVNS_8Fh3UJnyOZ4ovqMKdaJ',  # From environment or app
            'database': 'land_deals_db',
            'ssl_ca': 'land-deals-backend/ca-certificate.pem',
            'ssl_verify_cert': True,
            'ssl_verify_identity': True
        }
        
        connection = mysql.connector.connect(**DB_CONFIG)
        
        if connection.is_connected():
            cursor = connection.cursor()
            
            # Check current schema of payment_parties table
            cursor.execute("DESCRIBE payment_parties")
            columns = cursor.fetchall()
            
            print("Current payment_parties table schema:")
            for col in columns:
                print(f"  {col[0]} - {col[1]} - {col[2]} - {col[3]} - {col[4]} - {col[5]}")
            
            # Check if pay_to fields exist
            column_names = [col[0] for col in columns]
            pay_to_fields = ['pay_to_id', 'pay_to_name', 'pay_to_type']
            
            missing_fields = [field for field in pay_to_fields if field not in column_names]
            
            if missing_fields:
                print(f"\n❌ Missing fields: {missing_fields}")
                print("Need to add these fields to support payment target relationships")
            else:
                print("\n✅ All pay_to fields exist in the database")
                
    except Error as e:
        print(f"Database error: {e}")
    except Exception as e:
        print(f"General error: {e}")
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

if __name__ == "__main__":
    check_payment_parties_schema()
