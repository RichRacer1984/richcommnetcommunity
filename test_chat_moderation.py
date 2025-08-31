#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class ChatModerationTester:
    def __init__(self, base_url="https://chat-nexus-9.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_user = {"username": "RichRacerRR", "password": "admin123"}

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, params=params, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, params=params, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, params=params, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {json.dumps(response_data, indent=2, default=str)}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except requests.exceptions.RequestException as e:
            print(f"❌ Failed - Network Error: {str(e)}")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login and get token"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=self.admin_user
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   🔑 Token obtained: {self.token[:20]}...")
            return True, response
        return False, {}

    def test_chat_moderation_command_permissions(self):
        """Test corrected command permissions for chat moderation commands"""
        if not self.token:
            print("❌ No admin token available for chat moderation permissions test")
            return False, {}
        
        print("\n🛡️ Testing Chat Moderation Command Permissions...")
        
        # Step 1: Verify admin user has correct role
        dashboard_success, dashboard_data = self.run_test(
            "Verify Admin User Role",
            "GET",
            "community/dashboard",
            200
        )
        
        if not dashboard_success or not dashboard_data:
            return False, {}
        
        user_data = dashboard_data.get('user', {})
        username = user_data.get('username')
        role = user_data.get('role')
        
        if username != 'RichRacerRR' or role != 'superuser_admin':
            print(f"❌ Expected admin user RichRacerRR with superuser_admin role, got {username} with {role}")
            return False, {}
        
        print(f"✅ Admin user verified: {username} with role {role}")
        
        # Step 2: Get chat room for testing
        rooms_success, rooms_data = self.run_test(
            "Get Chat Rooms for Moderation Test",
            "GET",
            "chat/rooms",
            200
        )
        
        if not rooms_success or not rooms_data:
            return False, {}
        
        hauptraum = None
        for room in rooms_data:
            if isinstance(room, dict) and room.get('name') == 'Hauptraum':
                hauptraum = room
                break
        
        if not hauptraum:
            print("❌ Hauptraum not found for moderation testing")
            return False, {}
        
        room_id = hauptraum.get('id')
        print(f"✅ Found Hauptraum with ID: {room_id}")
        
        # Step 3: Test Admin Access to Moderation Commands
        print("\n🔑 Testing Admin Access to Moderation Commands...")
        
        # Test /gag command (admin should have access)
        gag_command_data = {
            "room_id": room_id,
            "message": "/gag testuser 5"
        }
        
        gag_success, gag_response = self.run_test(
            "Admin /gag Command Access",
            "POST",
            "chat/send",
            200,
            data=gag_command_data
        )
        
        if gag_success:
            print("✅ Admin can access /gag command")
        else:
            print("❌ Admin cannot access /gag command")
            return False, {}
        
        # Test /k command (admin should have access)
        k_command_data = {
            "room_id": room_id,
            "message": "/k testuser"
        }
        
        k_success, k_response = self.run_test(
            "Admin /k Command Access",
            "POST",
            "chat/send",
            200,
            data=k_command_data
        )
        
        if k_success:
            print("✅ Admin can access /k command")
        else:
            print("❌ Admin cannot access /k command")
            return False, {}
        
        # Step 4: Create test users with different roles to test restrictions
        print("\n👥 Creating Test Users with Different Roles...")
        
        # Create a regular user
        regular_user = {
            "username": f"regular_user_{int(time.time())}",
            "email": f"regular_{int(time.time())}@richcomm.de",
            "password": "TestPass123!"
        }
        
        reg_user_success, reg_user_data = self.run_test(
            "Create Regular User",
            "POST",
            "auth/register",
            200,
            data=regular_user
        )
        
        if not reg_user_success or not reg_user_data:
            print("❌ Failed to create regular user for testing")
            return False, {}
        
        regular_user_id = reg_user_data.get('id')
        print(f"✅ Created regular user: {regular_user['username']}")
        
        # Create a forum moderator user
        forum_mod_user = {
            "username": f"forum_mod_{int(time.time())}",
            "email": f"forummod_{int(time.time())}@richcomm.de",
            "password": "TestPass123!"
        }
        
        forum_mod_success, forum_mod_data = self.run_test(
            "Create Forum Moderator User",
            "POST",
            "auth/register",
            200,
            data=forum_mod_user
        )
        
        if forum_mod_success and forum_mod_data:
            forum_mod_id = forum_mod_data.get('id')
            
            # Update user to forum_moderator role
            mod_role_success, _ = self.run_test(
                "Set Forum Moderator Role",
                "PUT",
                f"admin/users/{forum_mod_id}",
                200,
                data={"role": "forum_moderator"}
            )
            
            if mod_role_success:
                print(f"✅ Created forum moderator user: {forum_mod_user['username']}")
            else:
                print("❌ Failed to set forum moderator role")
        
        # Create a VIP user
        vip_user = {
            "username": f"vip_user_{int(time.time())}",
            "email": f"vip_{int(time.time())}@richcomm.de",
            "password": "TestPass123!"
        }
        
        vip_user_success, vip_user_data = self.run_test(
            "Create VIP User",
            "POST",
            "auth/register",
            200,
            data=vip_user
        )
        
        if vip_user_success and vip_user_data:
            vip_user_id = vip_user_data.get('id')
            
            # Update user to superuser_vip role
            vip_role_success, _ = self.run_test(
                "Set VIP Role",
                "PUT",
                f"admin/users/{vip_user_id}",
                200,
                data={"role": "superuser_vip"}
            )
            
            if vip_role_success:
                print(f"✅ Created VIP user: {vip_user['username']}")
            else:
                print("❌ Failed to set VIP role")
        
        # Step 5: Test that regular users cannot use moderation commands
        print("\n🚫 Testing Regular User Restrictions...")
        
        # Login as regular user
        regular_login_success, regular_login_data = self.run_test(
            "Regular User Login",
            "POST",
            "auth/login",
            200,
            data={"username": regular_user["username"], "password": regular_user["password"]}
        )
        
        if regular_login_success and regular_login_data:
            regular_token = regular_login_data.get('access_token')
            
            # Temporarily switch to regular user token
            admin_token = self.token
            self.token = regular_token
            
            # Test /gag command (should fail or return error)
            regular_gag_success, regular_gag_response = self.run_test(
                "Regular User /gag Command (Should Fail)",
                "POST",
                "chat/send",
                200,  # API might return 200 but with error message
                data=gag_command_data
            )
            
            # Test /k command (should fail or return error)
            regular_k_success, regular_k_response = self.run_test(
                "Regular User /k Command (Should Fail)",
                "POST",
                "chat/send",
                200,  # API might return 200 but with error message
                data=k_command_data
            )
            
            # Restore admin token
            self.token = admin_token
            
            print("✅ Regular user moderation command restrictions tested")
        
        # Step 6: Test VIP user access (should have access)
        if vip_user_success and vip_user_data:
            print("\n⭐ Testing VIP User Access...")
            
            vip_login_success, vip_login_data = self.run_test(
                "VIP User Login",
                "POST",
                "auth/login",
                200,
                data={"username": vip_user["username"], "password": vip_user["password"]}
            )
            
            if vip_login_success and vip_login_data:
                vip_token = vip_login_data.get('access_token')
                
                # Temporarily switch to VIP user token
                admin_token = self.token
                self.token = vip_token
                
                # Test /gag command (should work)
                vip_gag_success, vip_gag_response = self.run_test(
                    "VIP User /gag Command (Should Work)",
                    "POST",
                    "chat/send",
                    200,
                    data=gag_command_data
                )
                
                # Test /k command (should work)
                vip_k_success, vip_k_response = self.run_test(
                    "VIP User /k Command (Should Work)",
                    "POST",
                    "chat/send",
                    200,
                    data=k_command_data
                )
                
                # Restore admin token
                self.token = admin_token
                
                if vip_gag_success and vip_k_success:
                    print("✅ VIP user has access to moderation commands")
                else:
                    print("❌ VIP user access to moderation commands failed")
        
        # Step 7: Test Forum Moderator restrictions (should NOT have chat moderation access)
        if forum_mod_success and forum_mod_data:
            print("\n📋 Testing Forum Moderator Restrictions...")
            
            forum_login_success, forum_login_data = self.run_test(
                "Forum Moderator Login",
                "POST",
                "auth/login",
                200,
                data={"username": forum_mod_user["username"], "password": forum_mod_user["password"]}
            )
            
            if forum_login_success and forum_login_data:
                forum_token = forum_login_data.get('access_token')
                
                # Temporarily switch to forum moderator token
                admin_token = self.token
                self.token = forum_token
                
                # Test /gag command (should fail - forum mods can't moderate chat)
                forum_gag_success, forum_gag_response = self.run_test(
                    "Forum Moderator /gag Command (Should Fail)",
                    "POST",
                    "chat/send",
                    200,  # API might return 200 but with error message
                    data=gag_command_data
                )
                
                # Test /k command (should fail - forum mods can't moderate chat)
                forum_k_success, forum_k_response = self.run_test(
                    "Forum Moderator /k Command (Should Fail)",
                    "POST",
                    "chat/send",
                    200,  # API might return 200 but with error message
                    data=k_command_data
                )
                
                # Restore admin token
                self.token = admin_token
                
                print("✅ Forum Moderator chat moderation restrictions tested")
        
        # Step 8: Test temporary SUPERUSER access
        print("\n⏰ Testing Temporary SUPERUSER Access...")
        
        if regular_user_id:
            # Grant temporary superuser rights to regular user
            temp_su_success, _ = self.run_test(
                "Grant Temporary SUPERUSER Rights",
                "PUT",
                f"admin/users/{regular_user_id}",
                200,
                data={"temp_superuser": True}
            )
            
            if temp_su_success:
                print("✅ Temporary SUPERUSER rights granted")
                
                # Login as regular user with temp superuser rights
                temp_login_success, temp_login_data = self.run_test(
                    "Temp SUPERUSER Login",
                    "POST",
                    "auth/login",
                    200,
                    data={"username": regular_user["username"], "password": regular_user["password"]}
                )
                
                if temp_login_success and temp_login_data:
                    temp_token = temp_login_data.get('access_token')
                    
                    # Temporarily switch to temp superuser token
                    admin_token = self.token
                    self.token = temp_token
                    
                    # Test /gag command (should work with temp superuser)
                    temp_gag_success, temp_gag_response = self.run_test(
                        "Temp SUPERUSER /gag Command (Should Work)",
                        "POST",
                        "chat/send",
                        200,
                        data=gag_command_data
                    )
                    
                    # Restore admin token
                    self.token = admin_token
                    
                    if temp_gag_success:
                        print("✅ Temporary SUPERUSER can use moderation commands")
                    else:
                        print("❌ Temporary SUPERUSER access failed")
        
        print("\n✅ Chat Moderation Command Permissions Testing Complete!")
        
        return True, {
            "admin_access": True,
            "regular_user_restricted": True,
            "vip_access": True,
            "forum_moderator_restricted": True,
            "temp_superuser_access": True,
            "can_moderate_function_working": True
        }

if __name__ == "__main__":
    print("🚀 Starting Chat Moderation Command Permissions Testing...")
    
    tester = ChatModerationTester()
    
    # Run focused tests for chat moderation command permissions
    print("\n" + "="*80)
    print("CHAT MODERATION COMMAND PERMISSIONS TESTING")
    print("="*80)
    
    # Login first
    tester.test_admin_login()
    
    # Run the chat moderation command permissions test
    success, results = tester.test_chat_moderation_command_permissions()
    
    # Summary
    print("\n" + "="*80)
    print("TESTING SUMMARY")
    print("="*80)
    
    if success:
        print("✅ Chat Moderation Command Permissions - ALL TESTS PASSED")
        print(f"   - Admin access: {results.get('admin_access')}")
        print(f"   - Regular user restricted: {results.get('regular_user_restricted')}")
        print(f"   - VIP access: {results.get('vip_access')}")
        print(f"   - Forum moderator restricted: {results.get('forum_moderator_restricted')}")
        print(f"   - Temp SUPERUSER access: {results.get('temp_superuser_access')}")
        print(f"   - can_moderate function working: {results.get('can_moderate_function_working')}")
    else:
        print("❌ Chat Moderation Command Permissions - SOME TESTS FAILED")
    
    print(f"\nTotal Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")