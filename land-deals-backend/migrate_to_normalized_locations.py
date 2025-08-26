#!/usr/bin/env python3
"""
Professional database migration script to add normalized location tables
Handles duplicates, validates data, and provides detailed logging
"""

import mysql.connector
import os
import sys
from datetime import datetime

def load_env_file():
    """Load environment variables from .env file if it exists (matching app.py behavior)"""
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if os.path.exists(env_path):
        print(f"Loading environment from: {env_path}")
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()
    else:
        print("No .env file found - using system environment variables")

def get_db_connection():
    """Get database connection with SSL (matching app.py configuration)"""
    try:
        connection = mysql.connector.connect(
            host='mysql-3ca7d4a2-romitmeher-d46c.g.aivencloud.com',
            port=17231,
            user='avnadmin',
            password=os.environ.get('DB_PASSWORD'),
            database='land_deals_db',
            ssl_ca=os.path.join(os.path.dirname(__file__), 'ca-certificate.pem'),
            ssl_verify_cert=True,
            ssl_verify_identity=True
        )
        return connection
    except mysql.connector.Error as e:
        print(f"Error connecting to database: {e}")
        return None

def check_table_exists(cursor, table_name):
    """Check if a table exists"""
    try:
        cursor.execute("""
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_schema = 'land_deals_db' AND table_name = %s
        """, (table_name,))
        result = cursor.fetchone()
        return result[0] > 0 if result else False
    except mysql.connector.Error as e:
        print(f"Error checking if table {table_name} exists: {e}")
        return False

def check_column_exists(cursor, table_name, column_name):
    """Check if a column exists in a table"""
    cursor.execute("""
        SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_schema = 'land_deals_db' 
        AND table_name = %s 
        AND column_name = %s
    """, (table_name, column_name))
    return cursor.fetchone()[0] > 0

def check_foreign_key_exists(cursor, constraint_name):
    """Check if a foreign key constraint exists"""
    cursor.execute("""
        SELECT COUNT(*) 
        FROM information_schema.table_constraints 
        WHERE constraint_schema = 'land_deals_db' 
        AND constraint_name = %s 
        AND constraint_type = 'FOREIGN KEY'
    """, (constraint_name,))
    return cursor.fetchone()[0] > 0

def create_states_table(cursor):
    """Create states table if it doesn't exist"""
    if check_table_exists(cursor, 'states'):
        print("✓ States table already exists")
        return True
    
    try:
        cursor.execute("""
            CREATE TABLE states (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✓ Created states table")
        return True
    except mysql.connector.Error as e:
        print(f"✗ Error creating states table: {e}")
        return False

def create_districts_table(cursor):
    """Create districts table if it doesn't exist"""
    if check_table_exists(cursor, 'districts'):
        print("✓ Districts table already exists")
        return True
    
    try:
        cursor.execute("""
            CREATE TABLE districts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                state_id INT NOT NULL,
                name VARCHAR(150) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE CASCADE,
                UNIQUE KEY uk_state_district (state_id, name)
            )
        """)
        print("✓ Created districts table")
        return True
    except mysql.connector.Error as e:
        print(f"✗ Error creating districts table: {e}")
        return False

def add_location_columns_to_deals(cursor):
    """Add location columns to deals table if they don't exist"""
    columns_to_add = [
        ('state', 'VARCHAR(100)'),
        ('district', 'VARCHAR(100)'),
        ('state_id', 'INT'),
        ('district_id', 'INT')
    ]
    
    for column_name, column_type in columns_to_add:
        if check_column_exists(cursor, 'deals', column_name):
            print(f"✓ Column deals.{column_name} already exists")
        else:
            try:
                cursor.execute(f"ALTER TABLE deals ADD COLUMN {column_name} {column_type}")
                print(f"✓ Added column deals.{column_name}")
            except mysql.connector.Error as e:
                print(f"✗ Error adding column deals.{column_name}: {e}")
                return False
    
    return True

def add_foreign_keys_to_deals(cursor):
    """Add foreign key constraints to deals table"""
    foreign_keys = [
        ('fk_deals_state_id', 'state_id', 'states(id)'),
        ('fk_deals_district_id', 'district_id', 'districts(id)')
    ]
    
    for fk_name, column, references in foreign_keys:
        if check_foreign_key_exists(cursor, fk_name):
            print(f"✓ Foreign key {fk_name} already exists")
        else:
            try:
                cursor.execute(f"""
                    ALTER TABLE deals 
                    ADD CONSTRAINT {fk_name} 
                    FOREIGN KEY ({column}) REFERENCES {references} ON DELETE SET NULL
                """)
                print(f"✓ Added foreign key {fk_name}")
            except mysql.connector.Error as e:
                print(f"✗ Error adding foreign key {fk_name}: {e}")
                # Continue with migration even if FK fails (might be duplicate constraint name)

def seed_states(cursor):
    """Seed states table with Indian states (avoiding duplicates)"""
    indian_states = [
        'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 
        'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 
        'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 
        'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 
        'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 
        'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 
        'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 
        'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
    ]
    
    # Check existing states
    cursor.execute("SELECT name FROM states")
    existing_states = {row[0] for row in cursor.fetchall()}
    
    new_states = [state for state in indian_states if state not in existing_states]
    
    if not new_states:
        print("✓ All Indian states already exist in database")
        return True
    
    try:
        cursor.executemany("INSERT INTO states (name) VALUES (%s)", [(state,) for state in new_states])
        print(f"✓ Added {len(new_states)} new states")
        return True
    except mysql.connector.Error as e:
        print(f"✗ Error seeding states: {e}")
        return False

def migrate_existing_location_data(cursor):
    """Migrate existing textual location data to normalized tables"""
    print("\n--- Migrating existing location data ---")
    
    # 1. Get unique states from existing deals that aren't in states table
    cursor.execute("""
        SELECT DISTINCT d.state 
        FROM deals d 
        LEFT JOIN states s ON s.name = d.state 
        WHERE d.state IS NOT NULL 
        AND d.state != '' 
        AND s.id IS NULL
    """)
    missing_states = [row[0] for row in cursor.fetchall()]
    
    if missing_states:
        try:
            cursor.executemany("INSERT IGNORE INTO states (name) VALUES (%s)", [(state,) for state in missing_states])
            print(f"✓ Added {len(missing_states)} missing states from deals data")
        except mysql.connector.Error as e:
            print(f"✗ Error adding missing states: {e}")
            return False
    
    # 2. Get unique state-district combinations and create missing districts
    cursor.execute("""
        SELECT DISTINCT d.state, d.district 
        FROM deals d 
        JOIN states s ON s.name = d.state 
        LEFT JOIN districts dt ON dt.state_id = s.id AND dt.name = d.district 
        WHERE d.district IS NOT NULL 
        AND d.district != '' 
        AND dt.id IS NULL
    """)
    missing_districts = cursor.fetchall()
    
    if missing_districts:
        district_data = []
        for state_name, district_name in missing_districts:
            cursor.execute("SELECT id FROM states WHERE name = %s", (state_name,))
            state_result = cursor.fetchone()
            if state_result:
                district_data.append((state_result[0], district_name))
        
        if district_data:
            try:
                cursor.executemany("INSERT IGNORE INTO districts (state_id, name) VALUES (%s, %s)", district_data)
                print(f"✓ Added {len(district_data)} missing districts from deals data")
            except mysql.connector.Error as e:
                print(f"✗ Error adding missing districts: {e}")
                return False
    
    # 3. Update deals.state_id from textual state names
    cursor.execute("""
        UPDATE deals d 
        JOIN states s ON s.name = d.state 
        SET d.state_id = s.id 
        WHERE d.state IS NOT NULL 
        AND d.state != '' 
        AND d.state_id IS NULL
    """)
    state_updates = cursor.rowcount
    print(f"✓ Updated state_id for {state_updates} deals")
    
    # 4. Update deals.district_id from textual district names
    cursor.execute("""
        UPDATE deals d 
        JOIN states s ON s.name = d.state 
        JOIN districts dt ON dt.state_id = s.id AND dt.name = d.district 
        SET d.district_id = dt.id 
        WHERE d.district IS NOT NULL 
        AND d.district != '' 
        AND d.district_id IS NULL
    """)
    district_updates = cursor.rowcount
    print(f"✓ Updated district_id for {district_updates} deals")
    
    return True

def validate_migration(cursor):
    """Validate the migration results"""
    print("\n--- Validation Results ---")
    
    # Count records
    cursor.execute("SELECT COUNT(*) FROM states")
    states_count = cursor.fetchone()[0]
    print(f"States in database: {states_count}")
    
    cursor.execute("SELECT COUNT(*) FROM districts")
    districts_count = cursor.fetchone()[0]
    print(f"Districts in database: {districts_count}")
    
    cursor.execute("SELECT COUNT(*) FROM deals")
    deals_count = cursor.fetchone()[0]
    print(f"Total deals: {deals_count}")
    
    cursor.execute("SELECT COUNT(*) FROM deals WHERE state_id IS NOT NULL")
    deals_with_state_id = cursor.fetchone()[0]
    print(f"Deals with state_id: {deals_with_state_id}")
    
    cursor.execute("SELECT COUNT(*) FROM deals WHERE district_id IS NOT NULL")
    deals_with_district_id = cursor.fetchone()[0]
    print(f"Deals with district_id: {deals_with_district_id}")
    
    # Check for orphaned data
    cursor.execute("""
        SELECT COUNT(*) FROM deals d 
        WHERE d.state IS NOT NULL AND d.state != '' AND d.state_id IS NULL
    """)
    orphaned_states = cursor.fetchone()[0]
    if orphaned_states > 0:
        print(f"⚠️  Warning: {orphaned_states} deals have state text but no state_id")
    
    cursor.execute("""
        SELECT COUNT(*) FROM deals d 
        WHERE d.district IS NOT NULL AND d.district != '' AND d.district_id IS NULL
    """)
    orphaned_districts = cursor.fetchone()[0]
    if orphaned_districts > 0:
        print(f"⚠️  Warning: {orphaned_districts} deals have district text but no district_id")

def main():
    """Main migration function"""
    print("🚀 Starting professional database migration to normalized locations")
    print("=" * 70)
    print(f"Migration started at: {datetime.now()}")
    
    # Load environment
    load_env_file()
    
    if not os.environ.get('DB_PASSWORD'):
        print("❌ DB_PASSWORD not found in environment or .env file")
        sys.exit(1)
    
    # Connect to database
    connection = get_db_connection()
    if not connection:
        print("❌ Failed to connect to database")
        sys.exit(1)
    
    cursor = connection.cursor()
    
    try:
        print("\n--- Step 1: Creating location tables ---")
        if not create_states_table(cursor):
            raise Exception("Failed to create states table")
        
        if not create_districts_table(cursor):
            raise Exception("Failed to create districts table")
        
        print("\n--- Step 2: Adding columns to deals table ---")
        if not add_location_columns_to_deals(cursor):
            raise Exception("Failed to add columns to deals table")
        
        print("\n--- Step 3: Adding foreign key constraints ---")
        add_foreign_keys_to_deals(cursor)  # Continue even if FK creation fails
        
        print("\n--- Step 4: Seeding states data ---")
        if not seed_states(cursor):
            raise Exception("Failed to seed states data")
        
        print("\n--- Step 5: Migrating existing location data ---")
        if not migrate_existing_location_data(cursor):
            raise Exception("Failed to migrate existing location data")
        
        # Commit all changes
        connection.commit()
        print("\n✅ All changes committed successfully")
        
        # Validate results
        validate_migration(cursor)
        
        print("\n🎉 Migration completed successfully!")
        print("=" * 70)
        print(f"Migration completed at: {datetime.now()}")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        print(f"Error details: {type(e).__name__}")
        if hasattr(e, 'errno'):
            print(f"MySQL Error Code: {e.errno}")
        if hasattr(e, 'msg'):
            print(f"MySQL Error Message: {e.msg}")
        connection.rollback()
        print("All changes have been rolled back")
        sys.exit(1)
        
    finally:
        cursor.close()
        connection.close()

if __name__ == "__main__":
    main()
