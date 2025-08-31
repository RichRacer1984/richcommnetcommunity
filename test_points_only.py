#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend_test import RichCommAPITester

def main():
    print("🏆 Testing Comprehensive Points System Only")
    print("=" * 50)
    
    tester = RichCommAPITester()
    
    # Login as admin first
    print("🔑 Logging in as admin...")
    login_success, login_data = tester.test_admin_login()
    if not login_success:
        print("❌ Failed to login as admin")
        return 1
    
    # Run comprehensive points system test
    print("\n🏆 Running Comprehensive Points System Tests...")
    success, data = tester.test_points_system_comprehensive()
    
    # Print results
    print("\n" + "=" * 50)
    if success:
        print("🎉 All Points System tests passed!")
        print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
        return 0
    else:
        print("⚠️ Some Points System tests failed.")
        print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
        return 1

if __name__ == "__main__":
    sys.exit(main())