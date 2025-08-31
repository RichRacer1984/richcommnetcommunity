#!/usr/bin/env python3

import requests
import json
import time

def test_comprehensive_points_system():
    base_url = "https://chat-nexus-9.preview.emergentagent.com/api"
    
    print("🏆 COMPREHENSIVE POINTS SYSTEM FINAL TEST")
    print("=" * 50)
    
    results = {
        "daily_login_bonus": False,
        "forum_activity_points": False,
        "points_api_endpoints": False,
        "points_leaderboard": False,
        "admin_access_control": False,
        "point_earning_rules": False
    }
    
    # Test 1: Daily Login Bonus
    print("\n1️⃣ Testing Daily Login Bonus...")
    
    test_user = {
        "username": f"finaltest_{int(time.time())}",
        "email": f"finaltest_{int(time.time())}@richcomm.de",
        "password": "TestPass123!"
    }
    
    # Register user
    reg_response = requests.post(f"{base_url}/auth/register", json=test_user)
    if reg_response.status_code == 200:
        reg_data = reg_response.json()
        initial_points = reg_data.get('points', 0)
        
        # Login user (should trigger daily bonus)
        login_response = requests.post(f"{base_url}/auth/login", json={
            "username": test_user["username"], 
            "password": test_user["password"]
        })
        
        if login_response.status_code == 200:
            login_data = login_response.json()
            user_data = login_data.get('user', {})
            after_login_points = user_data.get('points', 0)
            
            if after_login_points > initial_points:
                bonus = after_login_points - initial_points
                print(f"   ✅ Daily login bonus: {bonus} points")
                results["daily_login_bonus"] = True
            else:
                print(f"   ❌ No daily login bonus detected")
        else:
            print(f"   ❌ Login failed: {login_response.status_code}")
    else:
        print(f"   ❌ Registration failed: {reg_response.status_code}")
    
    if not results["daily_login_bonus"]:
        print("❌ Daily Login Bonus test failed")
        return False
    
    # Get user token for further tests
    token = login_data.get('access_token')
    user_id = user_data.get('id')
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    # Test 2: Forum Activity Points
    print("\n2️⃣ Testing Forum Activity Points...")
    
    # Get forum topics
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
                "title": f"Final Test Thread {int(time.time())}",
                "content": "Testing points from thread creation"
            }
            
            thread_response = requests.post(f"{base_url}/forum/threads", json=thread_data, headers=headers)
            if thread_response.status_code == 200:
                thread_info = thread_response.json()
                
                # Create post (should earn 2 points)
                post_data = {
                    "thread_id": thread_info.get('id'),
                    "content": "Testing points from post creation"
                }
                
                post_response = requests.post(f"{base_url}/forum/posts", json=post_data, headers=headers)
                if post_response.status_code == 200:
                    
                    # Check final points
                    final_summary = requests.get(f"{base_url}/points/summary/{user_id}", headers=headers)
                    if final_summary.status_code == 200:
                        final_points = final_summary.json().get('current_points', 0)
                        forum_points_earned = final_points - initial_points
                        
                        if forum_points_earned >= 7:  # 5 for thread + 2 for post
                            print(f"   ✅ Forum activity points: {forum_points_earned} points")
                            results["forum_activity_points"] = True
                        else:
                            print(f"   ❌ Expected 7+ points, got {forum_points_earned}")
    
    if not results["forum_activity_points"]:
        print("❌ Forum Activity Points test failed")
        return False
    
    # Test 3: Points API Endpoints
    print("\n3️⃣ Testing Points API Endpoints...")
    
    # Points Summary
    summary_response = requests.get(f"{base_url}/points/summary/{user_id}", headers=headers)
    if summary_response.status_code == 200:
        summary_data = summary_response.json()
        required_fields = ['user_id', 'username', 'current_points', 'total_earned', 'total_spent', 'today_earned']
        
        if all(field in summary_data for field in required_fields):
            print(f"   ✅ Points Summary API: All required fields present")
            
            # Points Transactions
            transactions_response = requests.get(f"{base_url}/points/transactions", headers=headers)
            if transactions_response.status_code == 200:
                transactions_data = transactions_response.json()
                if len(transactions_data) >= 3:  # Should have daily login + thread + post
                    print(f"   ✅ Points Transactions API: {len(transactions_data)} transactions")
                    results["points_api_endpoints"] = True
                else:
                    print(f"   ❌ Expected 3+ transactions, got {len(transactions_data)}")
            else:
                print(f"   ❌ Transactions API failed: {transactions_response.status_code}")
        else:
            missing = [f for f in required_fields if f not in summary_data]
            print(f"   ❌ Summary API missing fields: {missing}")
    else:
        print(f"   ❌ Summary API failed: {summary_response.status_code}")
    
    if not results["points_api_endpoints"]:
        print("❌ Points API Endpoints test failed")
        return False
    
    # Test 4: Points Leaderboard
    print("\n4️⃣ Testing Points Leaderboard...")
    
    leaderboard_response = requests.get(f"{base_url}/leaderboard")
    if leaderboard_response.status_code == 200:
        leaderboard_data = leaderboard_response.json()
        
        if isinstance(leaderboard_data, list) and len(leaderboard_data) > 0:
            first_entry = leaderboard_data[0]
            required_fields = ['username', 'points', 'role']
            
            if all(field in first_entry for field in required_fields):
                # Check if sorted by points (descending)
                if len(leaderboard_data) > 1:
                    if leaderboard_data[0]['points'] >= leaderboard_data[1]['points']:
                        print(f"   ✅ Leaderboard: {len(leaderboard_data)} entries, properly sorted")
                        results["points_leaderboard"] = True
                    else:
                        print(f"   ❌ Leaderboard not properly sorted")
                else:
                    print(f"   ✅ Leaderboard: {len(leaderboard_data)} entries")
                    results["points_leaderboard"] = True
            else:
                missing = [f for f in required_fields if f not in first_entry]
                print(f"   ❌ Leaderboard missing fields: {missing}")
        else:
            print(f"   ❌ Leaderboard returned invalid data")
    else:
        print(f"   ❌ Leaderboard API failed: {leaderboard_response.status_code}")
    
    if not results["points_leaderboard"]:
        print("❌ Points Leaderboard test failed")
        return False
    
    # Test 5: Admin Access Control
    print("\n5️⃣ Testing Admin Access Control...")
    
    # Try admin endpoints with regular user (should fail)
    admin_endpoints = [
        ("GET", "admin/users"),
        ("GET", "admin/points/rules"),
        ("POST", "admin/points/award")
    ]
    
    admin_access_denied = 0
    for method, endpoint in admin_endpoints:
        if method == "GET":
            response = requests.get(f"{base_url}/{endpoint}", headers=headers)
        elif method == "POST":
            test_data = {"user_id": user_id, "points": 10, "reason": "test", "category": "admin"}
            response = requests.post(f"{base_url}/{endpoint}", json=test_data, headers=headers)
        
        if response.status_code == 403:
            admin_access_denied += 1
    
    if admin_access_denied == len(admin_endpoints):
        print(f"   ✅ Admin access control: All {admin_access_denied} endpoints properly protected")
        results["admin_access_control"] = True
    else:
        print(f"   ❌ Admin access control: Only {admin_access_denied}/{len(admin_endpoints)} endpoints protected")
    
    if not results["admin_access_control"]:
        print("❌ Admin Access Control test failed")
        return False
    
    # Test 6: Point Earning Rules (verify structure exists)
    print("\n6️⃣ Testing Point Earning Rules Structure...")
    
    # Check if we can see evidence of point earning rules in our transactions
    transactions_response = requests.get(f"{base_url}/points/transactions", headers=headers)
    if transactions_response.status_code == 200:
        transactions = transactions_response.json()
        
        # Look for different categories
        categories_found = set()
        reasons_found = set()
        
        for transaction in transactions:
            categories_found.add(transaction.get('category', ''))
            reasons_found.add(transaction.get('reason', ''))
        
        expected_categories = {'daily', 'forum'}
        expected_reasons = {'Täglicher Login-Bonus', 'Forum-Thread erstellt', 'Forum-Beitrag verfasst'}
        
        if expected_categories.issubset(categories_found):
            print(f"   ✅ Point categories found: {list(categories_found)}")
            
            if any(reason in reasons_found for reason in expected_reasons):
                print(f"   ✅ Point earning rules working: {list(reasons_found)}")
                results["point_earning_rules"] = True
            else:
                print(f"   ❌ Expected point earning reasons not found")
        else:
            print(f"   ❌ Expected categories not found: {list(categories_found)}")
    
    if not results["point_earning_rules"]:
        print("❌ Point Earning Rules test failed")
        return False
    
    # Final Results
    print("\n" + "=" * 50)
    print("🏆 COMPREHENSIVE POINTS SYSTEM TEST RESULTS")
    print("=" * 50)
    
    all_passed = True
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"   {test_name.replace('_', ' ').title()}: {status}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 ALL POINTS SYSTEM TESTS PASSED!")
        print("✅ The Comprehensive Points System is fully functional and production-ready.")
        return True
    else:
        print("❌ SOME POINTS SYSTEM TESTS FAILED!")
        return False

if __name__ == "__main__":
    success = test_comprehensive_points_system()
    exit(0 if success else 1)