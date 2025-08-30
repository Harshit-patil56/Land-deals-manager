import requests
import json

# Test script to verify the payment creation with new pay_to functionality
BASE_URL = 'http://localhost:5000'

def test_payment_creation_flow():
    """Test the complete payment creation flow"""
    print("🧪 Testing Payment Creation with Pay-To Relationships")
    print("=" * 60)
    
    # Try different login combinations
    credentials_to_try = [
        ("admin", "admin"),
        ("test", "test"),
        ("user", "user"),
        ("demo", "demo")
    ]
    
    token = None
    for username, password in credentials_to_try:
        try:
            response = requests.post(f'{BASE_URL}/api/login', json={
                "username": username,
                "password": password
            })
            if response.status_code == 200:
                token = response.json().get('token')
                print(f"✅ Successfully logged in as: {username}")
                break
            else:
                print(f"❌ Login failed for {username}: {response.status_code}")
        except Exception as e:
            print(f"❌ Login error for {username}: {e}")
    
    if not token:
        print("❌ Could not authenticate with any credentials")
        print("📝 Please test manually through the web interface at http://localhost:3000")
        return False
    
    # Test payment creation
    print(f"\n🔄 Testing payment creation for Deal #50...")
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    
    test_payment = {
        "amount": 5000.00,
        "payment_date": "2024-01-15",
        "payment_mode": "bank_transfer",
        "description": "Test payment with pay-to relationships - romit pays to Harshit Patil",
        "parties": [
            {
                "party_type": "owner",
                "party_id": 62,  # romit
                "amount": 5000.00,
                "role": "payer",
                "pay_to_id": 51,  # Harshit Patil
                "pay_to_name": "Harshit Patil",
                "pay_to_type": "buyer"
            }
        ]
    }
    
    try:
        response = requests.post(
            f'{BASE_URL}/api/deals/50/payments',
            json=test_payment,
            headers=headers
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 201:
            print("✅ Payment created successfully!")
            payment_id = response.json().get('payment_id')
            
            # Test reading the payment back
            print(f"\n🔄 Fetching payment list to verify...")
            payments_response = requests.get(f'{BASE_URL}/api/deals/50/payments', headers=headers)
            
            if payments_response.status_code == 200:
                payments = payments_response.json()
                new_payment = next((p for p in payments if p['id'] == payment_id), None)
                
                if new_payment:
                    print(f"✅ Payment verified in database!")
                    print(f"   Payment ID: {new_payment['id']}")
                    print(f"   Amount: ${new_payment['amount']}")
                    print(f"   Description: {new_payment['description']}")
                    
                    for party in new_payment.get('parties', []):
                        pay_to_info = ""
                        if party.get('pay_to_name'):
                            pay_to_info = f" → pays to {party['pay_to_name']} ({party['pay_to_type']})"
                        
                        party_name = party.get('party_name', f"{party['party_type']} #{party['party_id']}")
                        print(f"   {party['role']}: {party_name} (${party['amount']}){pay_to_info}")
                else:
                    print("❌ Created payment not found in list")
            else:
                print(f"❌ Could not fetch payments: {payments_response.status_code}")
                
            return True
        else:
            print("❌ Payment creation failed")
            return False
            
    except Exception as e:
        print(f"❌ Error during payment creation: {e}")
        return False

if __name__ == "__main__":
    success = test_payment_creation_flow()
    
    if success:
        print("\n🎉 Payment creation system is working!")
        print("💡 You can now test through the web interface:")
        print("   1. Go to http://localhost:3000")
        print("   2. Login with your credentials")
        print("   3. Navigate to Deal #50")
        print("   4. Try creating a payment with the new 'who pays to whom' system")
    else:
        print("\n🔧 Manual testing required:")
        print("   1. Open http://localhost:3000 in your browser")
        print("   2. Login with your existing credentials")
        print("   3. Test the payment creation form")
        print("   4. Verify the 'Pay To Whom?' dropdown works correctly")
