import sys
import os
sys.path.append('land-deals-backend')

# Import the database connection function from app.py
import mysql.connector
from mysql.connector import Error

def get_db_connection():
    """Use the same DB config as the Flask app"""
    DB_CONFIG = {
        'host': 'mysql-3ca7d4a2-romitmeher-d46c.g.aivencloud.com',
        'port': 17231,
        'user': 'avnadmin',
        'password': os.environ.get('DB_PASSWORD', 'AVNS_8Fh3UJnyOZ4ovqMKdaJ'),
        'database': 'land_deals_db',
        'ssl_ca': 'land-deals-backend/ca-certificate.pem',
        'ssl_verify_cert': True,
        'ssl_verify_identity': True
    }
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        print(f"Database connection error: {e}")
        return None

def add_payment_target_fields():
    """Add pay_to fields to payment_parties table"""
    
    connection = get_db_connection()
    if not connection:
        print("❌ Could not connect to database")
        return False
    
    try:
        cursor = connection.cursor()
        
        # First check current schema
        print("Checking current payment_parties schema...")
        cursor.execute("DESCRIBE payment_parties")
        current_columns = cursor.fetchall()
        
        existing_column_names = [col[0] for col in current_columns]
        print(f"Current columns: {existing_column_names}")
        
        # Check if pay_to fields already exist
        pay_to_fields = ['pay_to_id', 'pay_to_name', 'pay_to_type']
        missing_fields = [field for field in pay_to_fields if field not in existing_column_names]
        
        if not missing_fields:
            print("✅ All pay_to fields already exist!")
            return True
            
        print(f"Adding missing fields: {missing_fields}")
        
        # Add the fields one by one to handle potential errors gracefully
        if 'pay_to_id' in missing_fields:
            print("Adding pay_to_id column...")
            cursor.execute("ALTER TABLE payment_parties ADD COLUMN pay_to_id INT NULL AFTER role")
            print("✅ pay_to_id added")
            
        if 'pay_to_name' in missing_fields:
            print("Adding pay_to_name column...")
            cursor.execute("ALTER TABLE payment_parties ADD COLUMN pay_to_name VARCHAR(100) NULL AFTER pay_to_id")
            print("✅ pay_to_name added")
            
        if 'pay_to_type' in missing_fields:
            print("Adding pay_to_type column...")
            cursor.execute("ALTER TABLE payment_parties ADD COLUMN pay_to_type ENUM('owner', 'buyer', 'investor', 'other') NULL AFTER pay_to_name")
            print("✅ pay_to_type added")
        
        # Add index for performance
        try:
            cursor.execute("CREATE INDEX idx_pay_to_id ON payment_parties(pay_to_id)")
            print("✅ Index idx_pay_to_id added")
        except Error as e:
            if "Duplicate key name" in str(e):
                print("ℹ️ Index idx_pay_to_id already exists")
            else:
                print(f"⚠️ Could not add index: {e}")
        
        connection.commit()
        print("✅ Database schema updated successfully!")
        
        # Verify the changes
        cursor.execute("DESCRIBE payment_parties")
        updated_columns = cursor.fetchall()
        print("\nUpdated schema:")
        for col in updated_columns:
            print(f"  {col[0]} - {col[1]}")
            
        return True
        
    except Error as e:
        print(f"❌ Database error: {e}")
        connection.rollback()
        return False
    except Exception as e:
        print(f"❌ General error: {e}")
        return False
    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()
            print("Database connection closed.")

if __name__ == "__main__":
    success = add_payment_target_fields()
    if success:
        print("\n🎉 Ready to test the new payment creation system!")
    else:
        print("\n❌ Database update failed. Please check the errors above.")
