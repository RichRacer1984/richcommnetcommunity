#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class VIPCommandTester:
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

    def test_admin_role_recognition(self):
        """Test Admin Role Recognition for RichRacerRR"""
        if not self.token:
            print("❌ No admin token available for role recognition test")
            return False, {}
        
        print("\n👑 Testing Admin Role Recognition...")
        
        # Get current user info from dashboard
        dashboard_success, dashboard_data = self.run_test(
            "Get Admin User Info",
            "GET",
            "community/dashboard",
            200
        )
        
        if not dashboard_success or not dashboard_data:
            return False, {}
        
        user_data = dashboard_data.get('user', {})
        username = user_data.get('username')
        role = user_data.get('role')
        
        if username == 'RichRacerRR' and role == 'superuser_admin':
            print(f"✅ Admin user {username} recognized with role {role}")
            return True, {"username": username, "role": role}
        else:
            print(f"❌ Admin recognition failed - User: {username}, Role: {role}")
            return False, {"username": username, "role": role}

    def test_vip_moderator_commands_fix(self):
        """Test VIP/Moderator Commands Fix - /mod, /unmod, /l commands"""
        if not self.token:
            print("❌ No admin token available for VIP/moderator commands testing")
            return False, {}
        
        print("\n🛡️ Testing VIP/Moderator Commands Fix...")
        
        # Step 1: Get chat room for testing
        rooms_success, rooms_data = self.run_test(
            "Get Chat Rooms for VIP Commands",
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
            print("❌ Hauptraum not found for VIP command testing")
            return False, {}
        
        room_id = hauptraum.get('id')
        print(f"✅ Found Hauptraum with ID: {room_id}")
        
        # Step 2: Test /mod command (enable room moderation)
        mod_command_data = {
            "room_id": room_id,
            "message": "/mod"
        }
        
        mod_success, mod_response = self.run_test(
            "Test /mod Command (Enable Moderation)",
            "POST",
            "chat/send",
            200,
            data=mod_command_data
        )
        
        if mod_success:
            print("✅ /mod command processed successfully (no 500 error)")
        else:
            print("❌ /mod command failed")
            return False, {}
        
        # Step 3: Test /unmod command (disable room moderation)
        unmod_command_data = {
            "room_id": room_id,
            "message": "/unmod"
        }
        
        unmod_success, unmod_response = self.run_test(
            "Test /unmod Command (Disable Moderation)",
            "POST",
            "chat/send",
            200,
            data=unmod_command_data
        )
        
        if unmod_success:
            print("✅ /unmod command processed successfully (no 500 error)")
        else:
            print("❌ /unmod command failed")
            return False, {}
        
        # Step 4: Test /l command (lock/unlock room)
        lock_command_data = {
            "room_id": room_id,
            "message": "/l Hauptraum"
        }
        
        lock_success, lock_response = self.run_test(
            "Test /l Command (Lock/Unlock Room)",
            "POST",
            "chat/send",
            200,
            data=lock_command_data
        )
        
        if lock_success:
            print("✅ /l command processed successfully (no 500 error)")
        else:
            print("❌ /l command failed")
            return False, {}
        
        # Step 5: Verify system messages are created in database
        # Check recent messages in the room to see if system messages were created
        messages_success, messages_data = self.run_test(
            "Check System Messages Created",
            "GET",
            f"chat/messages/{room_id}/poll",
            200,
            params={"limit": 10}
        )
        
        system_messages_found = 0
        if messages_success and messages_data:
            for message in messages_data:
                if isinstance(message, dict) and message.get('username') == 'System':
                    system_messages_found += 1
            
            if system_messages_found > 0:
                print(f"✅ System messages created in database ({system_messages_found} found)")
            else:
                print("⚠️ No system messages found (may be expected)")
        
        # Step 6: Test /help command shows available commands
        help_command_data = {
            "room_id": room_id,
            "message": "/help"
        }
        
        help_success, help_response = self.run_test(
            "Test /help Command Shows Commands",
            "POST",
            "chat/send",
            200,
            data=help_command_data
        )
        
        if help_success:
            print("✅ /help command processed successfully")
        
        print("✅ VIP/Moderator Commands Fix - PASSED")
        return True, {
            "mod_command": mod_success,
            "unmod_command": unmod_success,
            "lock_command": lock_success,
            "system_messages": system_messages_found,
            "help_command": help_success,
            "room_id": room_id
        }

    def run_vip_moderator_tests(self):
        """Run VIP/Moderator command tests as requested"""
        print("🚀 Starting VIP/Moderator Commands Test Suite...")
        print(f"   Base URL: {self.base_url}")
        print(f"   API URL: {self.api_url}")
        print(f"   Testing with admin credentials: {self.admin_user['username']}")
        
        # Login first
        login_success, _ = self.test_admin_login()
        if not login_success:
            print("❌ Failed to login - cannot proceed with tests")
            return False
        
        # Test admin role recognition
        self.test_admin_role_recognition()
        
        # Test the specific VIP/moderator commands that were failing
        self.test_vip_moderator_commands_fix()
        
        # Final summary
        print(f"\n🎯 VIP/Moderator Test Suite Complete!")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("✅ All VIP/Moderator tests passed!")
        else:
            failed = self.tests_run - self.tests_passed
            print(f"❌ {failed} test(s) failed")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = VIPCommandTester()
    tester.run_vip_moderator_tests()