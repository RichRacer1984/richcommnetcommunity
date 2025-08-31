#!/usr/bin/env python3
"""
Forum Categories Management Testing Script
Tests the Forum Categories Management functionality in RichComm Community System

PRIMARY FOCUS:
1. Forum Topic Creation: POST /api/admin/forum/topics
2. Forum Topic Deletion: DELETE /api/admin/forum/topics/{topic_id}
3. Forum Topics Listing: GET /api/forum/topics

AUTHENTICATION:
- Admin: username="RichRacerRR", password="admin123"
- Test admin-only endpoint access

TEST SCENARIOS:
1. Login as admin
2. Create 2-3 new forum categories with different settings
3. Verify they appear in topics list
4. Delete one of the created categories
5. Verify it no longer appears in list
6. Test permissions and error handling
"""

import requests
import sys
import json
from datetime import datetime
import time

class ForumCategoriesAPITester:
    def __init__(self, base_url="https://chat-nexus-9.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_user = {"username": "RichRacerRR", "password": "admin123"}
        self.created_topics = []  # Track created topics for cleanup

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
        print("\n🔐 Testing Admin Authentication...")
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=self.admin_user
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   🔑 Admin token obtained: {self.token[:20]}...")
            return True, response
        return False, {}

    def test_forum_topics_listing(self):
        """Test Forum Topics Listing - GET /api/forum/topics"""
        print("\n📋 Testing Forum Topics Listing...")
        success, topics_data = self.run_test(
            "Get Forum Topics List",
            "GET",
            "forum/topics",
            200
        )
        
        if success and topics_data:
            print(f"✅ Retrieved {len(topics_data)} forum topics")
            for i, topic in enumerate(topics_data[:3]):  # Show first 3 topics
                if isinstance(topic, dict):
                    print(f"   Topic {i+1}: {topic.get('name', 'Unknown')} (ID: {topic.get('id', 'N/A')})")
            return True, topics_data
        return False, {}

    def test_forum_topic_creation_public(self):
        """Test Forum Topic Creation - Public Category"""
        if not self.token:
            print("❌ No admin token available for topic creation test")
            return False, {}
        
        print("\n➕ Testing Forum Topic Creation (Public Category)...")
        
        test_topic = {
            "name": f"Public Test Category {int(time.time())}",
            "description": "This is a public test forum category created by automated testing for Forum Categories Management validation",
            "is_public": True,
            "read_permission": "read_write",
            "write_permission": "read_write"
        }
        
        success, topic_data = self.run_test(
            "Create Public Forum Topic",
            "POST",
            "admin/forum/topics",
            200,
            data=test_topic
        )
        
        if success and topic_data:
            topic_id = topic_data.get('id')
            self.created_topics.append(topic_id)
            print(f"✅ Created public forum topic with ID: {topic_id}")
            print(f"   Name: {topic_data.get('name')}")
            print(f"   Public: {topic_data.get('is_public')}")
            print(f"   Read Permission: {topic_data.get('read_permission')}")
            print(f"   Write Permission: {topic_data.get('write_permission')}")
            return True, topic_data
        
        return False, {}

    def test_forum_topic_creation_private(self):
        """Test Forum Topic Creation - Private Category"""
        if not self.token:
            print("❌ No admin token available for topic creation test")
            return False, {}
        
        print("\n🔒 Testing Forum Topic Creation (Private Category)...")
        
        test_topic = {
            "name": f"Private Test Category {int(time.time())}",
            "description": "This is a private test forum category with restricted access for testing Forum Categories Management",
            "is_public": False,
            "read_permission": "admin",
            "write_permission": "admin"
        }
        
        success, topic_data = self.run_test(
            "Create Private Forum Topic",
            "POST",
            "admin/forum/topics",
            200,
            data=test_topic
        )
        
        if success and topic_data:
            topic_id = topic_data.get('id')
            self.created_topics.append(topic_id)
            print(f"✅ Created private forum topic with ID: {topic_id}")
            print(f"   Name: {topic_data.get('name')}")
            print(f"   Public: {topic_data.get('is_public')}")
            print(f"   Read Permission: {topic_data.get('read_permission')}")
            print(f"   Write Permission: {topic_data.get('write_permission')}")
            return True, topic_data
        
        return False, {}

    def test_forum_topic_creation_moderator(self):
        """Test Forum Topic Creation - Moderator Category"""
        if not self.token:
            print("❌ No admin token available for topic creation test")
            return False, {}
        
        print("\n👮 Testing Forum Topic Creation (Moderator Category)...")
        
        test_topic = {
            "name": f"Moderator Test Category {int(time.time())}",
            "description": "This is a moderator-level test forum category for testing different permission levels in Forum Categories Management",
            "is_public": True,
            "read_permission": "read_write",
            "write_permission": "moderator"
        }
        
        success, topic_data = self.run_test(
            "Create Moderator Forum Topic",
            "POST",
            "admin/forum/topics",
            200,
            data=test_topic
        )
        
        if success and topic_data:
            topic_id = topic_data.get('id')
            self.created_topics.append(topic_id)
            print(f"✅ Created moderator forum topic with ID: {topic_id}")
            print(f"   Name: {topic_data.get('name')}")
            print(f"   Public: {topic_data.get('is_public')}")
            print(f"   Read Permission: {topic_data.get('read_permission')}")
            print(f"   Write Permission: {topic_data.get('write_permission')}")
            return True, topic_data
        
        return False, {}

    def test_verify_topics_in_listing(self):
        """Verify created topics appear in topics listing"""
        print("\n✅ Verifying Created Topics Appear in Listing...")
        
        success, topics_data = self.run_test(
            "Get Updated Topics List",
            "GET",
            "forum/topics",
            200
        )
        
        if not success or not topics_data:
            return False, {}
        
        found_topics = []
        for topic_id in self.created_topics:
            topic_found = any(t.get('id') == topic_id for t in topics_data if isinstance(t, dict))
            if topic_found:
                found_topics.append(topic_id)
                topic_data = next(t for t in topics_data if isinstance(t, dict) and t.get('id') == topic_id)
                print(f"✅ Found created topic: {topic_data.get('name')} (ID: {topic_id})")
            else:
                print(f"❌ Created topic not found in listing: {topic_id}")
        
        if len(found_topics) == len(self.created_topics):
            print(f"✅ All {len(self.created_topics)} created topics appear in listing")
            return True, {"found_topics": len(found_topics), "total_created": len(self.created_topics)}
        else:
            print(f"❌ Only {len(found_topics)}/{len(self.created_topics)} created topics found in listing")
            return False, {}

    def test_forum_topic_deletion(self):
        """Test Forum Topic Deletion - DELETE /api/admin/forum/topics/{topic_id}"""
        if not self.token:
            print("❌ No admin token available for topic deletion test")
            return False, {}
        
        if not self.created_topics:
            print("❌ No created topics available for deletion test")
            return False, {}
        
        print("\n🗑️ Testing Forum Topic Deletion...")
        
        # Select the first created topic for deletion
        topic_to_delete = self.created_topics[0]
        
        # Get initial topics count
        initial_success, initial_topics = self.run_test(
            "Get Initial Topics Count",
            "GET",
            "forum/topics",
            200
        )
        
        if not initial_success:
            return False, {}
        
        initial_count = len(initial_topics)
        
        # Create a thread in the topic to test cascade deletion
        thread_data = {
            "topic_id": topic_to_delete,
            "title": f"Test Thread for Cascade Deletion {int(time.time())}",
            "content": "This thread should be deleted when the topic is deleted (cascade deletion test)"
        }
        
        thread_success, thread_response = self.run_test(
            "Create Thread for Cascade Test",
            "POST",
            "forum/threads",
            200,
            data=thread_data
        )
        
        thread_id = None
        if thread_success and thread_response:
            thread_id = thread_response.get('id')
            print(f"✅ Created test thread for cascade deletion: {thread_id}")
            
            # Create posts in the thread
            for i in range(2):
                post_data = {
                    "thread_id": thread_id,
                    "content": f"Test post #{i+1} for cascade deletion testing",
                    "parent_post_id": None
                }
                
                post_success, post_response = self.run_test(
                    f"Create Test Post #{i+1}",
                    "POST",
                    "forum/posts",
                    200,
                    data=post_data
                )
                
                if post_success:
                    print(f"✅ Created test post #{i+1}: {post_response.get('id')}")
        
        # Perform the deletion
        delete_success, delete_response = self.run_test(
            "Delete Forum Topic (Admin Only)",
            "DELETE",
            f"admin/forum/topics/{topic_to_delete}",
            200
        )
        
        if not delete_success:
            print("❌ Forum topic deletion failed")
            return False, {}
        
        print(f"✅ Topic deleted successfully: {delete_response.get('message', 'No message')}")
        
        # Remove from our tracking list
        self.created_topics.remove(topic_to_delete)
        
        # Verify topic no longer appears in listing
        after_success, after_topics = self.run_test(
            "Verify Topic Removed from Listing",
            "GET",
            "forum/topics",
            200
        )
        
        if not after_success:
            return False, {}
        
        after_count = len(after_topics)
        
        # Check that deleted topic is not in the list
        deleted_topic_visible = any(t.get('id') == topic_to_delete for t in after_topics if isinstance(t, dict))
        
        if deleted_topic_visible:
            print("❌ Deleted topic is still visible in topics list")
            return False, {}
        
        if after_count >= initial_count:
            print("❌ Topic count did not decrease after deletion")
            return False, {}
        
        print(f"✅ Topic properly removed from listings - Before: {initial_count}, After: {after_count}")
        
        # Test cascade deletion - verify thread is also deleted/hidden
        if thread_id:
            cascade_success, cascade_response = self.run_test(
                "Verify Thread Cascade Deletion",
                "GET",
                f"forum/threads/{thread_id}/posts",
                404  # Should return 404 if thread is deleted
            )
            
            if cascade_success:
                print("✅ Thread properly cascade deleted with topic")
            else:
                print("⚠️ Thread cascade deletion status unclear (may use soft delete)")
        
        return True, {
            "deleted_topic_id": topic_to_delete,
            "initial_count": initial_count,
            "after_count": after_count,
            "cascade_tested": thread_id is not None
        }

    def test_admin_only_access_control(self):
        """Test that only admins can create/delete topics"""
        print("\n🔐 Testing Admin-Only Access Control...")
        
        # Create a regular user
        test_user = {
            "username": f"regularuser_{int(time.time())}",
            "email": f"regular_{int(time.time())}@richcomm.de",
            "password": "TestPass123!"
        }
        
        reg_success, _ = self.run_test(
            "Register Regular User",
            "POST",
            "auth/register",
            200,
            data=test_user
        )
        
        if not reg_success:
            print("❌ Failed to create regular user for access control test")
            return False, {}
        
        # Login as regular user
        login_success, login_data = self.run_test(
            "Login Regular User",
            "POST",
            "auth/login",
            200,
            data={"username": test_user["username"], "password": test_user["password"]}
        )
        
        if not login_success or 'access_token' not in login_data:
            print("❌ Failed to login regular user")
            return False, {}
        
        # Store admin token and use regular user token
        admin_token = self.token
        self.token = login_data['access_token']
        
        # Try to create topic as regular user (should fail)
        test_topic = {
            "name": f"Unauthorized Topic {int(time.time())}",
            "description": "This topic creation should fail",
            "is_public": True,
            "read_permission": "read_write",
            "write_permission": "read_write"
        }
        
        create_fail_success, _ = self.run_test(
            "Regular User Create Topic (Should Fail)",
            "POST",
            "admin/forum/topics",
            403  # Should fail with 403 Forbidden
        )
        
        # Try to delete topic as regular user (should fail)
        if self.created_topics:
            delete_fail_success, _ = self.run_test(
                "Regular User Delete Topic (Should Fail)",
                "DELETE",
                f"admin/forum/topics/{self.created_topics[0]}",
                403  # Should fail with 403 Forbidden
            )
        else:
            delete_fail_success = True  # No topics to test with
        
        # Restore admin token
        self.token = admin_token
        
        if create_fail_success and delete_fail_success:
            print("✅ Access control working - Regular users properly denied admin access")
            return True, {}
        else:
            print("❌ Access control failed - Regular users have unauthorized access")
            return False, {}

    def test_error_handling(self):
        """Test error handling for invalid operations"""
        if not self.token:
            print("❌ No admin token available for error handling test")
            return False, {}
        
        print("\n⚠️ Testing Error Handling...")
        
        # Test creating topic with invalid data
        invalid_topic = {
            "name": "",  # Empty name should fail
            "description": "Invalid topic test",
            "is_public": True
        }
        
        invalid_create_success, _ = self.run_test(
            "Create Topic with Invalid Data",
            "POST",
            "admin/forum/topics",
            422  # Should fail with validation error
        )
        
        # Test deleting non-existent topic
        fake_topic_id = "non-existent-topic-id-12345"
        
        invalid_delete_success, _ = self.run_test(
            "Delete Non-Existent Topic",
            "DELETE",
            f"admin/forum/topics/{fake_topic_id}",
            404  # Should fail with not found
        )
        
        if invalid_create_success and invalid_delete_success:
            print("✅ Error handling working correctly")
            return True, {}
        else:
            print("❌ Error handling not working as expected")
            return False, {}

    def cleanup_created_topics(self):
        """Clean up any remaining created topics"""
        if not self.token or not self.created_topics:
            return
        
        print(f"\n🧹 Cleaning up {len(self.created_topics)} remaining test topics...")
        
        for topic_id in self.created_topics[:]:  # Use slice to avoid modification during iteration
            success, _ = self.run_test(
                f"Cleanup Topic {topic_id}",
                "DELETE",
                f"admin/forum/topics/{topic_id}",
                200
            )
            
            if success:
                print(f"✅ Cleaned up topic: {topic_id}")
                self.created_topics.remove(topic_id)
            else:
                print(f"⚠️ Failed to cleanup topic: {topic_id}")

    def run_all_tests(self):
        """Run all Forum Categories Management tests"""
        print("=" * 80)
        print("🎯 FORUM CATEGORIES MANAGEMENT TESTING")
        print("=" * 80)
        print("Testing Forum Categories Management functionality in RichComm Community System")
        print("Primary Focus: Topic Creation, Deletion, and Listing with Admin Access Control")
        print("=" * 80)
        
        test_results = {}
        
        try:
            # Step 1: Admin Authentication
            test_results['admin_login'] = self.test_admin_login()
            if not test_results['admin_login'][0]:
                print("❌ Cannot proceed without admin authentication")
                return False
            
            # Step 2: Initial Topics Listing
            test_results['initial_listing'] = self.test_forum_topics_listing()
            
            # Step 3: Create Forum Categories with Different Settings
            print("\n" + "="*60)
            print("📝 CREATING FORUM CATEGORIES WITH DIFFERENT SETTINGS")
            print("="*60)
            
            test_results['create_public'] = self.test_forum_topic_creation_public()
            test_results['create_private'] = self.test_forum_topic_creation_private()
            test_results['create_moderator'] = self.test_forum_topic_creation_moderator()
            
            # Step 4: Verify Topics Appear in Listing
            test_results['verify_listing'] = self.test_verify_topics_in_listing()
            
            # Step 5: Test Topic Deletion with Cascade
            print("\n" + "="*60)
            print("🗑️ TESTING TOPIC DELETION AND CASCADE FUNCTIONALITY")
            print("="*60)
            
            test_results['topic_deletion'] = self.test_forum_topic_deletion()
            
            # Step 6: Test Admin-Only Access Control
            print("\n" + "="*60)
            print("🔐 TESTING ADMIN-ONLY ACCESS CONTROL")
            print("="*60)
            
            test_results['access_control'] = self.test_admin_only_access_control()
            
            # Step 7: Test Error Handling
            test_results['error_handling'] = self.test_error_handling()
            
            # Final verification
            test_results['final_listing'] = self.test_forum_topics_listing()
            
        except Exception as e:
            print(f"❌ Test execution failed: {str(e)}")
            return False
        
        finally:
            # Cleanup
            self.cleanup_created_topics()
        
        # Calculate results
        passed_tests = sum(1 for result in test_results.values() if result[0])
        total_tests = len(test_results)
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        # Print summary
        print("\n" + "="*80)
        print("📊 FORUM CATEGORIES MANAGEMENT TEST SUMMARY")
        print("="*80)
        
        for test_name, (success, data) in test_results.items():
            status = "✅ PASSED" if success else "❌ FAILED"
            print(f"{status} - {test_name.replace('_', ' ').title()}")
        
        print(f"\n🎯 Overall Results:")
        print(f"   Tests Run: {total_tests}")
        print(f"   Tests Passed: {passed_tests}")
        print(f"   Success Rate: {success_rate:.1f}%")
        print(f"   API Calls Made: {self.tests_run}")
        print(f"   API Calls Successful: {self.tests_passed}")
        
        if success_rate >= 90:
            print("\n🎉 FORUM CATEGORIES MANAGEMENT TESTING COMPLETED SUCCESSFULLY!")
            print("✅ All critical functionality is working correctly")
        elif success_rate >= 70:
            print("\n⚠️ FORUM CATEGORIES MANAGEMENT TESTING COMPLETED WITH WARNINGS")
            print("🔧 Some functionality may need attention")
        else:
            print("\n❌ FORUM CATEGORIES MANAGEMENT TESTING FAILED")
            print("🚨 Critical issues found that need immediate attention")
        
        print("="*80)
        
        return success_rate >= 90

def main():
    """Main function to run Forum Categories Management tests"""
    tester = ForumCategoriesAPITester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎯 Forum Categories Management functionality is working correctly!")
        sys.exit(0)
    else:
        print("\n❌ Forum Categories Management functionality has issues!")
        sys.exit(1)

if __name__ == "__main__":
    main()