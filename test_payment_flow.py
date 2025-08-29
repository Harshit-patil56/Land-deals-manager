import requests
import json

# Test the enhanced payment creation with pay_to relationships
BASE_URL = 'http://localhost:5000'

def get_auth_token():
    """Get authentication token by logging in"""
    # Try common credentials
    credentials = [
        {"username": "admin", "password": "admin"},
        {"username": "admin", "password": "password"},
        {"username": "admin", "password": "123456"},
        {"username": "test", "password": "test"},
        {"username": "user", "password": "user"}
    ]
    
    for login_data in credentials:
        try:
            response = requests.post(f'{BASE_URL}/api/login', json=login_data)
            if response.status_code == 200:
                token = response.json().get('token')
                print(f"✅ Successfully logged in with {login_data['username']}")
                return token
            else:
                print(f"❌ Login failed for {login_data['username']}: {response.status_code}")
        except Exception as e:
            print(f"❌ Login error for {login_data['username']}: {e}")
    
    print("❌ All login attempts failed")
    return None

def test_payment_creation():
    print("Testing payment creation with pay_to relationships...")
    
    # Get authentication token
    token = get_auth_token()
    if not token:
        return None
    
    # Create a test payment
    payment_data = {
        "amount": 100.00,
        "payment_date": "2024-01-15",
        "payment_mode": "bank_transfer",
        "description": "Test payment with pay_to relationships",
        "parties": [
            {
                "party_type": "owner",
                "party_id": 62,  # romit
                "amount": 100.00,
                "role": "payer",
                "pay_to_id": 63,  # new test owner
                "pay_to_name": "new test owner", 
                "pay_to_type": "owner"
            }
        ]
    }
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    
    try:
        response = requests.post(
            f'{BASE_URL}/api/deals/50/payments',
            json=payment_data,
            headers=headers
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 201:
            print("✅ Payment created successfully!")
            return response.json().get('payment_id')
        else:
            print("❌ Payment creation failed")
            return None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_payment_list():
    print("\nTesting payment list to see the new payment...")
    
    # Get authentication token
    token = get_auth_token()
    if not token:
        return
    
    headers = {'Authorization': f'Bearer {token}'}
    
    try:
        response = requests.get(f'{BASE_URL}/api/deals/50/payments', headers=headers)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            payments = response.json()
            print(f"Found {len(payments)} payments:")
            
            for payment in payments:
                print(f"\n💰 Payment ID: {payment['id']}")
                print(f"   Amount: ${payment['amount']}")
                print(f"   Date: {payment['payment_date']}")
                print(f"   Parties: {len(payment.get('parties', []))}")
                
                for party in payment.get('parties', []):
                    party_name = party.get('party_name', f"{party['party_type']} #{party['party_id']}")
                    pay_to_info = ""
                    if party.get('pay_to_name'):
                        pay_to_info = f" → pays to {party['pay_to_name']} ({party['pay_to_type']})"
                    
                    print(f"     {party['role']}: {party_name} (${party['amount']}){pay_to_info}")
        else:
            print("❌ Failed to fetch payments")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    # Test payment creation
    payment_id = test_payment_creation()
    
    # Test payment list
    test_payment_list()
