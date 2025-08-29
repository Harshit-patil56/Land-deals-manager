#!/usr/bin/env python3
"""
Script to backfill missing role data for payment_parties
"""
import mysql.connector
import os
import sys

# Database configuration
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
    """Main function to backfill missing roles"""
    conn = None
    try:
        print("Connecting to database...")
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print('=== Finding payment_parties with NULL roles ===')
        cursor.execute('SELECT id, payment_id, party_type FROM payment_parties WHERE role IS NULL')
        null_role_parties = cursor.fetchall()
        
        print(f"Found {len(null_role_parties)} payment parties with NULL roles:")
        
        for party_id, payment_id, party_type in null_role_parties:
            print(f"  Party ID: {party_id}, Payment: {payment_id}, Type: {party_type}")
            
            # Assign roles based on party type heuristics:
            # - buyers are typically payers (paying for land)
            # - owners are typically payees (receiving payment for land)
            # - investors could be either, default to payer
            if party_type == 'buyer':
                new_role = 'payer'
            elif party_type == 'owner':
                new_role = 'payee'
            elif party_type == 'investor':
                new_role = 'payer'
            else:
                new_role = 'payer'  # default for unknown types
                
            print(f"    Assigning role: {new_role}")
            
            # Update the role
            update_cursor = conn.cursor()
            update_cursor.execute(
                'UPDATE payment_parties SET role = %s WHERE id = %s',
                (new_role, party_id)
            )
            print(f"    Updated party {party_id} with role '{new_role}'")
            update_cursor.close()
        
        # Commit the changes
        conn.commit()
        print(f'\n=== Successfully updated {len(null_role_parties)} payment parties ===')
        
        # Verify the changes
        print('\n=== Verification: Checking updated role distribution ===')
        cursor.execute('SELECT role, COUNT(*) FROM payment_parties GROUP BY role')
        role_counts = cursor.fetchall()
        for role, count in role_counts:
            print(f"  Role '{role}': {count} records")
            
        print('\n=== Verification: Checking for remaining NULL roles ===')
        cursor.execute('SELECT COUNT(*) FROM payment_parties WHERE role IS NULL')
        remaining_nulls = cursor.fetchone()[0]
        print(f"Remaining NULL roles: {remaining_nulls}")
        
        if remaining_nulls == 0:
            print("✅ All payment parties now have roles assigned!")
        else:
            print(f"⚠️  {remaining_nulls} payment parties still have NULL roles")
            
    except mysql.connector.Error as e:
        print(f"Database error: {e}")
        if conn:
            conn.rollback()
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        if conn:
            conn.rollback()
        sys.exit(1)
    finally:
        if conn:
            cursor.close()
            conn.close()
            print("Database connection closed.")

if __name__ == '__main__':
    main()
