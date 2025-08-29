#!/usr/bin/env python3
"""
Migration script to add role column to users table
This fixes the MySQL error: Data truncated for column 'role' at row 1
"""

import mysql.connector
import os
import bcrypt

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

def add_role_column():
    """Add role column to users table"""
    try:
        print("Connecting to the database...")
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        print("Connection successful!")
        
        # Check if role column exists
        cursor.execute("""
            SELECT COUNT(*) 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'land_deals_db' 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'role'
        """)
        
        role_exists = cursor.fetchone()[0] > 0
        
        if role_exists:
            print("Role column already exists.")
        else:
            print("Adding role column to users table...")
            cursor.execute("""
                ALTER TABLE users 
                ADD COLUMN role ENUM('admin', 'auditor', 'user') DEFAULT 'user'
            """)
            print("Role column added successfully!")
        
        # Check if full_name column exists
        cursor.execute("""
            SELECT COUNT(*) 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'land_deals_db' 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'full_name'
        """)
        
        full_name_exists = cursor.fetchone()[0] > 0
        
        if full_name_exists:
            print("Full_name column already exists.")
        else:
            print("Adding full_name column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN full_name VARCHAR(100)")
            print("Full_name column added successfully!")
        
        # Update existing users to have 'user' role if NULL
        print("Updating existing users with default role...")
        cursor.execute("UPDATE users SET role = 'user' WHERE role IS NULL")
        
        # Check if admin user exists
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'")
        admin_exists = cursor.fetchone()[0] > 0
        
        if not admin_exists:
            print("Creating default admin user...")
            # Create a default admin user
            admin_password = "admin123"  # Change this!
            hashed_password = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            cursor.execute("""
                INSERT INTO users (username, password, role, full_name) 
                VALUES (%s, %s, %s, %s)
            """, ('admin', hashed_password, 'admin', 'System Administrator'))
            
            print(f"Admin user created with username: 'admin' and password: '{admin_password}'")
            print("⚠️  IMPORTANT: Change the admin password after first login!")
        else:
            print("Admin user already exists.")
        
        connection.commit()
        print("\n✅ Migration completed successfully!")
        
        # Show current users
        cursor.execute("SELECT id, username, role, full_name FROM users")
        users = cursor.fetchall()
        print("\nCurrent users:")
        for user in users:
            print(f"  ID: {user[0]}, Username: {user[1]}, Role: {user[2]}, Name: {user[3] or 'Not set'}")
        
    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()
            print("\nDatabase connection closed.")
    
    return True

if __name__ == "__main__":
    print("🔧 Running database migration to add role column...")
    print("=" * 50)
    
    success = add_role_column()
    
    if success:
        print("\n🎉 Migration completed successfully!")
        print("You can now use the role-based permission system.")
    else:
        print("\n❌ Migration failed. Please check the error messages above.")
