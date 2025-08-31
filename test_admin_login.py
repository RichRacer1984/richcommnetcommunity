#!/usr/bin/env python3

import requests
import json

def test_admin_login():
    base_url = "https://chat-nexus-9.preview.emergentagent.com/api"
    
    print("🔑 Testing Admin Login")
    print("=" * 30)
    
    # Try different admin credentials
    admin_credentials = [
        {"username": "RichRacerRR", "password": "admin123"},
        {"username": "admin", "password": "admin123"},
        {"username": "RichRacerRR", "password": "Admin123"},
        {"username": "RichRacerRR", "password": "richcomm123"},
    ]
    
    for i, creds in enumerate(admin_credentials, 1):
        print(f"\n{i}️⃣ Trying: {creds['username']} / {creds['password']}")
        
        response = requests.post(f"{base_url}/auth/login", json=creds)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            user = data.get('user', {})
            print(f"   ✅ SUCCESS! Logged in as: {user.get('username')}")
            print(f"   Role: {user.get('role')}")
            print(f"   Points: {user.get('points')}")
            print(f"   Token: {data.get('access_token', '')[:20]}...")
            
            # Test admin endpoint
            headers = {'Authorization': f'Bearer {data.get("access_token")}', 'Content-Type': 'application/json'}
            admin_test = requests.get(f"{base_url}/admin/users", headers=headers)
            print(f"   Admin endpoint test: {admin_test.status_code}")
            
            return True, data.get('access_token')
        else:
            try:
                error = response.json()
                print(f"   ❌ Failed: {error}")
            except:
                print(f"   ❌ Failed: {response.text}")
    
    return False, None

if __name__ == "__main__":
    success, token = test_admin_login()
    if success:
        print("\n🎉 Admin login successful!")
    else:
        print("\n❌ All admin login attempts failed!")