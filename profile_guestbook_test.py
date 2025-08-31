#!/usr/bin/env python3
"""
Comprehensive test for Profile & Guestbook APIs
"""
import requests
import sys
import json
import time
from datetime import datetime

class ProfileGuestbookTester:
    def __init__(self, base_url="https://chat-nexus-9.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.user_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_user = {"username": "RichRacerRR", "password": "admin123"}
        self.test_user = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, params=None, token=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        # Use specific token if provided, otherwise use admin token
        if token:
            test_headers['Authorization'] = f'Bearer {token}'
        elif self.admin_token:
            test_headers['Authorization'] = f'Bearer {self.admin_token}'
        
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

    def setup_test_users(self):
        """Setup admin and test user tokens"""
        print("🔧 Setting up test users...")
        
        # Login as admin
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=self.admin_user
        )
        
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   🔑 Admin token obtained")
        else:
            print("❌ Failed to get admin token")
            return False
        
        # Create a test user
        self.test_user = {
            "username": f"profiletest_{int(time.time())}",
            "email": f"profiletest_{int(time.time())}@richcomm.de",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "Create Test User",
            "POST",
            "auth/register",
            200,
            data=self.test_user
        )
        
        if not success:
            return False
        
        # Login as test user
        success, response = self.run_test(
            "Test User Login",
            "POST",
            "auth/login",
            200,
            data={"username": self.test_user["username"], "password": self.test_user["password"]}
        )
        
        if success and 'access_token' in response:
            self.user_token = response['access_token']
            print(f"   🔑 Test user token obtained")
            return True
        else:
            print("❌ Failed to get test user token")
            return False

    def test_profile_apis(self):
        """Test Profile APIs"""
        print("\n" + "="*50)
        print("🧑‍💼 TESTING PROFILE APIs")
        print("="*50)
        
        # Test 1: Get admin profile (public access)
        success, admin_profile = self.run_test(
            "Get Admin Profile (Public)",
            "GET",
            f"users/{self.admin_user['username']}/profile",
            200,
            token=None  # No token needed for public profile
        )
        
        if not success:
            return False
        
        # Test 2: Get test user profile
        success, user_profile = self.run_test(
            "Get Test User Profile",
            "GET",
            f"users/{self.test_user['username']}/profile",
            200
        )
        
        if not success:
            return False
        
        # Test 3: Update own profile (as test user)
        profile_update = {
            "bio": "This is my test bio for automated testing",
            "location": "Test City, Germany",
            "website": "https://test-website.example.com"
        }
        
        success, _ = self.run_test(
            "Update Own Profile",
            "PUT",
            "users/profile",
            200,
            data=profile_update,
            token=self.user_token
        )
        
        if not success:
            return False
        
        # Test 4: Verify profile update
        success, updated_profile = self.run_test(
            "Verify Profile Update",
            "GET",
            f"users/{self.test_user['username']}/profile",
            200
        )
        
        if success:
            if (updated_profile.get('bio') == profile_update['bio'] and
                updated_profile.get('location') == profile_update['location'] and
                updated_profile.get('website') == profile_update['website']):
                print("✅ Profile update verification passed")
            else:
                print("❌ Profile update verification failed")
                return False
        
        # Test 5: Search users
        success, search_results = self.run_test(
            "Search Users",
            "GET",
            "users/search",
            200,
            params={"query": self.test_user['username'][:5]}
        )
        
        if success:
            found_user = any(user['username'] == self.test_user['username'] for user in search_results)
            if found_user:
                print("✅ User search verification passed")
            else:
                print("❌ User search verification failed - user not found in results")
                return False
        
        return True

    def test_guestbook_apis(self):
        """Test Guestbook APIs"""
        print("\n" + "="*50)
        print("📖 TESTING GUESTBOOK APIs")
        print("="*50)
        
        # Test 1: Get guestbook entries (should be empty initially)
        success, guestbook_entries = self.run_test(
            "Get Initial Guestbook Entries",
            "GET",
            f"users/{self.test_user['username']}/guestbook",
            200
        )
        
        if not success:
            return False
        
        if len(guestbook_entries) == 0:
            print("✅ Initial guestbook is empty as expected")
        else:
            print(f"⚠️  Guestbook has {len(guestbook_entries)} entries (unexpected)")
        
        # Test 2: Admin writes in test user's guestbook
        guestbook_message = {
            "message": "Welcome to RichComm! This is a test message from admin."
        }
        
        success, entry_response = self.run_test(
            "Admin Writes Guestbook Entry",
            "POST",
            f"users/{self.test_user['username']}/guestbook",
            200,
            data=guestbook_message,
            token=self.admin_token
        )
        
        if not success:
            return False
        
        entry_id = entry_response.get('id')
        if not entry_id:
            print("❌ No entry ID returned from guestbook creation")
            return False
        
        # Test 3: Verify guestbook entry was created
        success, updated_guestbook = self.run_test(
            "Verify Guestbook Entry Created",
            "GET",
            f"users/{self.test_user['username']}/guestbook",
            200
        )
        
        if success:
            if len(updated_guestbook) == 1 and updated_guestbook[0]['message'] == guestbook_message['message']:
                print("✅ Guestbook entry creation verified")
            else:
                print("❌ Guestbook entry creation verification failed")
                return False
        
        # Test 4: Test user tries to write in own guestbook (should fail)
        success, _ = self.run_test(
            "User Tries to Write in Own Guestbook",
            "POST",
            f"users/{self.test_user['username']}/guestbook",
            400,  # Should fail
            data={"message": "Trying to write in my own guestbook"},
            token=self.user_token
        )
        
        if success:
            print("✅ Correctly prevented user from writing in own guestbook")
        else:
            print("❌ Should have prevented user from writing in own guestbook")
            return False
        
        # Test 5: Test user deletes guestbook entry (as owner)
        success, _ = self.run_test(
            "User Deletes Guestbook Entry",
            "DELETE",
            f"users/guestbook/{entry_id}",
            200,
            token=self.user_token
        )
        
        if not success:
            return False
        
        # Test 6: Verify entry was deleted
        success, final_guestbook = self.run_test(
            "Verify Guestbook Entry Deleted",
            "GET",
            f"users/{self.test_user['username']}/guestbook",
            200
        )
        
        if success:
            if len(final_guestbook) == 0:
                print("✅ Guestbook entry deletion verified")
            else:
                print("❌ Guestbook entry deletion verification failed")
                return False
        
        # Test 7: Toggle guestbook settings
        success, _ = self.run_test(
            "Close Guestbook",
            "PUT",
            "users/guestbook/settings",
            200,
            params={"guestbook_open": "false"},
            token=self.user_token
        )
        
        if not success:
            return False
        
        # Test 8: Try to access closed guestbook
        success, _ = self.run_test(
            "Access Closed Guestbook",
            "GET",
            f"users/{self.test_user['username']}/guestbook",
            403,  # Should be forbidden
            token=self.admin_token
        )
        
        if success:
            print("✅ Correctly blocked access to closed guestbook")
        else:
            print("❌ Should have blocked access to closed guestbook")
            return False
        
        # Test 9: Reopen guestbook
        success, _ = self.run_test(
            "Reopen Guestbook",
            "PUT",
            "users/guestbook/settings",
            200,
            params={"guestbook_open": "true"},
            token=self.user_token
        )
        
        return success

    def test_error_cases(self):
        """Test error cases and edge conditions"""
        print("\n" + "="*50)
        print("⚠️  TESTING ERROR CASES")
        print("="*50)
        
        # Test 1: Access non-existent user profile
        success, _ = self.run_test(
            "Access Non-existent User Profile",
            "GET",
            "users/nonexistentuser123/profile",
            404
        )
        
        if not success:
            return False
        
        # Test 2: Access non-existent user guestbook
        success, _ = self.run_test(
            "Access Non-existent User Guestbook",
            "GET",
            "users/nonexistentuser123/guestbook",
            404
        )
        
        if not success:
            return False
        
        # Test 3: Delete non-existent guestbook entry
        success, _ = self.run_test(
            "Delete Non-existent Guestbook Entry",
            "DELETE",
            "users/guestbook/nonexistent-id-123",
            404,
            token=self.user_token
        )
        
        if not success:
            return False
        
        # Test 4: Search with too short query
        success, short_search = self.run_test(
            "Search with Short Query",
            "GET",
            "users/search",
            200,
            params={"query": "a"}  # Only 1 character
        )
        
        if success:
            if len(short_search) == 0:
                print("✅ Correctly returned empty results for short query")
            else:
                print("❌ Should return empty results for short query")
                return False
        
        return True

def main():
    print("🚀 Starting Profile & Guestbook API Tests")
    print("=" * 60)
    
    tester = ProfileGuestbookTester()
    
    # Setup test users
    if not tester.setup_test_users():
        print("❌ Failed to setup test users")
        return 1
    
    # Run all test suites
    test_suites = [
        ("Profile APIs", tester.test_profile_apis),
        ("Guestbook APIs", tester.test_guestbook_apis),
        ("Error Cases", tester.test_error_cases),
    ]
    
    all_passed = True
    for suite_name, test_func in test_suites:
        try:
            if not test_func():
                print(f"❌ {suite_name} test suite failed")
                all_passed = False
        except Exception as e:
            print(f"❌ {suite_name} test suite failed with exception: {str(e)}")
            all_passed = False
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if all_passed and tester.tests_passed == tester.tests_run:
        print("🎉 All Profile & Guestbook tests passed!")
        return 0
    else:
        print(f"⚠️  Some tests failed. Check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())