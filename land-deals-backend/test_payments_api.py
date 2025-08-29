#!/usr/bin/env python3
"""
Test script to verify the enhanced payments API with party names
"""
import requests
import json

def test_payments_api():
    """Test the payments API endpoint"""
    try:
        print("Testing payments API with detailed party names...")
        
        # Call the API
        response = requests.get('http://127.0.0.1:5000/api/payments/50')
        
        if response.status_code == 200:
            payments = response.json()
            print(f"✅ API call successful! Found {len(payments)} payments")
            
            for payment in payments:
                print(f"\n💰 Payment #{payment['id']} - ₹{payment['amount']}")
                print(f"   Date: {payment['payment_date']}")
                
                if payment.get('parties'):
                    print(f"   Parties ({len(payment['parties'])}):")
                    for party in payment['parties']:
                        party_name = party.get('party_name', 'Unknown')
                        party_type = party.get('party_type', 'Unknown')
                        party_id = party.get('party_id', 'N/A')
                        role = party.get('role', 'N/A')
                        amount = party.get('amount', 'N/A')
                        
                        print(f"     - {party_name} ({party_type} #{party_id})")
                        print(f"       Role: {role}, Amount: {amount}")
                        
                    # Show payment flow
                    payers = [p for p in payment['parties'] if p.get('role', '').lower() == 'payer']
                    payees = [p for p in payment['parties'] if p.get('role', '').lower() == 'payee']
                    
                    if payers and payees:
                        payer_names = [f"{p.get('party_name', 'Unknown')} ({p.get('party_type')})" for p in payers]
                        payee_names = [f"{p.get('party_name', 'Unknown')} ({p.get('party_type')})" for p in payees]
                        print(f"   🔄 Flow: {' & '.join(payer_names)} → {' & '.join(payee_names)}")
                else:
                    print("   No parties found")
                    
        else:
            print(f"❌ API call failed with status {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error testing API: {e}")

if __name__ == '__main__':
    test_payments_api()
