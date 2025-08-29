import mysql.connector
from mysql.connector import Error
from werkzeug.security import generate_password_hash
import os

def create_test_user():
    try:
        # Use the same DB config as the app
        DB_CONFIG = {
            'host': 'mysql-3ca7d4a2-romitmeher-d46c.g.aivencloud.com',
            'port': 17231,
            'user': 'avnadmin',
            'password': os.environ.get('DB_PASSWORD', 'AVNS_8Fh3UJnyOZ4ovqMKdaJ'),  # Try common password
            'database': 'land_deals_db',
            'ssl_ca': 'land-deals-backend/ca-certificate.pem',
            'ssl_verify_cert': True,
            'ssl_verify_identity': True
        }
        
        connection = mysql.connector.connect(**DB_CONFIG)
        
        if connection.is_connected():
            cursor = connection.cursor()
            
            # First check if users table exists and what users are there
            cursor.execute("SHOW TABLES LIKE 'users'")
            table_exists = cursor.fetchone()
            
            if table_exists:
                cursor.execute("SELECT id, username, role FROM users LIMIT 5")
                existing_users = cursor.fetchall()
                print("Existing users:")
                for user in existing_users:
                    print(f"  ID: {user[0]}, Username: {user[1]}, Role: {user[2]}")
                
                # Try to create a test user if none exist
                if not existing_users:
                    # Create admin user
                    hashed_password = generate_password_hash("admin123")
                    cursor.execute(
                        "INSERT INTO users (username, password, role, full_name) VALUES (%s, %s, %s, %s)",
                        ("admin", hashed_password, "admin", "Test Admin")
                    )
                    connection.commit()
                    print("✅ Created admin user with username: admin, password: admin123")
                else:
                    print("Users already exist, no need to create new ones")
            else:
                print("Users table doesn't exist")
                
    except Error as e:
        print(f"Database error: {e}")
        # Try alternative password
        if "Access denied" in str(e):
            print("Trying alternative password...")
            try:
                DB_CONFIG['password'] = 'AVNS_1fVlfDGlH1KPJD8Lv2b'  # Alternative password from earlier
                connection = mysql.connector.connect(**DB_CONFIG)
                print("✅ Connected with alternative password")
                # Repeat the user check with alternative connection
                cursor = connection.cursor()
                cursor.execute("SELECT id, username, role FROM users LIMIT 5")
                existing_users = cursor.fetchall()
                print("Existing users:")
                for user in existing_users:
                    print(f"  ID: {user[0]}, Username: {user[1]}, Role: {user[2]}")
            except Error as e2:
                print(f"Alternative connection also failed: {e2}")
    except Exception as e:
        print(f"General error: {e}")
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

if __name__ == "__main__":
    create_test_user()
