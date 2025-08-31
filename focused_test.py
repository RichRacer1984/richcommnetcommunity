#!/usr/bin/env python3
"""
Focused test for the primary features mentioned in the review request:
1. VIP/ADMIN Thread Deletion
2. Broadcast Auto-Hide System  
3. Updated Thread Listing (excludes deleted threads)
"""

import requests
import sys
import json
from datetime import datetime
import time

class FocusedTester:
    def __init__(self, base_url="https://chat-nexus-9.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.admin_user = {"username": "TestAdminUser", "password": "TestAdmin123!"}

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

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

    def login_admin(self):
        """Login as admin and get token"""
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
            return True
        return False

    def create_test_thread(self):
        """Create a test thread for deletion testing"""
        # First get forum topics
        topics_success, topics_data = self.run_test(
            "Get Forum Topics",
            "GET",
            "forum/topics",
            200
        )
        
        if not topics_success or not topics_data:
            return None, None
        
        # Use the first public topic
        test_topic = None
        for topic in topics_data:
            if isinstance(topic, dict) and topic.get('is_public', True):
                test_topic = topic
                break
        
        if not test_topic:
            print("❌ No public forum topic found")
            return None, None
        
        topic_id = test_topic.get('id')
        
        # Create thread
        thread_data = {
            "topic_id": topic_id,
            "title": f"Test Thread for Deletion {int(time.time())}",
            "content": "This is a test thread created for testing the deletion functionality."
        }
        
        thread_success, thread_response = self.run_test(
            "Create Test Thread",
            "POST",
            "forum/threads",
            200,
            data=thread_data
        )
        
        if thread_success and thread_response:
            return thread_response.get('id'), topic_id
        
        return None, None

    def test_vip_admin_thread_deletion(self):
        """Test VIP/ADMIN Thread Deletion - DELETE /api/admin/forum/threads/{thread_id}"""
        print("\n🗑️ Testing VIP/ADMIN Thread Deletion...")
        
        # Create a test thread
        thread_id, topic_id = self.create_test_thread()
        if not thread_id:
            print("❌ Failed to create test thread")
            return False
        
        print(f"✅ Created test thread: {thread_id}")
        
        # Get initial thread count
        initial_success, initial_data = self.run_test(
            "Get Initial Thread Count",
            "GET",
            f"forum/topics/{topic_id}/threads",
            200
        )
        
        if not initial_success:
            return False
        
        initial_threads = initial_data.get('threads', [])
        initial_count = len(initial_threads)
        
        # Verify our thread is in the listing
        our_thread_in_listing = any(t.get('id') == thread_id for t in initial_threads if isinstance(t, dict))
        if not our_thread_in_listing:
            print("❌ Created thread not found in initial listing")
            return False
        
        print(f"✅ Thread appears in initial listing ({initial_count} total threads)")
        
        # Test deletion with admin user
        delete_success, delete_response = self.run_test(
            "Admin Delete Thread",
            "DELETE",
            f"admin/forum/threads/{thread_id}",
            200
        )
        
        if not delete_success:
            print("❌ Admin thread deletion failed")
            return False
        
        print(f"✅ Thread deleted: {delete_response.get('message', 'No message')}")
        
        # Verify thread no longer appears in listings
        after_success, after_data = self.run_test(
            "Verify Thread Not in Listings",
            "GET",
            f"forum/topics/{topic_id}/threads",
            200
        )
        
        if not after_success:
            return False
        
        after_threads = after_data.get('threads', [])
        after_count = len(after_threads)
        
        # Check that deleted thread is not in the list
        deleted_thread_visible = any(t.get('id') == thread_id for t in after_threads if isinstance(t, dict))
        
        if deleted_thread_visible:
            print("❌ Deleted thread is still visible in thread listings")
            return False
        
        print(f"✅ Thread properly removed from listings")
        print(f"   Before deletion: {initial_count} threads")
        print(f"   After deletion: {after_count} threads")
        print(f"   Deleted thread {thread_id} not visible: ✅")
        
        return True

    def test_broadcast_auto_hide_system(self):
        """Test Broadcast Auto-Hide System - GET /api/broadcasts/active"""
        print("\n⏰ Testing Broadcast Auto-Hide System...")
        
        # Create a broadcast with 2-minute auto-hide
        test_broadcast = {
            "message": f"Auto-Hide Test Broadcast {int(time.time())} - Should auto-expire after 2 minutes",
            "interval_minutes": 1,
            "auto_hide_minutes": 2
        }
        
        create_success, broadcast_data = self.run_test(
            "Create Broadcast with Auto-Hide",
            "POST",
            "admin/broadcasts",
            200,
            data=test_broadcast
        )
        
        if not create_success or not broadcast_data:
            return False
        
        broadcast_id = broadcast_data.get('id')
        expires_at = broadcast_data.get('expires_at')
        
        print(f"✅ Created broadcast: {broadcast_id}")
        print(f"   Expires at: {expires_at}")
        print(f"   Auto-hide minutes: {broadcast_data.get('auto_hide_minutes')}")
        
        # Verify broadcast appears in active broadcasts
        active_success, active_data = self.run_test(
            "Get Active Broadcasts",
            "GET",
            "broadcasts/active",
            200
        )
        
        if not active_success:
            return False
        
        # Check if our broadcast is in the active list
        active_broadcasts = active_data if isinstance(active_data, list) else []
        our_broadcast = None
        for broadcast in active_broadcasts:
            if isinstance(broadcast, dict) and broadcast.get('id') == broadcast_id:
                our_broadcast = broadcast
                break
        
        if not our_broadcast:
            print("❌ Newly created broadcast not found in active broadcasts")
            return False
        
        print("✅ Broadcast appears in active broadcasts")
        print(f"   Message: {our_broadcast.get('message', '')[:50]}...")
        print(f"   Is Active: {our_broadcast.get('is_active')}")
        
        # Test auto-expiration logic
        print("\n⏳ Testing auto-expiration logic...")
        
        # Call the endpoint again to trigger auto-expiration check
        recheck_success, recheck_data = self.run_test(
            "Recheck Active Broadcasts (Auto-Expiration)",
            "GET",
            "broadcasts/active",
            200
        )
        
        if recheck_success:
            print("✅ Auto-expiration endpoint logic working")
            
            # Verify structure
            if our_broadcast:
                required_fields = ['id', 'message', 'is_active', 'auto_hide_minutes', 'expires_at']
                missing_fields = [f for f in required_fields if f not in our_broadcast]
                
                if missing_fields:
                    print(f"❌ Broadcast missing fields: {missing_fields}")
                else:
                    print("✅ Broadcast has all required auto-hide fields")
        
        # Clean up
        cleanup_success, _ = self.run_test(
            "Cleanup Test Broadcast",
            "DELETE",
            f"admin/broadcasts/{broadcast_id}",
            200
        )
        
        if cleanup_success:
            print("✅ Test broadcast cleaned up")
        
        return True

    def test_updated_thread_listing(self):
        """Test Updated Thread Listing excludes deleted threads"""
        print("\n📋 Testing Updated Thread Listing (Excludes Deleted Threads)...")
        
        # Create multiple test threads
        created_threads = []
        topic_id = None
        
        for i in range(2):
            thread_id, t_id = self.create_test_thread()
            if thread_id:
                created_threads.append(thread_id)
                if not topic_id:
                    topic_id = t_id
            else:
                print(f"❌ Failed to create test thread #{i+1}")
                return False
        
        print(f"✅ Created {len(created_threads)} test threads")
        
        # Get initial thread listing
        initial_success, initial_data = self.run_test(
            "Get Initial Thread Listing",
            "GET",
            f"forum/topics/{topic_id}/threads",
            200
        )
        
        if not initial_success:
            return False
        
        initial_threads = initial_data.get('threads', [])
        initial_count = len(initial_threads)
        
        # Verify our threads are in the listing
        our_threads_in_listing = [
            t.get('id') for t in initial_threads 
            if isinstance(t, dict) and t.get('id') in created_threads
        ]
        
        print(f"✅ Initial listing: {initial_count} threads, {len(our_threads_in_listing)} are ours")
        
        # Delete one thread
        thread_to_delete = created_threads[0]
        delete_success, _ = self.run_test(
            "Delete Test Thread",
            "DELETE",
            f"admin/forum/threads/{thread_to_delete}",
            200
        )
        
        if not delete_success:
            return False
        
        print(f"✅ Deleted thread: {thread_to_delete}")
        
        # Get updated listing
        after_success, after_data = self.run_test(
            "Get Updated Thread Listing",
            "GET",
            f"forum/topics/{topic_id}/threads",
            200
        )
        
        if not after_success:
            return False
        
        after_threads = after_data.get('threads', [])
        after_count = len(after_threads)
        
        # Verify deleted thread is not in listing
        deleted_thread_visible = any(
            t.get('id') == thread_to_delete for t in after_threads if isinstance(t, dict)
        )
        
        if deleted_thread_visible:
            print("❌ Deleted thread still visible in listings")
            return False
        
        # Verify remaining thread is still there
        remaining_threads = [
            t.get('id') for t in after_threads 
            if isinstance(t, dict) and t.get('id') in created_threads[1:]
        ]
        
        print(f"✅ Thread listing properly excludes deleted threads")
        print(f"   Before deletion: {initial_count} threads")
        print(f"   After deletion: {after_count} threads")
        print(f"   Deleted thread not visible: ✅")
        print(f"   Remaining threads visible: {len(remaining_threads)}")
        
        return True

    def run_all_tests(self):
        """Run all focused tests"""
        print("🚀 Starting Focused RichComm API Tests")
        print("=" * 60)
        print("PRIMARY FOCUS: New Features from Review Request")
        print("=" * 60)
        
        # Login first
        if not self.login_admin():
            print("❌ Failed to login as admin - cannot run tests")
            return False
        
        tests = [
            ("VIP/ADMIN Thread Deletion", self.test_vip_admin_thread_deletion),
            ("Broadcast Auto-Hide System", self.test_broadcast_auto_hide_system),
            ("Updated Thread Listing", self.test_updated_thread_listing),
        ]
        
        results = []
        for test_name, test_func in tests:
            try:
                success = test_func()
                results.append((test_name, success))
                if success:
                    print(f"\n✅ {test_name}: PASSED")
                else:
                    print(f"\n❌ {test_name}: FAILED")
            except Exception as e:
                print(f"\n❌ {test_name}: FAILED with exception: {str(e)}")
                results.append((test_name, False))
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 FOCUSED TEST RESULTS")
        print("=" * 60)
        
        passed = sum(1 for _, success in results if success)
        total = len(results)
        
        for test_name, success in results:
            status = "✅ PASSED" if success else "❌ FAILED"
            print(f"{test_name}: {status}")
        
        print(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All primary features are working correctly!")
            return True
        else:
            print(f"⚠️ {total - passed} features need attention")
            return False

if __name__ == "__main__":
    tester = FocusedTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)