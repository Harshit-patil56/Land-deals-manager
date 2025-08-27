#!/usr/bin/env python3
"""
Simple migration runner for update_schema.sql
"""

import mysql.connector
import os

# Load environment variables
def load_env_file():
    """Load environment variables from .env file"""
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()

load_env_file()

# Database configuration
DB_CONFIG = {
    'host': 'mysql-3ca7d4a2-romitmeher-d46c.g.aivencloud.com',
    'port': 17231,
    'user': 'avnadmin',
    'password': os.environ.get('DB_PASSWORD', 'YOUR_PASSWORD'),
    'database': 'land_deals_db',
    'ssl_ca': os.path.join(os.path.dirname(__file__), 'ca-certificate.pem'),
    'ssl_verify_cert': True,
    'ssl_verify_identity': True
}

def run_migration():
    """Run the update_schema.sql migration"""
    try:
        print("Connecting to the database...")
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        print("Connection successful!")
        
        # Read and execute the schema file
        schema_file = os.path.join(os.path.dirname(__file__), 'update_schema.sql')
        with open(schema_file, 'r', encoding='utf-8') as file:
            schema_sql = file.read()
        
        # Split the SQL file into individual statements
        statements = [stmt.strip() for stmt in schema_sql.split(';') if stmt.strip()]
        
        print("Running migration...")
        for statement in statements:
            if statement:
                try:
                    cursor.execute(statement)
                    print(f"✓ Executed: {statement[:100]}...")
                except mysql.connector.Error as err:
                    if 'already exists' in str(err) or 'Duplicate' in str(err):
                        print(f"ℹ Skipped (already exists): {statement[:50]}...")
                    else:
                        print(f"⚠ Warning: {err}")
                    continue
        
        connection.commit()
        print("Migration completed successfully!")
        
    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()
            print("Database connection closed.")
    
    return True

if __name__ == "__main__":
    print("=== Running Database Migration ===")
    success = run_migration()
    if success:
        print("✅ Migration completed successfully!")
    else:
        print("❌ Migration failed!")
