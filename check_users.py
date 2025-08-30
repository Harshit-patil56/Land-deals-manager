import mysql.connector
from mysql.connector import Error

def check_users():
    try:
        # Database connection parameters
        connection = mysql.connector.connect(
            host='mysql-3ec7b1a7-harshitpatil56-a92f.h.aivencloud.com',
            database='defaultdb',
            user='avnadmin',
            password='AVNS_1fVlfDGlH1KPJD8Lv2b',
            port=26633,
            ssl_ca='ca-certificate.pem',
            ssl_verify_cert=True,
            ssl_verify_identity=False
        )
        
        if connection.is_connected():
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT id, username, role FROM users")
            users = cursor.fetchall()
            
            print("Available users:")
            for user in users:
                print(f"  ID: {user['id']}, Username: {user['username']}, Role: {user['role']}")
                
    except Error as e:
        print(f"Error: {e}")
    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()

if __name__ == "__main__":
    check_users()
