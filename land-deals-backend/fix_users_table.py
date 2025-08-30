#!/usr/bin/env python3
"""
Simple database connection test and role column checker
"""

import mysql.connector
import os

def test_and_fix_users_table():
    """Test connection and check/fix users table structure"""
    
    # Try different password configurations
    possible_passwords = [
        'YOUR_DB_PASSWORD_HERE',      # Default from app.py
        os.environ.get('DB_PASSWORD', '')  # Environment variable
    ]
    
    DB_CONFIG_BASE = {
        'host': 'mysql-3ca7d4a2-romitmeher-d46c.g.aivencloud.com',
        'port': 17231,
        'user': 'avnadmin',
        'database': 'land_deals_db',
    }
    
    # Try to add SSL config if certificate exists
    ssl_ca_path = os.path.join(os.path.dirname(__file__), 'ca-certificate.pem')
    if os.path.exists(ssl_ca_path):
        DB_CONFIG_BASE.update({
            'ssl_ca': ssl_ca_path,
            'ssl_verify_cert': True,
            'ssl_verify_identity': True
        })
    
    connection = None
    
    for password in possible_passwords:
        if not password:
            continue
            
        try:
            config = DB_CONFIG_BASE.copy()
            config['password'] = password
            
            print(f"Trying to connect with password: {password[:5]}...")
            connection = mysql.connector.connect(**config)
            cursor = connection.cursor()
            
            print("✅ Connection successful!")
            
            # Check current table structure
            print("\n📋 Checking users table structure...")
            cursor.execute("DESCRIBE users")
            columns = cursor.fetchall()
            
            print("Current users table columns:")
            has_role = False
            has_full_name = False
            
            for column in columns:
                print(f"  - {column[0]}: {column[1]}")
                if column[0] == 'role':
                    has_role = True
                if column[0] == 'full_name':
                    has_full_name = True
            
            # Check if we need to add columns
            if not has_role:
                print("\n🔧 Adding role column...")
                cursor.execute("""
                    ALTER TABLE users 
                    ADD COLUMN role ENUM('admin', 'auditor', 'user') DEFAULT 'user'
                """)
                print("✅ Role column added successfully!")
            else:
                print("\n✅ Role column already exists!")
            
            if not has_full_name:
                print("\n🔧 Adding full_name column...")
                cursor.execute("ALTER TABLE users ADD COLUMN full_name VARCHAR(100)")
                print("✅ Full_name column added successfully!")
            else:
                print("\n✅ Full_name column already exists!")
            
            # Update any NULL roles
            cursor.execute("UPDATE users SET role = 'user' WHERE role IS NULL OR role = ''")
            rows_updated = cursor.rowcount
            if rows_updated > 0:
                print(f"✅ Updated {rows_updated} users with default 'user' role")
            
            connection.commit()
            
            # Show current users
            print("\n👥 Current users in database:")
            cursor.execute("SELECT id, username, role, full_name FROM users ORDER BY id")
            users = cursor.fetchall()
            
            if users:
                for user in users:
                    print(f"  ID: {user[0]}, Username: {user[1]}, Role: {user[2] or 'NULL'}, Name: {user[3] or 'Not set'}")
            else:
                print("  No users found in database")
            
            print("\n🎉 Database structure updated successfully!")
            print("The MySQL error 1265 should now be fixed.")
            
            return True
            
        except mysql.connector.Error as err:
            print(f"❌ Connection failed: {err}")
            continue
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            continue
        finally:
            if connection and connection.is_connected():
                cursor.close()
                connection.close()
    
    print("\n❌ Could not connect to database with any of the attempted passwords.")
    print("Please check your database credentials.")
    return False

if __name__ == "__main__":
    print("🔍 Testing database connection and fixing users table structure...")
    print("=" * 60)
    
    success = test_and_fix_users_table()
    
    if not success:
        print("\n💡 Troubleshooting tips:")
        print("1. Make sure the database password is correct")
        print("2. Check if the database server is accessible")
        print("3. Verify SSL certificate if required")
        print("4. Set DB_PASSWORD environment variable if needed")
