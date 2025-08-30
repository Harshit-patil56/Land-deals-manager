#!/usr/bin/env python3
"""
Debug script to check participants available for deal 50
"""
import mysql.connector
import os

# Database configuration
DB_CONFIG = {
    'host': 'mysql-3ca7d4a2-romitmeher-d46c.g.aivencloud.com',
    'port': 17231,
    'user': 'avnadmin',
    'password': 'AVNS_1crzK1k3O2GYxeljOl2',
    'database': 'land_deals_db',
    'ssl_ca': os.path.join(os.getcwd(), 'ca-certificate.pem'),
    'ssl_verify_cert': True,
    'ssl_verify_identity': True
}

def main():
    """Check participants for deal 50"""
    conn = None
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print('=== Checking deal 50 participants ===')
        
        print('\n--- Owners ---')
        cursor.execute('SELECT id, name FROM owners WHERE deal_id = 50')
        owners = cursor.fetchall()
        print(f'Found {len(owners)} owners:')
        for owner_id, name in owners:
            print(f'  ID: {owner_id}, Name: {name}')
            
        print('\n--- Investors ---')
        cursor.execute('SELECT id, investor_name FROM investors WHERE deal_id = 50')
        investors = cursor.fetchall()
        print(f'Found {len(investors)} investors:')
        for investor_id, name in investors:
            print(f'  ID: {investor_id}, Name: {name}')
            
        print('\n--- Buyers ---')
        cursor.execute('SELECT id, name FROM buyers WHERE deal_id = 50')
        buyers = cursor.fetchall()
        print(f'Found {len(buyers)} buyers:')
        for buyer_id, name in buyers:
            print(f'  ID: {buyer_id}, Name: {name}')
            
        total_participants = len(owners) + len(investors) + len(buyers)
        print(f'\n=== Total participants available: {total_participants} ===')
        
        if total_participants == 0:
            print('⚠️  No participants found! This might be why the dropdown is empty.')
            print('You may need to add owners, investors, or buyers to this deal first.')
        else:
            print('✅ Participants are available. The issue might be in the frontend.')
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn:
            cursor.close()
            conn.close()

if __name__ == '__main__':
    main()
