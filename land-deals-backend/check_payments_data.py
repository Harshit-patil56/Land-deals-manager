#!/usr/bin/env python3
"""
Script to check payment_parties data and role information
"""
import mysql.connector
import os
import sys

# Database configuration with correct password
DB_CONFIG = {
    'host': 'mysql-3ca7d4a2-romitmeher-d46c.g.aivencloud.com',
    'port': 17231,
    'user': 'avnadmin',
    'password': 'AVNS_1crzK1k3O2GYxeljOl2',
    'database': 'land_deals_db',
    'ssl_ca': os.path.join(os.path.dirname(__file__), 'ca-certificate.pem'),
    'ssl_verify_cert': True,
    'ssl_verify_identity': True
}

def main():
    """Main function to check payments data"""
    conn = None
    try:
        print("Connecting to database...")
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print('=== Checking payment_parties table structure ===')
        cursor.execute('DESCRIBE payment_parties')
        columns = cursor.fetchall()
        for row in columns:
            print(f"Column: {row[0]}, Type: {row[1]}, Null: {row[2]}, Key: {row[3]}, Default: {row[4]}")
        
        print('\n=== Checking existing payment_parties data ===')
        cursor.execute('SELECT id, payment_id, party_type, role FROM payment_parties ORDER BY id LIMIT 10')
        parties_data = cursor.fetchall()
        print(f"Found {len(parties_data)} payment party records:")
        for row in parties_data:
            print(f'  ID: {row[0]}, Payment: {row[1]}, Type: {row[2]}, Role: {row[3]}')
        
        print('\n=== Checking payments for deal 50 ===')
        cursor.execute('SELECT id, amount, payment_date FROM payments WHERE deal_id = 50 ORDER BY payment_date DESC LIMIT 5')
        payments_data = cursor.fetchall()
        print(f"Found {len(payments_data)} payments for deal 50:")
        for row in payments_data:
            print(f'  Payment ID: {row[0]}, Amount: {row[1]}, Date: {row[2]}')
            
            # Get parties for this payment
            cursor.execute('SELECT party_type, role, amount FROM payment_parties WHERE payment_id = %s', (row[0],))
            parties = cursor.fetchall()
            for party in parties:
                print(f'    Party: {party[0]}, Role: {party[1]}, Amount: {party[2]}')
        
        print('\n=== Checking for NULL roles ===')
        cursor.execute('SELECT COUNT(*) FROM payment_parties WHERE role IS NULL')
        null_roles = cursor.fetchone()[0]
        print(f"Payment parties with NULL role: {null_roles}")
        
        print('\n=== Checking role distribution ===')
        cursor.execute('SELECT role, COUNT(*) FROM payment_parties GROUP BY role')
        role_counts = cursor.fetchall()
        for role, count in role_counts:
            print(f"  Role '{role}': {count} records")
            
        print('\n=== Connection successful! ===')
        
    except mysql.connector.Error as e:
        print(f"Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        if conn:
            cursor.close()
            conn.close()
            print("Database connection closed.")

if __name__ == '__main__':
    main()
