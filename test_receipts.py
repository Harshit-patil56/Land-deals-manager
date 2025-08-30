#!/usr/bin/env python3
"""
Test script to verify receipt URLs are working correctly
"""
import requests
import json

def test_receipts_functionality():
    """Test if receipts can be loaded and accessed"""
    try:
        # Test backend connectivity
        backend_url = 'http://127.0.0.1:5000'
        
        print("🔄 Testing backend connectivity...")
        response = requests.get(f'{backend_url}/api/payments/test', timeout=5)
        if response.status_code != 200:
            print(f"❌ Backend not responding properly: {response.status_code}")
            return False
        
        print("✅ Backend is running")
        
        # Test file serving endpoint
        print("🔄 Testing uploads endpoint...")
        test_response = requests.get(f'{backend_url}/uploads/', timeout=5)
        print(f"📂 Uploads endpoint status: {test_response.status_code}")
        
        # Test if we can find any payment with proofs
        print("🔄 Testing payment proofs endpoint...")
        # We'll test with a sample payment ID structure
        sample_deal_id = 50  # Based on URL in screenshot
        sample_payment_id = 29  # Based on URL in screenshot
        
        proofs_response = requests.get(f'{backend_url}/api/payments/{sample_deal_id}/{sample_payment_id}/proofs', timeout=5)
        print(f"📋 Proofs endpoint status: {proofs_response.status_code}")
        
        if proofs_response.status_code == 200:
            proofs_data = proofs_response.json()
            print(f"📄 Found {len(proofs_data)} proof(s)")
            
            if proofs_data:
                first_proof = proofs_data[0]
                print(f"🔍 First proof structure:")
                print(f"   - ID: {first_proof.get('id')}")
                print(f"   - File path: {first_proof.get('file_path')}")
                print(f"   - URL: {first_proof.get('url')}")
                
                # Test if the URL is accessible
                if first_proof.get('url'):
                    try:
                        file_response = requests.head(first_proof['url'], timeout=5)
                        print(f"📂 File accessibility: {file_response.status_code}")
                        if file_response.status_code == 200:
                            print("✅ Receipt files are accessible!")
                        else:
                            print(f"❌ Receipt file not accessible: {file_response.status_code}")
                    except Exception as e:
                        print(f"❌ Error accessing file: {e}")
                        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing Receipt Functionality...")
    print("="*50)
    
    if test_receipts_functionality():
        print("="*50)
        print("🎉 Receipt functionality test completed!")
        print("📝 If receipts still don't work:")
        print("   1. Clear browser cache")
        print("   2. Try opening receipts in incognito mode")
        print("   3. Check browser console for errors")
    else:
        print("="*50)
        print("❌ Receipt functionality test failed!")
        print("📝 Check if backend is running and accessible")
