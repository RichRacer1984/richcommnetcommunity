#!/usr/bin/env python3

import requests
import json
import time

def test_admin_points_functionality():
    base_url = "https://chat-nexus-9.preview.emergentagent.com/api"
    
    print("👑 Testing Admin Points Management")
    print("=" * 40)
    
    # First, let's create a regular user and then try to test admin functionality
    print("\n1️⃣ Creating test user...")
    
    test_user = {
        "username": f"admintest_{int(time.time())}",
        "email": f"admintest_{int(time.time())}@richcomm.de",
        "password": "TestPass123!"
    }
    
    # Register and login as regular user
    reg_response = requests.post(f"{base_url}/auth/register", json=test_user)
    if reg_response.status_code != 200:
        print(f"❌ Failed to register test user: {reg_response.text}")
        return False
    
    login_response = requests.post(f"{base_url}/auth/login", json={
        "username": test_user["username"], 
        "password": test_user["password"]
    })
    
    if login_response.status_code != 200:
        print(f"❌ Failed to login test user: {login_response.text}")
        return False
    
    login_data = login_response.json()
    user_token = login_data.get('access_token')
    user_data = login_data.get('user', {})
    user_id = user_data.get('id')
    
    print(f"✅ Test user created: {user_data.get('username')} (ID: {user_id})")
    
    headers = {'Authorization': f'Bearer {user_token}', 'Content-Type': 'application/json'}
    
    # Test 2: Try admin endpoints with regular user (should fail)
    print("\n2️⃣ Testing admin endpoint access with regular user...")
    
    admin_endpoints = [
        ("GET", "admin/users", "Get all users"),
        ("GET", "admin/points/rules", "Get point rules"),
        ("POST", "admin/points/award", "Award points"),
    ]
    
    for method, endpoint, description in admin_endpoints:
        if method == "GET":
            response = requests.get(f"{base_url}/{endpoint}", headers=headers)
        elif method == "POST":
            test_data = {"user_id": user_id, "points": 10, "reason": "test", "category": "admin"}
            response = requests.post(f"{base_url}/{endpoint}", json=test_data, headers=headers)
        
        print(f"   {description}: {response.status_code}")
        if response.status_code == 403:
            print(f"   ✅ Correctly denied access (403)")
        else:
            print(f"   ❌ Unexpected response: {response.status_code}")
    
    # Test 3: Test public points endpoints
    print("\n3️⃣ Testing public points endpoints...")
    
    # Points summary (user can access their own)
    summary_response = requests.get(f"{base_url}/points/summary/{user_id}", headers=headers)
    print(f"   Points Summary: {summary_response.status_code}")
    if summary_response.status_code == 200:
        summary = summary_response.json()
        print(f"   ✅ User points: {summary.get('current_points')}")
    
    # Points transactions
    transactions_response = requests.get(f"{base_url}/points/transactions", headers=headers)
    print(f"   Points Transactions: {transactions_response.status_code}")
    if transactions_response.status_code == 200:
        transactions = transactions_response.json()
        print(f"   ✅ Found {len(transactions)} transactions")
    
    # Leaderboard (public)
    leaderboard_response = requests.get(f"{base_url}/leaderboard")
    print(f"   Leaderboard (public): {leaderboard_response.status_code}")
    if leaderboard_response.status_code == 200:
        leaderboard = leaderboard_response.json()
        print(f"   ✅ Leaderboard has {len(leaderboard)} entries")
    
    # Test 4: Test point earning rules (check if they exist)
    print("\n4️⃣ Testing point earning mechanisms...")
    
    # Create forum content to earn points
    topics_response = requests.get(f"{base_url}/forum/topics")
    if topics_response.status_code == 200:
        topics = topics_response.json()
        public_topic = None
        for topic in topics:
            if topic.get('is_public', True):
                public_topic = topic
                break
        
        if public_topic:
            # Get initial points
            initial_summary = requests.get(f"{base_url}/points/summary/{user_id}", headers=headers)
            initial_points = 0
            if initial_summary.status_code == 200:
                initial_points = initial_summary.json().get('current_points', 0)
            
            # Create thread (should earn 5 points)
            thread_data = {
                "topic_id": public_topic['id'],
                "title": f"Admin Test Thread {int(time.time())}",
                "content": "Testing points from admin test"
            }
            
            thread_response = requests.post(f"{base_url}/forum/threads", json=thread_data, headers=headers)
            print(f"   Create Thread: {thread_response.status_code}")
            
            if thread_response.status_code == 200:
                thread_info = thread_response.json()
                
                # Create post (should earn 2 points)
                post_data = {
                    "thread_id": thread_info.get('id'),
                    "content": "Testing points from forum post"
                }
                
                post_response = requests.post(f"{base_url}/forum/posts", json=post_data, headers=headers)
                print(f"   Create Post: {post_response.status_code}")
                
                # Check final points
                final_summary = requests.get(f"{base_url}/points/summary/{user_id}", headers=headers)
                if final_summary.status_code == 200:
                    final_points = final_summary.json().get('current_points', 0)
                    earned = final_points - initial_points
                    print(f"   ✅ Points earned: {earned} (from {initial_points} to {final_points})")
                    
                    # Expected: 10 (daily login) + 5 (thread) + 2 (post) = 17 points
                    if earned >= 15:  # Allow some flexibility
                        print(f"   ✅ Point earning system working correctly!")
                        return True
                    else:
                        print(f"   ⚠️ Expected more points to be earned")
    
    return False

if __name__ == "__main__":
    success = test_admin_points_functionality()
    if success:
        print("\n🎉 Admin Points Management Test PASSED!")
    else:
        print("\n❌ Admin Points Management Test had issues!")