#!/usr/bin/env python3
"""
Script to add payment_type column to payments table
"""
import mysql.connector
import os
import sys

# Add the backend directory to the path to import the database config
sys.path.append(os.path.join(os.path.dirname(__file__), 'land-deals-backend'))

# Database configuration (same as app.py)
DB_CONFIG = {
    'host': 'mysql-3ca7d4a2-romitmeher-d46c.g.aivencloud.com',
    'port': 17231,
    'user': 'avnadmin',
    'password': os.environ.get('DB_PASSWORD', 'YOUR_DB_PASSWORD_HERE'),
    'database': 'land_deals_db',
    'ssl_ca': os.path.join(os.path.dirname(__file__), 'land-deals-backend', 'ca-certificate.pem'),
    'ssl_verify_cert': True,
    'ssl_verify_identity': True
}

def add_payment_type_column():
    """Add payment_type column to payments table"""
    
    sql_add_column = """
    ALTER TABLE payments 
    ADD COLUMN payment_type ENUM('land_purchase', 'investment_sale', 'documentation_legal', 'other') DEFAULT 'other'
    AFTER amount
    """
    
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("🔄 Adding payment_type column to payments table...")
        
        # Try to add the column
        cursor.execute(sql_add_column)
        conn.commit()
        
        print("✅ Successfully added payment_type column to payments table")
        
        # Update existing payments to have a default payment type based on amount or other criteria
        update_sql = """
        UPDATE payments 
        SET payment_type = CASE 
            WHEN amount >= 1000000 THEN 'land_purchase'
            WHEN amount >= 100000 THEN 'investment_sale'
            WHEN amount < 50000 THEN 'documentation_legal'
            ELSE 'other'
        END
        WHERE payment_type = 'other'
        """
        
        cursor.execute(update_sql)
        rows_updated = cursor.rowcount
        conn.commit()
        
        print(f"✅ Updated {rows_updated} existing payment records with payment types")
        
    except mysql.connector.Error as e:
        if 'Duplicate column name' in str(e):
            print('✅ payment_type column already exists')
        else:
            print(f'❌ Database Error: {e}')
            return False
            
    finally:
        if 'conn' in locals():
            conn.close()
    
    return True

if __name__ == "__main__":
    print("🚀 Starting payment_type column addition...")
    
    if add_payment_type_column():
        print("🎉 Database update completed successfully!")
    else:
        print("❌ Database update failed!")
        sys.exit(1)
