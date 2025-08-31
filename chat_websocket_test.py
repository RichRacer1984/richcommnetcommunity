#!/usr/bin/env python3
"""
RichComm Chat WebSocket Testing Suite
Tests the complete chat system including WebSocket connections, commands, and real-time messaging.
"""

import asyncio
import websockets
import json
import requests
import sys
import time
from datetime import datetime

class ChatWebSocketTester:
    def __init__(self, base_url="https://chat-nexus-9.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.ws_url = base_url.replace('https://', 'wss://').replace('http://', 'ws://')
        self.admin_token = None
        self.test_user_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_user = {"username": "RichRacerRR", "password": "admin123"}

    def log_test(self, name, success, message=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
            if message:
                print(f"   {message}")
        else:
            print(f"❌ {name}")
            if message:
                print(f"   Error: {message}")

    async def setup_authentication(self):
        """Setup authentication tokens for testing"""
        print("🔐 Setting up authentication...")
        
        # Login as admin
        try:
            response = requests.post(f"{self.api_url}/auth/login", json=self.admin_user, timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data['access_token']
                self.log_test("Admin Login", True, f"Token: {self.admin_token[:20]}...")
            else:
                self.log_test("Admin Login", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Admin Login", False, str(e))
            return False

        # Create and login test user
        test_user = {
            "username": f"chattest_{int(time.time())}",
            "email": f"chattest_{int(time.time())}@richcomm.de",
            "password": "TestPass123!"
        }

        try:
            # Register test user
            reg_response = requests.post(f"{self.api_url}/auth/register", json=test_user, timeout=10)
            if reg_response.status_code == 200:
                # Login test user
                login_response = requests.post(f"{self.api_url}/auth/login", 
                                             json={"username": test_user["username"], "password": test_user["password"]}, 
                                             timeout=10)
                if login_response.status_code == 200:
                    data = login_response.json()
                    self.test_user_token = data['access_token']
                    self.log_test("Test User Setup", True, f"User: {test_user['username']}")
                else:
                    self.log_test("Test User Setup", False, f"Login failed: {login_response.status_code}")
                    return False
            else:
                self.log_test("Test User Setup", False, f"Registration failed: {reg_response.status_code}")
                return False
        except Exception as e:
            self.log_test("Test User Setup", False, str(e))
            return False

        return True

    async def test_chat_rooms_api(self):
        """Test chat rooms REST API"""
        print("\n🏠 Testing Chat Rooms API...")
        
        try:
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            response = requests.get(f"{self.api_url}/chat/rooms", headers=headers, timeout=10)
            
            if response.status_code == 200:
                rooms = response.json()
                expected_rooms = ['Hauptraum', 'Lounge', 'Gaming', 'Musik', 'Exil']
                room_names = [room.get('name') for room in rooms]
                
                missing_rooms = [room for room in expected_rooms if room not in room_names]
                if missing_rooms:
                    self.log_test("Chat Rooms API", False, f"Missing rooms: {missing_rooms}")
                else:
                    self.log_test("Chat Rooms API", True, f"Found {len(rooms)} rooms: {room_names}")
                    return rooms
            else:
                self.log_test("Chat Rooms API", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Chat Rooms API", False, str(e))
        
        return []

    async def test_websocket_connection(self, room_id, token, username="TestUser"):
        """Test WebSocket connection to a chat room"""
        print(f"\n🔌 Testing WebSocket Connection to room {room_id}...")
        
        try:
            ws_url = f"{self.ws_url}/ws/chat/{room_id}?token={token}"
            
            async with websockets.connect(ws_url) as websocket:
                self.log_test("WebSocket Connection", True, f"Connected to room {room_id}")
                
                # Wait for welcome message
                try:
                    welcome_msg = await asyncio.wait_for(websocket.recv(), timeout=5)
                    welcome_data = json.loads(welcome_msg)
                    
                    if welcome_data.get('type') == 'room_info':
                        self.log_test("Welcome Message", True, f"Room: {welcome_data.get('room_name')}")
                    else:
                        self.log_test("Welcome Message", False, f"Unexpected message type: {welcome_data.get('type')}")
                    
                    return websocket, welcome_data
                except asyncio.TimeoutError:
                    self.log_test("Welcome Message", False, "Timeout waiting for welcome message")
                    return websocket, None
                    
        except Exception as e:
            self.log_test("WebSocket Connection", False, str(e))
            return None, None

    async def test_chat_message_sending(self, websocket, message="Hello from automated test!"):
        """Test sending a chat message"""
        print(f"\n💬 Testing Message Sending...")
        
        try:
            # Send message
            message_data = {"message": message}
            await websocket.send(json.dumps(message_data))
            self.log_test("Send Message", True, f"Sent: {message}")
            
            # Wait for message echo/broadcast
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5)
                response_data = json.loads(response)
                
                if response_data.get('type') == 'message' and response_data.get('message') == message:
                    self.log_test("Message Echo", True, f"Received echo: {response_data.get('message')}")
                    return True
                else:
                    self.log_test("Message Echo", False, f"Unexpected response: {response_data}")
                    return False
            except asyncio.TimeoutError:
                self.log_test("Message Echo", False, "Timeout waiting for message echo")
                return False
                
        except Exception as e:
            self.log_test("Send Message", False, str(e))
            return False

    async def test_chat_commands(self, websocket):
        """Test various chat commands"""
        print(f"\n⚡ Testing Chat Commands...")
        
        commands_to_test = [
            ("/help", "help command"),
            ("/w", "who command - list users in room"),
            ("/wc", "who chat command - list all rooms"),
        ]
        
        for command, description in commands_to_test:
            try:
                # Send command
                command_data = {"message": command}
                await websocket.send(json.dumps(command_data))
                
                # Wait for response
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=5)
                    response_data = json.loads(response)
                    
                    if response_data.get('type') in ['info', 'success']:
                        self.log_test(f"Command {command}", True, f"Response: {response_data.get('message', '')[:100]}...")
                    else:
                        self.log_test(f"Command {command}", False, f"Unexpected response type: {response_data.get('type')}")
                        
                except asyncio.TimeoutError:
                    self.log_test(f"Command {command}", False, "Timeout waiting for command response")
                    
            except Exception as e:
                self.log_test(f"Command {command}", False, str(e))
            
            # Small delay between commands
            await asyncio.sleep(0.5)

    async def test_admin_commands(self, websocket):
        """Test admin-specific chat commands"""
        print(f"\n👑 Testing Admin Commands...")
        
        admin_commands = [
            ("/sepa TestPrivateRoom", "create private room"),
        ]
        
        for command, description in admin_commands:
            try:
                # Send command
                command_data = {"message": command}
                await websocket.send(json.dumps(command_data))
                
                # Wait for response
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=5)
                    response_data = json.loads(response)
                    
                    if response_data.get('type') in ['success', 'info']:
                        self.log_test(f"Admin Command {command.split()[0]}", True, f"Response: {response_data.get('message', '')[:100]}...")
                    else:
                        self.log_test(f"Admin Command {command.split()[0]}", False, f"Response: {response_data.get('message', '')}")
                        
                except asyncio.TimeoutError:
                    self.log_test(f"Admin Command {command.split()[0]}", False, "Timeout waiting for command response")
                    
            except Exception as e:
                self.log_test(f"Admin Command {command.split()[0]}", False, str(e))
            
            await asyncio.sleep(0.5)

    async def test_multi_user_chat(self, rooms):
        """Test multi-user chat scenario"""
        print(f"\n👥 Testing Multi-User Chat...")
        
        if not rooms:
            self.log_test("Multi-User Chat", False, "No rooms available")
            return
        
        hauptraum = None
        for room in rooms:
            if room.get('name') == 'Hauptraum':
                hauptraum = room
                break
        
        if not hauptraum:
            self.log_test("Multi-User Chat", False, "Hauptraum not found")
            return
        
        try:
            # Connect admin user
            admin_ws, admin_welcome = await self.test_websocket_connection(
                hauptraum['id'], self.admin_token, "RichRacerRR"
            )
            
            if not admin_ws:
                self.log_test("Multi-User Chat", False, "Admin connection failed")
                return
            
            # Connect test user
            test_ws, test_welcome = await self.test_websocket_connection(
                hauptraum['id'], self.test_user_token, "TestUser"
            )
            
            if not test_ws:
                self.log_test("Multi-User Chat", False, "Test user connection failed")
                await admin_ws.close()
                return
            
            # Admin sends message
            await admin_ws.send(json.dumps({"message": "Hello from Admin!"}))
            
            # Test user should receive admin's message
            try:
                test_msg = await asyncio.wait_for(test_ws.recv(), timeout=5)
                test_data = json.loads(test_msg)
                
                if test_data.get('type') == 'message' and 'Admin' in test_data.get('message', ''):
                    self.log_test("Multi-User Message Broadcast", True, "Test user received admin message")
                else:
                    self.log_test("Multi-User Message Broadcast", False, f"Unexpected message: {test_data}")
            except asyncio.TimeoutError:
                self.log_test("Multi-User Message Broadcast", False, "Test user didn't receive admin message")
            
            # Test user sends message
            await test_ws.send(json.dumps({"message": "Hello from Test User!"}))
            
            # Admin should receive test user's message
            try:
                admin_msg = await asyncio.wait_for(admin_ws.recv(), timeout=5)
                admin_data = json.loads(admin_msg)
                
                if admin_data.get('type') == 'message' and 'Test User' in admin_data.get('message', ''):
                    self.log_test("Multi-User Message Reception", True, "Admin received test user message")
                else:
                    self.log_test("Multi-User Message Reception", False, f"Unexpected message: {admin_data}")
            except asyncio.TimeoutError:
                self.log_test("Multi-User Message Reception", False, "Admin didn't receive test user message")
            
            # Clean up connections
            await admin_ws.close()
            await test_ws.close()
            
        except Exception as e:
            self.log_test("Multi-User Chat", False, str(e))

    async def test_room_switching(self, rooms):
        """Test switching between chat rooms"""
        print(f"\n🔄 Testing Room Switching...")
        
        if len(rooms) < 2:
            self.log_test("Room Switching", False, "Need at least 2 rooms for switching test")
            return
        
        room1 = rooms[0]
        room2 = rooms[1]
        
        try:
            # Connect to first room
            ws1, welcome1 = await self.test_websocket_connection(
                room1['id'], self.admin_token, "RichRacerRR"
            )
            
            if not ws1:
                self.log_test("Room Switching", False, "Failed to connect to first room")
                return
            
            await ws1.close()
            
            # Connect to second room
            ws2, welcome2 = await self.test_websocket_connection(
                room2['id'], self.admin_token, "RichRacerRR"
            )
            
            if not ws2:
                self.log_test("Room Switching", False, "Failed to connect to second room")
                return
            
            self.log_test("Room Switching", True, f"Successfully switched from {room1['name']} to {room2['name']}")
            await ws2.close()
            
        except Exception as e:
            self.log_test("Room Switching", False, str(e))

    async def test_connection_resilience(self, rooms):
        """Test connection resilience and error handling"""
        print(f"\n🛡️ Testing Connection Resilience...")
        
        if not rooms:
            self.log_test("Connection Resilience", False, "No rooms available")
            return
        
        room = rooms[0]
        
        # Test invalid token
        try:
            ws_url = f"{self.ws_url}/ws/chat/{room['id']}?token=invalid_token"
            
            try:
                async with websockets.connect(ws_url) as websocket:
                    self.log_test("Invalid Token Rejection", False, "Connection should have been rejected")
            except websockets.exceptions.ConnectionClosedError as e:
                if e.code == 1008:  # Policy Violation
                    self.log_test("Invalid Token Rejection", True, "Invalid token properly rejected")
                else:
                    self.log_test("Invalid Token Rejection", False, f"Unexpected close code: {e.code}")
            except Exception as e:
                self.log_test("Invalid Token Rejection", True, f"Connection rejected: {str(e)}")
                
        except Exception as e:
            self.log_test("Invalid Token Rejection", False, str(e))
        
        # Test invalid room ID
        try:
            ws_url = f"{self.ws_url}/ws/chat/invalid_room_id?token={self.admin_token}"
            
            try:
                async with websockets.connect(ws_url) as websocket:
                    self.log_test("Invalid Room Rejection", False, "Connection should have been rejected")
            except websockets.exceptions.ConnectionClosedError as e:
                if e.code == 1008:  # Policy Violation
                    self.log_test("Invalid Room Rejection", True, "Invalid room properly rejected")
                else:
                    self.log_test("Invalid Room Rejection", False, f"Unexpected close code: {e.code}")
            except Exception as e:
                self.log_test("Invalid Room Rejection", True, f"Connection rejected: {str(e)}")
                
        except Exception as e:
            self.log_test("Invalid Room Rejection", False, str(e))

    async def run_all_tests(self):
        """Run all chat WebSocket tests"""
        print("🚀 Starting RichComm Chat WebSocket Tests")
        print("=" * 60)
        
        # Setup authentication
        if not await self.setup_authentication():
            print("❌ Authentication setup failed. Cannot continue with tests.")
            return False
        
        # Test chat rooms API
        rooms = await self.test_chat_rooms_api()
        
        if not rooms:
            print("❌ No chat rooms available. Cannot continue with WebSocket tests.")
            return False
        
        # Find Hauptraum for main tests
        hauptraum = None
        for room in rooms:
            if room.get('name') == 'Hauptraum':
                hauptraum = room
                break
        
        if not hauptraum:
            print("❌ Hauptraum not found. Using first available room.")
            hauptraum = rooms[0]
        
        # Test WebSocket connection
        websocket, welcome_data = await self.test_websocket_connection(
            hauptraum['id'], self.admin_token, "RichRacerRR"
        )
        
        if websocket:
            # Test basic messaging
            await self.test_chat_message_sending(websocket, "Test message from automated testing!")
            
            # Test chat commands
            await self.test_chat_commands(websocket)
            
            # Test admin commands
            await self.test_admin_commands(websocket)
            
            # Close the main connection
            await websocket.close()
        
        # Test multi-user scenarios
        await self.test_multi_user_chat(rooms)
        
        # Test room switching
        await self.test_room_switching(rooms)
        
        # Test connection resilience
        await self.test_connection_resilience(rooms)
        
        # Print results
        print("\n" + "=" * 60)
        print(f"📊 Chat WebSocket Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All chat WebSocket tests passed! Chat system is working correctly.")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed. Check the issues above.")
            return False

def main():
    """Main function to run the chat WebSocket tests"""
    tester = ChatWebSocketTester()
    
    try:
        result = asyncio.run(tester.run_all_tests())
        return 0 if result else 1
    except KeyboardInterrupt:
        print("\n❌ Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n❌ Tests failed with exception: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())