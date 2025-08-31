#!/usr/bin/env python3

import requests
import json
import time

def test_points_system():
    base_url = "https://chat-nexus-9.preview.emergentagent.com/api"
    
    print("🏆 Testing Points System - Simple Test")
    print("=" * 50)
    
    # Test 1: Register a new user (should get daily login bonus)
    print("\n1️⃣ Testing User Registration and Daily Login Bonus...")
    
    test_user = {
        "username": f"pointstest_{int(time.time())}",
        "email": f"pointstest_{int(time.time())}@richcomm.de",
        "password": "TestPass123!"
    }
    
    # Register
    reg_response = requests.post(f"{base_url}/auth/register", json=test_user)
    print(f"   Registration: {reg_response.status_code}")
    if reg_response.status_code == 200:
        reg_data = reg_response.json()
        initial_points = reg_data.get('points', 0)
        print(f"   Initial points: {initial_points}")
    else:
        print(f"   Registration failed: {reg_response.text}")
        return False
    
    # Login (should trigger daily bonus)
    login_response = requests.post(f"{base_url}/auth/login", json={
        "username": test_user["username"], 
        "password": test_user["password"]
    })
    print(f"   Login: {login_response.status_code}")
    
    if login_response.status_code == 200:
        login_data = login_response.json()
        token = login_data.get('access_token')
        user_data = login_data.get('user', {})
        after_login_points = user_data.get('points', 0)
        
        print(f"   Points after login: {after_login_points}")
        
        if after_login_points > initial_points:
            bonus = after_login_points - initial_points
            print(f"   ✅ Daily login bonus awarded: {bonus} points")
        else:
            print(f"   ❌ No daily login bonus detected")
            
        headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
        
        # Test 2: Check Points Summary API
        print("\n2️⃣ Testing Points Summary API...")
        user_id = user_data.get('id')
        
        summary_response = requests.get(f"{base_url}/points/summary/{user_id}", headers=headers)
        print(f"   Points Summary API: {summary_response.status_code}")
        
        if summary_response.status_code == 200:
            summary_data = summary_response.json()
            print(f"   ✅ Points Summary: {json.dumps(summary_data, indent=2)}")
        else:
            print(f"   ❌ Points Summary failed: {summary_response.text}")
        
        # Test 3: Check Points Transactions API
        print("\n3️⃣ Testing Points Transactions API...")
        
        transactions_response = requests.get(f"{base_url}/points/transactions", headers=headers)
        print(f"   Points Transactions API: {transactions_response.status_code}")
        
        if transactions_response.status_code == 200:
            transactions_data = transactions_response.json()
            print(f"   ✅ Found {len(transactions_data)} transactions")
            if transactions_data:
                print(f"   Latest transaction: {json.dumps(transactions_data[0], indent=2, default=str)}")
        else:
            print(f"   ❌ Points Transactions failed: {transactions_response.text}")
        
        # Test 4: Check Leaderboard API (public)
        print("\n4️⃣ Testing Points Leaderboard API...")
        
        leaderboard_response = requests.get(f"{base_url}/leaderboard")
        print(f"   Leaderboard API: {leaderboard_response.status_code}")
        
        if leaderboard_response.status_code == 200:
            leaderboard_data = leaderboard_response.json()
            print(f"   ✅ Leaderboard has {len(leaderboard_data)} entries")
            if leaderboard_data:
                top_user = leaderboard_data[0]
                print(f"   Top user: {top_user.get('username')} with {top_user.get('points')} points")
        else:
            print(f"   ❌ Leaderboard failed: {leaderboard_response.text}")
        
        # Test 5: Try to create forum content to earn points
        print("\n5️⃣ Testing Forum Activity Points...")
        
        # Get forum topics
        topics_response = requests.get(f"{base_url}/forum/topics")
        if topics_response.status_code == 200:
            topics = topics_response.json()
            if topics:
                # Use first public topic
                topic = None
                for t in topics:
                    if t.get('is_public', True):
                        topic = t
                        break
                
                if topic:
                    # Create a thread
                    thread_data = {
                        "topic_id": topic['id'],
                        "title": f"Points Test Thread {int(time.time())}",
                        "content": "Testing points earning from forum thread creation"
                    }
                    
                    thread_response = requests.post(f"{base_url}/forum/threads", json=thread_data, headers=headers)
                    print(f"   Create Thread: {thread_response.status_code}")
                    
                    if thread_response.status_code == 200:
                        thread_info = thread_response.json()
                        thread_id = thread_info.get('id')
                        
                        # Create a post in the thread
                        post_data = {
                            "thread_id": thread_id,
                            "content": "Testing points earning from forum post creation"
                        }
                        
                        post_response = requests.post(f"{base_url}/forum/posts", json=post_data, headers=headers)
                        print(f"   Create Post: {post_response.status_code}")
                        
                        # Check points again
                        final_summary_response = requests.get(f"{base_url}/points/summary/{user_id}", headers=headers)
                        if final_summary_response.status_code == 200:
                            final_summary = final_summary_response.json()
                            final_points = final_summary.get('current_points', 0)
                            total_earned = final_points - initial_points
                            
                            print(f"   ✅ Final points: {final_points} (earned {total_earned} total)")
                            
                            if total_earned > 0:
                                print(f"   ✅ Points system is working! Earned {total_earned} points from activities")
                                return True
                            else:
                                print(f"   ❌ No points earned from activities")
                        
        return False
    else:
        print(f"   Login failed: {login_response.text}")
        return False

if __name__ == "__main__":
    success = test_points_system()
    if success:
        print("\n🎉 Points System Test PASSED!")
    else:
        print("\n❌ Points System Test FAILED!")