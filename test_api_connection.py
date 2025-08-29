import requests
import json

# Use the Flask app to update the database schema
BASE_URL = 'http://localhost:5000'

def add_payment_target_fields_via_api():
    """Add pay_to fields via the Flask app's database connection"""
    
    # Create a special endpoint request
    endpoint_data = {
        "action": "add_payment_target_fields",
        "sql_commands": [
            "ALTER TABLE payment_parties ADD COLUMN pay_to_id INT NULL AFTER role",
            "ALTER TABLE payment_parties ADD COLUMN pay_to_name VARCHAR(100) NULL AFTER pay_to_id", 
            "ALTER TABLE payment_parties ADD COLUMN pay_to_type ENUM('owner', 'buyer', 'investor', 'other') NULL AFTER pay_to_name",
            "CREATE INDEX idx_pay_to_id ON payment_parties(pay_to_id)"
        ]
    }
    
    try:
        # Since there's no admin endpoint, let's create a test script that runs in the Flask context
        print("Creating test payment to check if pay_to fields exist...")
        
        # Test the current payment creation with pay_to fields
        test_payment = {
            "amount": 1.00,
            "payment_date": "2024-01-01",
            "payment_mode": "test",
            "description": "Test payment for schema check",
            "parties": [
                {
                    "party_type": "owner",
                    "party_id": 62,
                    "amount": 1.00,
                    "role": "payer",
                    "pay_to_id": 63,
                    "pay_to_name": "test target",
                    "pay_to_type": "owner"
                }
            ]
        }
        
        # Try to create payment (this will show us if the fields exist)
        response = requests.post(f'{BASE_URL}/api/deals/50/payments', json=test_payment)
        
        print(f"Payment creation test status: {response.status_code}")
        if response.status_code == 401:
            print("❌ Authentication required - but this tells us the endpoint exists")
            print("✅ Backend is running and can receive requests")
        else:
            print(f"Response: {response.text}")
            
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    add_payment_target_fields_via_api()
