from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, WebSocket, WebSocketDisconnect, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Set
import uuid
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
import hashlib
import json
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT and Password settings
SECRET_KEY = os.environ.get('JWT_SECRET', 'richcomm-secret-key-2025')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI(title="RichComm Community API")

# Create a router with the /api prefix for REST APIs
api_router = APIRouter(prefix="/api")

# User roles
class UserRole:
    USER = "user"
    SUPERUSER = "superuser"
    SUPERUSER_VIP = "superuser_vip"
    SUPERUSER_ADMIN = "superuser_admin"
    FORUM_MODERATOR = "forum_moderator"
    BANNED = "banned"  # Gesperrt

# Forum permission levels
class ForumPermission:
    READ_ONLY = "read_only"
    READ_WRITE = "read_write" 
    MODERATOR = "moderator"
    ADMIN = "admin"

# Models
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: EmailStr
    role: str = UserRole.USER
    points: int = 0
    is_online: bool = False
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    joined_date: datetime = Field(default_factory=datetime.utcnow)
    current_room: Optional[str] = None
    is_vip: bool = False
    temp_superuser: bool = False
    temp_superuser_expires: Optional[datetime] = None
    # Profile fields
    bio: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    # Guestbook settings
    guestbook_open: bool = True
    show_profile: bool = True
    # Link fields
    link1_name: Optional[str] = None
    link1_url: Optional[str] = None
    link2_name: Optional[str] = None
    link2_url: Optional[str] = None
    link3_name: Optional[str] = None
    link3_url: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    points: int
    is_online: bool
    last_seen: datetime
    joined_date: datetime
    current_room: Optional[str]
    is_vip: bool
    bio: Optional[str]
    location: Optional[str]  
    website: Optional[str]
    guestbook_open: bool
    show_profile: bool
    # Link fields
    link1_name: Optional[str] = None
    link1_url: Optional[str] = None
    link2_name: Optional[str] = None
    link2_url: Optional[str] = None
    link3_name: Optional[str] = None
    link3_url: Optional[str] = None

class GuestbookEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Owner of the guestbook
    author_id: str  # Who wrote the entry
    author_name: str
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_visible: bool = True
    is_private: bool = False  # Private entries only visible to owner and author

class GuestbookEntryCreate(BaseModel):
    message: str
    is_private: bool = False  # Allow creation of private entries

class UserProfileUpdate(BaseModel):
    bio: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    guestbook_open: Optional[bool] = None
    show_profile: Optional[bool] = None
    # New profile fields
    link1_name: Optional[str] = None
    link1_url: Optional[str] = None
    link2_name: Optional[str] = None
    link2_url: Optional[str] = None
    link3_name: Optional[str] = None
    link3_url: Optional[str] = None

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

# Forum Models
class ForumTopic(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    is_public: bool = True
    read_permission: str = ForumPermission.READ_WRITE  # Default: everyone can read/write
    write_permission: str = ForumPermission.READ_WRITE
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    is_active: bool = True
    thread_count: int = 0
    post_count: int = 0

class ForumTopicCreate(BaseModel):
    name: str
    description: str
    is_public: bool = True
    read_permission: str = ForumPermission.READ_WRITE
    write_permission: str = ForumPermission.READ_WRITE

class ForumThread(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    topic_id: str
    title: str
    author_id: str
    author_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_pinned: bool = False
    is_locked: bool = False
    post_count: int = 1  # Includes the initial post
    last_post_at: datetime = Field(default_factory=datetime.utcnow)
    last_post_author: str = ""

class ForumThreadCreate(BaseModel):
    topic_id: str
    title: str
    content: str  # Initial post content

class ForumPost(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    thread_id: str
    author_id: str
    author_name: str
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    is_edited: bool = False
    parent_post_id: Optional[str] = None  # For nested replies
    is_deleted: bool = False

class ForumPostCreate(BaseModel):
    thread_id: str
    content: str
    parent_post_id: Optional[str] = None

class ForumModerator(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    username: str
    topic_id: str
    assigned_at: datetime = Field(default_factory=datetime.utcnow)
    assigned_by: str
    permissions: List[str] = ["moderate_posts", "lock_threads", "pin_threads", "delete_posts"]

class ForumModeratorAssign(BaseModel):
    user_id: str
    topic_id: str

# Broadcast & Advertisement Models
class BroadcastMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    message: str
    interval_minutes: int = 30  # How often to broadcast
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None  # Made optional to handle old records
    last_broadcast: Optional[datetime] = None
    broadcast_count: int = 0
    auto_hide_minutes: int = 1  # Auto-hide after 1 minute
    expires_at: Optional[datetime] = None  # When this broadcast should auto-expire

class BroadcastMessageCreate(BaseModel):
    message: str
    interval_minutes: int = 30
    auto_hide_minutes: int = 1  # Default 1 minute auto-hide

class Advertisement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    link_url: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True
    display_location: str = "sidebar"  # sidebar, header, footer, popup
    start_date: datetime = Field(default_factory=datetime.utcnow)
    end_date: Optional[datetime] = None
    click_count: int = 0
    view_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str

class AdvertisementCreate(BaseModel):
    title: str
    content: str
    link_url: Optional[str] = None
    image_url: Optional[str] = None
    display_location: str = "sidebar"
    end_date: Optional[datetime] = None

# Points System Models
class PointTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    username: str
    points: int  # Positive for earning, negative for spending
    reason: str
    category: str = "general"  # forum, guestbook, chat, daily, admin, purchase
    reference_id: Optional[str] = None  # ID of related post/message/etc
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None  # Admin who awarded/deducted points
    is_automated: bool = True  # False if manually awarded by admin

class PointTransactionCreate(BaseModel):
    user_id: str
    points: int
    reason: str
    category: str = "admin"
    reference_id: Optional[str] = None

class PointEarningRule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    action: str  # forum_post, forum_thread, guestbook_entry, chat_message, daily_login
    points: int
    description: str
    is_active: bool = True
    max_per_day: Optional[int] = None  # Daily limit for this action
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PointEarningRuleCreate(BaseModel):
    action: str
    points: int
    description: str
    max_per_day: Optional[int] = None

class UserPointsSummary(BaseModel):
    user_id: str
    username: str
    current_points: int
    total_earned: int
    total_spent: int
    today_earned: int
    rank_position: Optional[int] = None
    recent_transactions: List[dict] = []

# Personal Notification System
class PersonalNotification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Recipient user ID
    notification_type: str  # friend_request, guestbook_entry, chat_invitation
    title: str
    message: str
    action_url: Optional[str] = None  # Direct action link
    action_text: Optional[str] = None  # Button text
    sender_id: Optional[str] = None  # Who triggered this notification
    sender_username: Optional[str] = None
    reference_id: Optional[str] = None  # Friend request ID, guestbook entry ID, etc.
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    auto_dismiss: bool = True  # Auto-dismiss after action

class PersonalNotificationCreate(BaseModel):
    user_id: str
    notification_type: str
    title: str
    message: str
    action_url: Optional[str] = None
    action_text: Optional[str] = None
    sender_id: Optional[str] = None
    sender_username: Optional[str] = None
    reference_id: Optional[str] = None
    expires_hours: int = 24  # Expire after 24 hours

# PHASE 5: Social Features Models

# Private Messaging System
class PrivateMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    sender_id: str
    sender_username: str
    recipient_id: str
    recipient_username: str
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    is_read: bool = False
    message_type: str = "text"  # text, image, file, system
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    reply_to_message_id: Optional[str] = None
    is_deleted: bool = False
    edited_at: Optional[datetime] = None

class Conversation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    participants: List[str]  # List of user IDs
    participant_usernames: List[str]  # List of usernames for easy display
    last_message: Optional[str] = None
    last_message_at: datetime = Field(default_factory=datetime.utcnow)
    last_message_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_group: bool = False  # For future group messaging
    unread_counts: dict = {}  # user_id -> unread_count

class MessageCreateRequest(BaseModel):
    recipient_id: str
    message: str
    message_type: str = "text"
    reply_to_message_id: Optional[str] = None

# Friendship System
class FriendRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str
    sender_username: str
    recipient_id: str
    recipient_username: str
    status: str = "pending"  # pending, accepted, declined, blocked
    message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    responded_at: Optional[datetime] = None

class Friendship(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user1_id: str
    user1_username: str
    user2_id: str
    user2_username: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    friendship_level: str = "friend"  # friend, close_friend, best_friend (for future)
    is_mutual: bool = True

class FriendRequestCreate(BaseModel):
    recipient_id: str
    message: Optional[str] = "Möchte mit dir befreundet sein!"

class ActivityFeedItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    username: str
    activity_type: str  # post_created, thread_created, friend_added, points_earned, etc.
    activity_title: str
    activity_description: str
    activity_data: dict = {}  # Additional data like post_id, points_earned, etc.
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    is_public: bool = True
    friends_only: bool = False

# Enhanced Profile System
class ProfileTheme(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    colors: dict  # {primary, secondary, accent, background}
    created_by: str
    is_public: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ProfileCustomization(BaseModel):
    user_id: str
    theme_id: Optional[str] = None
    banner_url: Optional[str] = None
    status_message: Optional[str] = None
    status_emoji: Optional[str] = None
    show_activity_feed: bool = True
    show_friends_list: bool = True
    show_points: bool = True
    custom_colors: Optional[dict] = None  # Override theme colors
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Enhanced Toplist/Leaderboard Models  
class ToplistEntry(BaseModel):
    user_id: str
    username: str
    points: int
    rank: int
    role: str
    is_vip: bool
    total_earned: int
    total_spent: int
    forum_posts: int = 0
    forum_threads: int = 0
    guestbook_entries: int = 0
    chat_messages: int = 0
    days_active: int = 0
    last_activity: datetime
    joined_date: datetime
    
class ToplistFilter(BaseModel):
    time_period: str = "all_time"  # all_time, this_month, this_week, today
    category: str = "all"  # all, forum, chat, guestbook, daily_activity
    limit: int = 100
    user_role: Optional[str] = None  # filter by role
    min_points: Optional[int] = None

class ToplistStats(BaseModel):
    total_users: int
    active_users_today: int
    active_users_week: int
    total_points_distributed: int
    top_earner_today: Optional[dict] = None
    categories: dict = {}
    
# Enhanced User Stats for real-time updates
class OnlineUsersStats(BaseModel):
    total_online: int
    online_users: List[dict]
    online_vips: List[dict]
    online_forum_moderators: List[dict]
    online_admins: List[dict]
    last_updated: datetime = Field(default_factory=datetime.utcnow)

# Chat Models
class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    room_id: str
    user_id: str
    username: str
    message: str
    message_type: str = "normal"  # normal, system, command, private
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    is_command: bool = False
    target_user: Optional[str] = None  # For private messages/whispers
    is_approved: bool = True  # New: For moderation system
    pending_moderation: bool = False  # New: Message awaiting approval
    approved_by: Optional[str] = None  # Admin/VIP who approved
    approved_at: Optional[datetime] = None

class PendingChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    room_id: str
    user_id: str
    username: str
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    user_role: str

class ChatCommand(BaseModel):
    command: str
    args: List[str]
    user_id: str
    username: str
    room_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ChatRoom(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    is_private: bool = False
    is_locked: bool = False
    creator_id: Optional[str] = None
    allowed_users: List[str] = []  # For private rooms
    active_users: Set[str] = set()  # Currently online users
    created_at: datetime = Field(default_factory=datetime.utcnow)
    auto_delete_at: Optional[datetime] = None  # For temporary rooms
    moderated: bool = False  # New: Enable moderation for this room

class UserChatStatus(BaseModel):
    user_id: str
    username: str
    current_room: str
    is_gagged: bool = False  # Cannot speak
    gag_expires: Optional[datetime] = None
    temp_ban_expires: Optional[datetime] = None
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    temp_superuser_expires: Optional[datetime] = None
    chat_color: str = "#ffffff"  # Default white text



class ChatInvitation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str
    sender_username: str
    receiver_username: str
    room_id: str
    room_name: str
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    accepted: bool = False
    accepted_at: Optional[datetime] = None

# WebSocket Connection Manager
class ChatConnectionManager:
    def __init__(self):
        # websocket_id -> WebSocket connection
        self.active_connections: Dict[str, WebSocket] = {}
        # user_id -> websocket_id
        self.user_connections: Dict[str, str] = {}
        # room_id -> set of user_ids
        self.room_users: Dict[str, Set[str]] = {}
        # user_id -> room_id
        self.user_rooms: Dict[str, str] = {}
        
    async def connect(self, websocket: WebSocket, user_id: str, room_id: str):
        """Improved connection handling with cleanup"""
        try:
            # Clean up any existing connection for this user first
            await self.disconnect(user_id)
            
            # Accept new connection
            await websocket.accept()
            connection_id = str(uuid.uuid4())
            
            # Store connection
            self.active_connections[connection_id] = websocket
            self.user_connections[user_id] = connection_id
            
            # Add user to room
            if room_id not in self.room_users:
                self.room_users[room_id] = set()
            self.room_users[room_id].add(user_id)
            self.user_rooms[user_id] = room_id
            
            print(f"✅ User {user_id} connected to room {room_id} with connection {connection_id}")
            return True
            
        except Exception as e:
            print(f"❌ Error connecting user {user_id}: {e}")
            await self.disconnect(user_id)
            return False
    
    async def disconnect(self, user_id: str):
        """Improved disconnection with proper cleanup"""
        try:
            # Get connection ID
            connection_id = self.user_connections.get(user_id)
            if connection_id:
                # Close WebSocket connection
                websocket = self.active_connections.get(connection_id)
                if websocket:
                    try:
                        await websocket.close()
                    except:
                        pass  # Connection might already be closed
                    del self.active_connections[connection_id]
                del self.user_connections[user_id]
            
            # Remove from room
            room_id = self.user_rooms.get(user_id)
            if room_id and room_id in self.room_users:
                self.room_users[room_id].discard(user_id)
                if not self.room_users[room_id]:
                    del self.room_users[room_id]
            
            # Remove from user rooms
            if user_id in self.user_rooms:
                del self.user_rooms[user_id]
                
            print(f"✅ User {user_id} disconnected and cleaned up")
            
        except Exception as e:
            print(f"❌ Error disconnecting user {user_id}: {e}")
    
    async def send_personal_message(self, user_id: str, message: str):
        """Send message to specific user with error handling"""
        try:
            connection_id = self.user_connections.get(user_id)
            if connection_id and connection_id in self.active_connections:
                websocket = self.active_connections[connection_id]
                await websocket.send_text(message)
                return True
        except Exception as e:
            print(f"❌ Error sending personal message to {user_id}: {e}")
            # Clean up broken connection
            await self.disconnect(user_id)
            return False
    
    async def send_room_message(self, room_id: str, message: str):
        """Send message to all users in room with cleanup"""
        if room_id not in self.room_users:
            return
        
        # Make copy to avoid modification during iteration
        user_ids = list(self.room_users[room_id])
        failed_users = []
        
        for user_id in user_ids:
            success = await self.send_personal_message(user_id, message)
            if not success:
                failed_users.append(user_id)
        
        # Clean up failed connections
        for user_id in failed_users:
            await self.disconnect(user_id)
    
    async def send_to_moderators(self, room_id: str, message: str):
        """Send message only to moderators in room"""
        if room_id not in self.room_users:
            return
        
        for user_id in list(self.room_users[room_id]):
            try:
                # Check if user is moderator
                user = await db.users.find_one({"id": user_id}, {"_id": 0, "role": 1})
                if user and user.get("role") in ["superuser_admin", "superuser_vip"]:
                    await self.send_personal_message(user_id, message)
            except Exception as e:
                print(f"❌ Error sending moderator message: {e}")
    
    def get_room_users(self, room_id: str):
        """Get list of users in a room"""
        return list(self.room_users.get(room_id, set()))
    
    def get_user_count(self, room_id: str):
        """Get number of users in a room"""
        return len(self.room_users.get(room_id, set()))
    
    def is_user_connected(self, user_id: str):
        """Check if user is connected"""
        return user_id in self.user_connections

# Global chat manager
chat_manager = ChatConnectionManager()

# Chat Command Parser and Handler
class ChatCommandHandler:
    def __init__(self):
        self.commands = {
            'w': self.handle_who_chat_command,  # Changed: /wc becomes /w (detailed user info)
            # Removed: old /w command (simple who command)
            'su': self.handle_superuser_command,
            'gag': self.handle_gag_command,
            'k': self.handle_kick_command,
            'kh': self.handle_kick_hard_command,
            'sepa': self.handle_create_private_room,
            'l': self.handle_lock_room,
            'mod': self.handle_moderate_room,
            'unmod': self.handle_unmoderate_room,
            'i': self.handle_invite_user,
            'j': self.handle_join_invited_room,  # New: Join invited room
            'f+': self.handle_friend_request,
            'a': self.handle_accept_friend,
            'col': self.handle_color_change,  # Will be updated to allow all users
            'help': self.handle_help_command
        }
    
    async def parse_and_execute(self, user: User, room_id: str, message: str) -> Optional[dict]:
        """Parse message and execute command if it starts with /"""
        if not message.startswith('/'):
            return None
        
        parts = message[1:].split()
        if not parts:
            return None
        
        command = parts[0].lower()
        args = parts[1:] if len(parts) > 1 else []
        
        if command in self.commands:
            return await self.commands[command](user, room_id, args)
        else:
            return {
                "type": "error",
                "message": f"Unbekannter Befehl: /{command}. Verwende /help für eine Liste der Befehle."
            }
    
    async def handle_who_command(self, user: User, room_id: str, args: List[str]) -> dict:
        """/w [username] - Show users in room or user info"""
        if args:
            # Show specific user info
            username = args[0]
            target_user = await db.users.find_one({"username": username}, {"_id": 0, "password": 0})
            
            if not target_user:
                return {"type": "error", "message": f"Benutzer '{username}' nicht gefunden."}
            
            current_room = target_user.get("current_room", "Nicht im Chat")
            last_seen = target_user.get("last_seen", datetime.utcnow())
            online_time = datetime.utcnow() - datetime.fromisoformat(str(target_user.get("joined_date", datetime.utcnow())))
            idle_time = datetime.utcnow() - last_seen if isinstance(last_seen, datetime) else timedelta(0)
            
            info = f"""Benutzerinformationen für {username}:
Name: {username}
Im Chat seit: {online_time.days} Tagen
Inaktiv seit: {idle_time.seconds // 60} Minuten  
Aktueller Raum: {current_room or 'Nicht im Chat'}
Rolle: {target_user.get('role', 'user')}"""
            
            return {"type": "info", "message": info}
        else:
            # Show users in current room
            users_in_room = chat_manager.get_room_users(room_id)
            room_name = "Aktueller Raum"
            
            # Get room name
            room_data = await db.chat_rooms.find_one({"id": room_id}, {"_id": 0})
            if room_data:
                room_name = room_data["name"]
            
            if users_in_room:
                usernames = []
                for user_id in users_in_room:
                    user_data = await db.users.find_one({"id": user_id}, {"_id": 0, "username": 1})
                    if user_data:
                        usernames.append(user_data["username"])
                
                message = f"{room_name} ({len(usernames)} Benutzer): {', '.join(usernames)}"
            else:
                message = f"{room_name}: Keine Benutzer online"
            
            return {"type": "info", "message": message}
    
    async def handle_who_chat_command(self, user: User, room_id: str, args: List[str]) -> dict:
        """/wc - Show overview of all chat rooms"""
        rooms = await db.chat_rooms.find({}, {"_id": 0}).to_list(length=None)
        
        room_info = []
        for room in rooms:
            users_in_room = chat_manager.get_room_users(room["id"])
            user_count = len(users_in_room)
            
            status = ""
            if room.get("is_private"):
                status = " (geschlossen)"
            if room.get("is_locked"):
                status += " (gesperrt)"
            
            room_info.append(f"{room['name']}: {user_count} Benutzer{status}")
        
        message = "Chat-Räume Übersicht:\n" + "\n".join(room_info)
        return {"type": "info", "message": message}
    
    async def handle_superuser_command(self, user: User, room_id: str, args: List[str]) -> dict:
        """/su <username> - Grant temporary superuser rights"""
        if user.role not in [UserRole.SUPERUSER_VIP, UserRole.SUPERUSER_ADMIN]:
            return {"type": "error", "message": "Insufficient permissions for /su command"}
        
        if not args:
            return {"type": "error", "message": "Usage: /su <username>"}
        
        target_username = args[0]
        target_user = await db.users.find_one({"username": target_username}, {"_id": 0})
        
        if not target_user:
            return {"type": "error", "message": f"Benutzer '{target_username}' nicht gefunden."}
        
        # Grant temporary superuser rights for 30 minutes
        expires = datetime.utcnow() + timedelta(minutes=30)
        await db.users.update_one(
            {"username": target_username},
            {"$set": {
                "temp_superuser": True,
                "temp_superuser_expires": expires
            }}
        )
        
        # Notify room
        await chat_manager.send_system_message(
            room_id, 
            f"{target_username} wurde temporäre SUPERUSER-Rechte verliehen (30 Min)"
        )
        
        return {"type": "success", "message": f"{target_username} hat jetzt temporäre SUPERUSER-Rechte"}
    
    async def handle_gag_command(self, user: User, room_id: str, args: List[str]) -> dict:
        """/gag <username> - Prevent user from speaking"""
        if not self.can_moderate(user):
            return {"type": "error", "message": "Keine Berechtigung für /gag"}
        
        if not args:
            return {"type": "error", "message": "Usage: /gag <username>"}
        
        target_username = args[0]
        target_user = await db.users.find_one({"username": target_username}, {"_id": 0})
        
        if not target_user:
            return {"type": "error", "message": f"Benutzer '{target_username}' nicht gefunden."}
        
        # Create or update chat status
        gag_expires = datetime.utcnow() + timedelta(minutes=15)
        await db.user_chat_status.update_one(
            {"user_id": target_user["id"]},
            {"$set": {
                "user_id": target_user["id"],
                "username": target_username,
                "is_gagged": True,
                "gag_expires": gag_expires,
                "current_room": target_user.get("current_room")
            }},
            upsert=True
        )
        
        await chat_manager.send_system_message(
            room_id,
            f"{target_username} wurde für 15 Minuten geknebelt"
        )
        
        return {"type": "success", "message": f"{target_username} wurde geknebelt"}
    
    async def handle_kick_command(self, user: User, room_id: str, args: List[str]) -> dict:
        """/k <username> - Kick user to Exil for 15 minutes"""
        if not self.can_moderate(user):
            return {"type": "error", "message": "Keine Berechtigung für /k"}
        
        if not args:
            return {"type": "error", "message": "Usage: /k <username>"}
        
        target_username = args[0]
        target_user = await db.users.find_one({"username": target_username}, {"_id": 0})
        
        if not target_user:
            return {"type": "error", "message": f"Benutzer '{target_username}' nicht gefunden."}
        
        # Find Exil room
        exil_room = await db.chat_rooms.find_one({"name": "Exil"}, {"_id": 0})
        if not exil_room:
            return {"type": "error", "message": "Exil-Raum nicht gefunden"}
        
        # Move user to Exil
        await chat_manager.switch_user_room(target_user["id"], exil_room["id"])
        
        # Set release time (15 minutes)
        release_time = datetime.utcnow() + timedelta(minutes=15)
        await db.user_chat_status.update_one(
            {"user_id": target_user["id"]},
            {"$set": {
                "user_id": target_user["id"],
                "username": target_username,
                "temp_ban_expires": release_time,
                "current_room": exil_room["id"]
            }},
            upsert=True
        )
        
        await chat_manager.send_system_message(
            room_id,
            f"{target_username} wurde ins Exil geschickt (15 Minuten)"
        )
        
        return {"type": "success", "message": f"{target_username} ins Exil geschickt"}
    
    async def handle_kick_hard_command(self, user: User, room_id: str, args: List[str]) -> dict:
        """/kh <username> [minutes] - Kick user from chat (VIP/Admin only)"""
        if user.role not in [UserRole.SUPERUSER_VIP, UserRole.SUPERUSER_ADMIN]:
            return {"type": "error", "message": "Keine Berechtigung für /kh - nur für VIPs und Admins"}
        
        if not args:
            return {"type": "error", "message": "Usage: /kh <username> [minutes]"}
        
        target_username = args[0]
        ban_minutes = 60  # Default 1 hour
        
        if len(args) > 1:
            try:
                ban_minutes = int(args[1])
            except ValueError:
                return {"type": "error", "message": "Ungültige Minutenangabe"}
        
        target_user = await db.users.find_one({"username": target_username}, {"_id": 0})
        
        if not target_user:
            return {"type": "error", "message": f"Benutzer '{target_username}' nicht gefunden."}
        
        # Disconnect user
        await chat_manager.disconnect(target_user["id"])
        
        # Set ban time
        ban_expires = datetime.utcnow() + timedelta(minutes=ban_minutes)
        await db.user_chat_status.update_one(
            {"user_id": target_user["id"]},
            {"$set": {
                "user_id": target_user["id"],
                "username": target_username,
                "temp_ban_expires": ban_expires
            }},
            upsert=True
        )
        
        await chat_manager.send_system_message(
            room_id,
            f"{target_username} wurde für {ban_minutes} Minuten aus dem Chat geworfen"
        )
        
        return {"type": "success", "message": f"{target_username} für {ban_minutes} Min gesperrt"}
    
    async def handle_create_private_room(self, user: User, room_id: str, args: List[str]) -> dict:
        """/sepa <roomname> - Create private room"""
        if not args:
            return {"type": "error", "message": "Usage: /sepa <raumname>"}
        
        room_name = " ".join(args)
        
        # Check if room already exists
        existing_room = await db.chat_rooms.find_one({"name": room_name}, {"_id": 0})
        if existing_room:
            return {"type": "error", "message": f"Raum '{room_name}' existiert bereits"}
        
        # Create private room
        private_room = ChatRoom(
            name=room_name,
            is_private=True,
            creator_id=user.id,
            users=[user.id]  # Use 'users' field instead of 'allowed_users'
        )
        
        await db.chat_rooms.insert_one(private_room.dict())
        
        # Grant creator temporary superuser rights in this room
        expires = datetime.utcnow() + timedelta(hours=2)  # 2 hours
        await db.users.update_one(
            {"id": user.id},
            {"$set": {
                "temp_superuser": True,
                "temp_superuser_expires": expires
            }}
        )
        
        # Update user's current room in database (for polling system)
        await db.users.update_one(
            {"id": user.id},
            {"$set": {"current_room": private_room.id}}
        )
        
        return {"type": "success", "message": f"Privater Raum '{room_name}' erstellt. Sie haben temporäre SUPERUSER-Rechte."}
    
    async def handle_lock_room(self, user: User, room_id: str, args: List[str]) -> dict:
        """/l <roomname> - Lock/unlock room"""
        if not self.can_moderate(user):
            return {"type": "error", "message": "Keine Berechtigung für /l"}
        
        if not args:
            return {"type": "error", "message": "Usage: /l <raumname>"}
        
        room_name = " ".join(args)
        target_room = await db.chat_rooms.find_one({"name": room_name}, {"_id": 0})
        
        if not target_room:
            return {"type": "error", "message": f"Raum '{room_name}' nicht gefunden"}
        
        # Check if it's a main room and user has VIP rights
        main_rooms = ["Hauptraum", "Lounge", "Gaming", "Musik"]
        if target_room["name"] in main_rooms and user.role not in [UserRole.SUPERUSER_VIP, UserRole.SUPERUSER_ADMIN]:
            return {"type": "error", "message": "Haupträume können nur von VIPs gesperrt werden"}
        
        # Toggle lock status
        new_lock_status = not target_room.get("is_locked", False)
        await db.chat_rooms.update_one(
            {"name": room_name},
            {"$set": {"is_locked": new_lock_status}}
        )
        
        action = "gesperrt" if new_lock_status else "entsperrt"
        
        # For polling system, we'll create a system message directly in the database
        system_message = ChatMessage(
            id=str(uuid.uuid4()),
            room_id=room_id,
            user_id="system",
            username="System",
            message=f"🔒 Raum '{room_name}' wurde {action}",
            timestamp=datetime.utcnow(),
            user_role="system",
            is_approved=True,
            pending_moderation=False
        )
        await db.chat_messages.insert_one(system_message.dict())
        
        return {"type": "success", "message": f"Raum '{room_name}' {action}"}
    
    async def handle_moderate_room(self, user: User, room_id: str, args: List[str]) -> dict:
        """/mod - Enable room moderation (VIP+ only)"""
        if user.role not in [UserRole.SUPERUSER_VIP, UserRole.SUPERUSER_ADMIN]:
            return {"type": "error", "message": "Keine Berechtigung für /mod - nur VIPs/Admins"}
        
        room = await db.chat_rooms.find_one({"id": room_id}, {"_id": 0})
        if not room:
            return {"type": "error", "message": "Raum nicht gefunden"}
        
        await db.chat_rooms.update_one(
            {"id": room_id},
            {"$set": {"is_moderated": True}}
        )
        
        # For polling system, create system message directly in database
        system_message = ChatMessage(
            id=str(uuid.uuid4()),
            room_id=room_id,
            user_id="system",
            username="System",
            message="🛡️ Raum wird jetzt moderiert. Alle Nachrichten müssen von VIPs/Admins freigegeben werden.",
            timestamp=datetime.utcnow(),
            user_role="system",
            is_approved=True,
            pending_moderation=False
        )
        await db.chat_messages.insert_one(system_message.dict())
        
        return {"type": "success", "message": "Raum-Moderation aktiviert"}
    
    async def handle_unmoderate_room(self, user: User, room_id: str, args: List[str]) -> dict:
        """/unmod - Disable room moderation (VIP+ only)"""
        if user.role not in [UserRole.SUPERUSER_VIP, UserRole.SUPERUSER_ADMIN]:
            return {"type": "error", "message": "Keine Berechtigung für /unmod - nur VIPs/Admins"}
        
        await db.chat_rooms.update_one(
            {"id": room_id},
            {"$set": {"is_moderated": False}}
        )
        
        # For polling system, create system message directly in database
        system_message = ChatMessage(
            id=str(uuid.uuid4()),
            room_id=room_id,
            user_id="system",
            username="System",
            message="🗣️ Raum-Moderation wurde deaktiviert. Alle können wieder frei schreiben.",
            timestamp=datetime.utcnow(),
            user_role="system",
            is_approved=True,
            pending_moderation=False
        )
        await db.chat_messages.insert_one(system_message.dict())
        
        return {"type": "success", "message": "Raum-Moderation deaktiviert"}
    
    async def handle_invite_user(self, user: User, room_id: str, args: List[str]) -> dict:
        """/i <username> - Invite user to chat"""
        if not args:
            return {"type": "error", "message": "Usage: /i <username>"}
        
        target_username = args[0]
        target_user = await db.users.find_one({"username": target_username}, {"_id": 0})
        
        if not target_user:
            return {"type": "error", "message": f"Benutzer '{target_username}' nicht gefunden"}
        
        room = await db.chat_rooms.find_one({"id": room_id}, {"_id": 0})
        if not room:
            return {"type": "error", "message": "Raum nicht gefunden"}
        
        # Create invitation
        invitation = ChatInvitation(
            sender_id=user.id,
            sender_username=user.username,
            receiver_username=target_username,
            room_id=room_id,
            room_name=room["name"],
            message=f"{user.username} hat Sie in den Chat-Raum '{room['name']}' eingeladen!"
        )
        
        await db.chat_invitations.insert_one(invitation.dict())
        
        # Create personal notification for invited user
        await create_personal_notification(
            user_id=target_user["id"],
            notification_type="chat_invitation",
            title="💬 Chat-Einladung erhalten",
            message=f"{user.username} hat Sie in den Chat-Raum '{room['name']}' eingeladen!",
            action_url=f"/chat#{room_id}",
            action_text="Chat beitreten",
            sender_id=user.id,
            sender_username=user.username,
            reference_id=invitation.id
        )
        
        # Send broadcast message to community
        expires_at = datetime.utcnow() + timedelta(minutes=1)  # 1 minute auto-hide
        broadcast_msg = BroadcastMessage(
            message=f"💬 {target_username} wurde von {user.username} in den Chat-Raum '{room['name']}' eingeladen! [Link zum Raum: /chat#{room_id}]",
            interval_minutes=1,  # Show only once
            auto_hide_minutes=1,  # Hide after 1 minute
            expires_at=expires_at,
            created_by=user.id
        )
        await db.broadcasts.insert_one(broadcast_msg.dict())
        
        await chat_manager.send_system_message(
            room_id,
            f"📨 {target_username} wurde in den Chat eingeladen"
        )
        
        return {"type": "success", "message": f"Einladung an {target_username} gesendet"}
    
    async def handle_join_invited_room(self, user: User, room_id: str, args: List[str]) -> dict:
        """/j - Join the most recent room invitation"""
        # Find the most recent invitation for this user
        invitation = await db.chat_invitations.find_one(
            {"receiver_username": user.username, "accepted": False},
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        
        if not invitation:
            return {"type": "error", "message": "Keine offenen Chat-Einladungen gefunden"}
        
        invited_room_id = invitation["room_id"]
        invited_room_name = invitation["room_name"]
        sender_username = invitation["sender_username"]
        
        # Verify the room still exists
        room = await db.chat_rooms.find_one({"id": invited_room_id}, {"_id": 0})
        if not room:
            return {"type": "error", "message": f"Raum '{invited_room_name}' existiert nicht mehr"}
        
        # Mark invitation as accepted
        await db.chat_invitations.update_one(
            {"id": invitation["id"]},
            {"$set": {"accepted": True, "accepted_at": datetime.utcnow()}}
        )
        
        # Update user's current room
        await db.users.update_one(
            {"id": user.id},
            {"$set": {"current_room": invited_room_id}}
        )
        
        # Send system messages
        await chat_manager.send_system_message(
            room_id,
            f"📤 {user.username} ist dem Raum '{invited_room_name}' beigetreten"
        )
        
        await chat_manager.send_system_message(
            invited_room_id,
            f"📥 {user.username} ist der Einladung von {sender_username} gefolgt und dem Raum beigetreten"
        )
        
        return {
            "type": "success", 
            "message": f"Sie sind dem Raum '{invited_room_name}' beigetreten",
            "room_id": invited_room_id,
            "room_name": invited_room_name
        }
    
    async def handle_friend_request(self, user: User, room_id: str, args: List[str]) -> dict:
        """/f+ <username> - Send friend request"""
        if not args:
            return {"type": "error", "message": "Usage: /f+ <username>"}
        
        target_username = args[0]
        target_user = await db.users.find_one({"username": target_username}, {"_id": 0})
        
        if not target_user:
            return {"type": "error", "message": f"Benutzer '{target_username}' nicht gefunden"}
        
        if target_user["id"] == user.id:
            return {"type": "error", "message": "Sie können sich nicht selbst als Freund hinzufügen"}
        
        # Check if request already exists
        existing_request = await db.friend_requests.find_one({
            "$or": [
                {"sender_id": user.id, "recipient_id": target_user["id"]},
                {"sender_id": target_user["id"], "recipient_id": user.id}
            ],
            "status": "pending"
        })
        
        if existing_request:
            return {"type": "error", "message": f"Freundschaftsanfrage mit {target_username} bereits vorhanden"}
        
        # Create friend request
        friend_request = FriendRequest(
            sender_id=user.id,
            sender_username=user.username,
            recipient_id=target_user["id"],
            recipient_username=target_username
        )
        
        await db.friend_requests.insert_one(friend_request.dict())
        
        # Send broadcast if user is in community
        expires_at = datetime.utcnow() + timedelta(minutes=1)  # 1 minute auto-hide
        broadcast_msg = BroadcastMessage(
            message=f"👥 {target_username} hat eine Freundschaftsanfrage von {user.username} erhalten! Verwende /a im Chat zum Annehmen.",
            interval_minutes=1,
            auto_hide_minutes=1,  # Hide after 1 minute
            expires_at=expires_at,
            created_by=user.id
        )
        await db.broadcasts.insert_one(broadcast_msg.dict())
        
        await chat_manager.send_system_message(
            room_id,
            f"👥 Freundschaftsanfrage an {target_username} gesendet"
        )
        
        return {"type": "success", "message": f"Freundschaftsanfrage an {target_username} gesendet"}
    
    async def handle_accept_friend(self, user: User, room_id: str, args: List[str]) -> dict:
        """/a - Accept pending friend request"""
        pending_request = await db.friend_requests.find_one({
            "recipient_id": user.id,
            "status": "pending"
        }, {"_id": 0})
        
        if not pending_request:
            return {"type": "error", "message": "Keine ausstehenden Freundschaftsanfragen gefunden"}
        
        # Accept the request
        await db.friend_requests.update_one(
            {"id": pending_request["id"]},
            {"$set": {
                "status": "accepted",
                "accepted_at": datetime.utcnow()
            }}
        )
        
        # Add to friends list (mutual)
        await db.friendships.insert_one({
            "id": str(uuid.uuid4()),
            "user1_id": pending_request["sender_id"],
            "user2_id": user.id,
            "created_at": datetime.utcnow()
        })
        
        sender_username = pending_request["sender_username"]
        
        await chat_manager.send_system_message(
            room_id,
            f"🎉 {user.username} und {sender_username} sind jetzt Freunde!"
        )
        
        return {"type": "success", "message": f"Freundschaftsanfrage von {sender_username} angenommen"}
    
    async def handle_color_change(self, user: User, room_id: str, args: List[str]) -> dict:
        """/col <hexcode> - Change chat text color"""
        if not args:
            return {"type": "error", "message": "Usage: /col <hexcode> (z.B. /col #FF0000 für rot)"}
        
        color_code = args[0]
        
        # Validate hex color
        if not color_code.startswith('#') or len(color_code) != 7:
            return {"type": "error", "message": "Ungültiger Hex-Code. Verwende Format: #RRGGBB (z.B. #FF0000)"}
        
        try:
            int(color_code[1:], 16)  # Validate hex
        except ValueError:
            return {"type": "error", "message": "Ungültiger Hex-Code. Verwende Format: #RRGGBB"}
        
        # Update user's chat color
        await db.user_chat_status.update_one(
            {"user_id": user.id},
            {"$set": {
                "user_id": user.id,
                "username": user.username,
                "chat_color": color_code,
                "current_room": room_id
            }},
            upsert=True
        )
        
        return {"type": "success", "message": f"Schriftfarbe geändert zu {color_code}"}
    
    async def handle_help_command(self, user: User, room_id: str, args: List[str]) -> dict:
        """/help - Show available commands"""
        commands = [
            "/w - Zeigt Benutzer im aktuellen Raum",
            "/w <name> - Zeigt Informationen über Benutzer", 
            "/wc - Zeigt Übersicht aller Chat-Räume",
            "/sepa <raum> - Erstellt privaten Raum",
            "/i <name> - Lädt Benutzer in Chat ein",
            "/f+ <name> - Sendet Freundschaftsanfrage",
            "/a - Nimmt ausstehende Freundschaftsanfrage an",
            "/col <hex> - Ändert Schriftfarbe (z.B. /col #FF0000)"
        ]
        
        if self.can_moderate(user):
            commands.extend([
                "/gag <name> - Knebelt Benutzer (15 Min)",
                "/k <name> - Schickt Benutzer ins Exil (15 Min)",
                "/l <raum> - Sperrt/entsperrt Raum"
            ])
        
        if user.role in [UserRole.SUPERUSER_VIP, UserRole.SUPERUSER_ADMIN]:
            commands.extend([
                "/su <name> - Verleiht temporäre SUPERUSER-Rechte",
                "/kh <name> [min] - Wirft Benutzer aus Chat",
                "/mod - Aktiviert Raum-Moderation (nur VIPs/Admins sehen Nachrichten)",
                "/unmod - Deaktiviert Raum-Moderation"
            ])
        
        help_text = "Verfügbare Chat-Befehle:\n" + "\n".join(commands)
        return {"type": "info", "message": help_text}
    
    def can_moderate(self, user: User) -> bool:
        """Check if user can moderate chat (VIPs, Admins, and temporary SUPERUSER only)"""
        return (user.role in [UserRole.SUPERUSER_VIP, UserRole.SUPERUSER_ADMIN] or
                user.temp_superuser)

# Global command handler
chat_commands = ChatCommandHandler()

# Chat command processing function
async def process_chat_command(user: User, room_id: str, command: str, args: List[str]) -> Optional[dict]:
    """Process chat command using the global chat command handler"""
    # Reconstruct the full command message
    full_command = f"/{command}"
    if args:
        full_command += " " + " ".join(args)
    
    # Use the existing chat command handler
    return await chat_commands.parse_and_execute(user, room_id, full_command)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class ChatRoom(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    is_private: bool = False
    creator_id: Optional[str] = None
    users: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class NewsItemCreate(BaseModel):
    title: str
    content: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    points: Optional[int] = None
    is_vip: Optional[bool] = None
    temp_superuser: Optional[bool] = None

class ChatRoomCreate(BaseModel):
    name: str
    is_private: bool = False

class AdminStats(BaseModel):
    total_users: int
    online_users: int
    total_chat_rooms: int
    total_news: int
    recent_registrations: int

class NewsItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    author_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

# Utility functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"username": username}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return User(**user)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Admin middleware
async def require_admin_permission(current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.SUPERUSER_ADMIN, UserRole.SUPERUSER_VIP]:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user

# Points System Functions
class PointsManager:
    @staticmethod
    async def award_points(user_id: str, username: str, points: int, reason: str, 
                          category: str = "general", reference_id: Optional[str] = None, 
                          created_by: Optional[str] = None, is_automated: bool = True):
        """Award points to a user and create transaction record"""
        # Create transaction record
        transaction = PointTransaction(
            user_id=user_id,
            username=username,
            points=points,
            reason=reason,
            category=category,
            reference_id=reference_id,
            created_by=created_by,
            is_automated=is_automated
        )
        
        await db.point_transactions.insert_one(transaction.dict())
        
        # Update user's total points
        await db.users.update_one(
            {"id": user_id},
            {"$inc": {"points": points}}
        )
        
        return transaction

    @staticmethod
    async def check_daily_limit(user_id: str, action: str) -> bool:
        """Check if user has reached daily limit for an action"""
        rule = await db.point_earning_rules.find_one({"action": action, "is_active": True}, {"_id": 0})
        if not rule or not rule.get("max_per_day"):
            return False  # No limit
        
        # Count today's transactions for this action
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_count = await db.point_transactions.count_documents({
            "user_id": user_id,
            "category": action.split("_")[0],  # Extract category from action
            "created_at": {"$gte": today_start},
            "points": {"$gt": 0}  # Only count earning, not spending
        })
        
        return today_count >= rule["max_per_day"]

    @staticmethod
    async def process_forum_post(user_id: str, username: str, post_id: str):
        """Award points for forum post"""
        if await PointsManager.check_daily_limit(user_id, "forum_post"):
            return None
        
        rule = await db.point_earning_rules.find_one({"action": "forum_post", "is_active": True}, {"_id": 0})
        if rule:
            return await PointsManager.award_points(
                user_id, username, rule["points"], 
                "Forum-Beitrag verfasst", "forum", post_id
            )

    @staticmethod
    async def process_forum_thread(user_id: str, username: str, thread_id: str):
        """Award points for creating forum thread"""
        rule = await db.point_earning_rules.find_one({"action": "forum_thread", "is_active": True}, {"_id": 0})
        if rule:
            return await PointsManager.award_points(
                user_id, username, rule["points"], 
                "Forum-Thread erstellt", "forum", thread_id
            )

    @staticmethod
    async def process_guestbook_entry(user_id: str, username: str, entry_id: str):
        """Award points for guestbook entry"""
        if await PointsManager.check_daily_limit(user_id, "guestbook_entry"):
            return None
        
        rule = await db.point_earning_rules.find_one({"action": "guestbook_entry", "is_active": True}, {"_id": 0})
        if rule:
            return await PointsManager.award_points(
                user_id, username, rule["points"], 
                "Gästebuch-Eintrag verfasst", "guestbook", entry_id
            )

    @staticmethod
    async def process_chat_message(user_id: str, username: str):
        """Award points for chat activity (with daily limit)"""
        if await PointsManager.check_daily_limit(user_id, "chat_message"):
            return None
        
        rule = await db.point_earning_rules.find_one({"action": "chat_message", "is_active": True}, {"_id": 0})
        if rule:
            return await PointsManager.award_points(
                user_id, username, rule["points"], 
                "Chat-Aktivität", "chat"
            )

    @staticmethod
    async def process_daily_login(user_id: str, username: str):
        """Award points for daily login (once per day)"""
        # Check if user already got login bonus today
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        existing_login_bonus = await db.point_transactions.find_one({
            "user_id": user_id,
            "category": "daily",
            "created_at": {"$gte": today_start}
        }, {"_id": 0})
        
        if existing_login_bonus:
            return None  # Already got today's bonus
        
        rule = await db.point_earning_rules.find_one({"action": "daily_login", "is_active": True}, {"_id": 0})
        if rule:
            return await PointsManager.award_points(
                user_id, username, rule["points"], 
                "Täglicher Login-Bonus", "daily"
            )

# Initialize default earning rules
async def init_default_point_rules():
    """Initialize default point earning rules"""
    default_rules = [
        {"action": "forum_post", "points": 2, "description": "Punkte für Forum-Beitrag", "max_per_day": 20},
        {"action": "forum_thread", "points": 5, "description": "Punkte für neuen Forum-Thread", "max_per_day": 5},
        {"action": "guestbook_entry", "points": 1, "description": "Punkte für Gästebuch-Eintrag", "max_per_day": 10},
        {"action": "chat_message", "points": 1, "description": "Punkte für Chat-Aktivität", "max_per_day": 50},
        {"action": "daily_login", "points": 10, "description": "Täglicher Login-Bonus", "max_per_day": 1}
    ]
    
    for rule_data in default_rules:
        existing = await db.point_earning_rules.find_one({"action": rule_data["action"]}, {"_id": 0})
        if not existing:
            rule = PointEarningRule(**rule_data)
            await db.point_earning_rules.insert_one(rule.dict())

# Global points manager
points_manager = PointsManager()

# Initialize default data
async def init_default_data():
    # Check if admin user exists
    admin_user = await db.users.find_one({"username": "RichRacerRR"}, {"_id": 0})
    if not admin_user:
        admin_data = {
            "id": str(uuid.uuid4()),
            "username": "RichRacerRR",
            "email": "admin@richcomm.de",
            "password": get_password_hash("admin123"),
            "role": UserRole.SUPERUSER_ADMIN,
            "points": 10000,
            "is_online": False,
            "last_seen": datetime.utcnow(),
            "joined_date": datetime.utcnow(),
            "current_room": None,
            "is_vip": True,
            "temp_superuser": False,
            "temp_superuser_expires": None
        }
        await db.users.insert_one(admin_data)
    
    # Create default chat rooms
    default_rooms = ["Hauptraum", "Lounge", "Gaming", "Musik", "Exil"]
    for room_name in default_rooms:
        existing_room = await db.chat_rooms.find_one({"name": room_name}, {"_id": 0})
        if not existing_room:
            room_data = {
                "id": str(uuid.uuid4()),
                "name": room_name,
                "is_private": room_name == "Exil",
                "creator_id": None,
                "users": [],
                "created_at": datetime.utcnow()
            }
            await db.chat_rooms.insert_one(room_data)
    
    # Initialize default point earning rules
    await init_default_point_rules()

# Auth endpoints
@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"$or": [{"username": user_data.username}, {"email": user_data.email}]}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        username=user_data.username,
        email=user_data.email,
        password=hashed_password
    )
    
    user_dict = user.dict()
    user_dict["password"] = hashed_password
    await db.users.insert_one(user_dict)
    
    return UserResponse(**{k: v for k, v in user_dict.items() if k != "password"})

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"username": user_data.username}, {"_id": 0})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if user is banned
    if user.get("role") == UserRole.BANNED:
        raise HTTPException(status_code=401, detail="Account is banned")
    
    # Update user online status
    await db.users.update_one(
        {"username": user_data.username},
        {"$set": {"is_online": True, "last_seen": datetime.utcnow()}}
    )
    
    # Award daily login bonus
    await points_manager.process_daily_login(user["id"], user["username"])
    
    access_token = create_access_token(data={"sub": user["username"]})
    user_response = UserResponse(**{k: v for k, v in user.items() if k != "password"})
    user_response.is_online = True
    
    # Update points in response (may have changed due to daily bonus)
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    user_response.points = updated_user["points"]
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )

@api_router.post("/auth/logout")
async def logout(current_user: User = Depends(get_current_user)):
    await db.users.update_one(
        {"username": current_user.username},
        {"$set": {"is_online": False, "last_seen": datetime.utcnow()}}
    )
    return {"message": "Logged out successfully"}

# Community endpoints
@api_router.get("/community/dashboard")
async def get_dashboard(current_user: User = Depends(get_current_user)):
    # Get online VIPs
    online_vips = await db.users.find(
        {"is_online": True, "is_vip": True}, 
        {"_id": 0, "username": 1, "role": 1, "current_room": 1}
    ).to_list(length=None)
    
    # Get online users
    online_users = await db.users.find(
        {"is_online": True}, 
        {"_id": 0, "username": 1, "role": 1, "current_room": 1}
    ).to_list(length=None)
    
    # Get chat rooms with user counts
    chat_rooms = await db.chat_rooms.find({}, {"_id": 0}).to_list(length=None)
    
    # Get latest news
    news = await db.news.find(
        {"is_active": True}, 
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(length=None)
    
    return {
        "online_vips": online_vips,
        "online_users": online_users,
        "chat_rooms": chat_rooms,
        "news": news,
        "user": current_user
    }

@api_router.get("/users/toplist")
async def get_toplist(limit: int = 100):
    users = await db.users.find(
        {"points": {"$gt": 0}}, 
        {"_id": 0, "username": 1, "points": 1, "role": 1, "is_vip": 1}
    ).sort("points", -1).limit(limit).to_list(length=None)
    return users

@api_router.get("/chat/rooms")
async def get_chat_rooms():
    rooms = await db.chat_rooms.find({}, {"_id": 0}).to_list(length=None)
    return rooms

# News endpoints (admin only)
@api_router.post("/news", response_model=NewsItem)
async def create_news(news_data: NewsItemCreate, current_user: User = Depends(require_admin_permission)):
    news_item = NewsItem(
        title=news_data.title,
        content=news_data.content,
        author_id=current_user.id
    )
    
    await db.news.insert_one(news_item.dict())
    return news_item

@api_router.get("/news", response_model=List[NewsItem])
async def get_all_news(current_user: User = Depends(require_admin_permission)):
    news_items = await db.news.find({}, {"_id": 0}).sort("created_at", -1).to_list(length=None)
    return [NewsItem(**item) for item in news_items]

@api_router.put("/news/{news_id}")
async def update_news(news_id: str, news_data: NewsItemCreate, current_user: User = Depends(require_admin_permission)):
    result = await db.news.update_one(
        {"id": news_id},
        {"$set": {"title": news_data.title, "content": news_data.content}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="News item not found")
    return {"message": "News updated successfully"}

@api_router.delete("/news/{news_id}")
async def delete_news(news_id: str, current_user: User = Depends(require_admin_permission)):
    result = await db.news.delete_one({"id": news_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="News item not found")
    return {"message": "News deleted successfully"}

# Admin User Management
@api_router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(current_user: User = Depends(require_admin_permission)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).sort("joined_date", -1).to_list(length=None)
    return [UserResponse(**user) for user in users]

# Broadcast Management APIs
@api_router.get("/admin/broadcasts")
async def get_broadcasts(current_user: User = Depends(require_admin_permission)):
    """Get all broadcast messages"""
    broadcasts = await db.broadcasts.find({}, {"_id": 0}).sort("created_at", -1).to_list(length=None)
    return [BroadcastMessage(**broadcast) for broadcast in broadcasts]

@api_router.post("/admin/broadcasts", response_model=BroadcastMessage)
async def create_broadcast(broadcast_data: BroadcastMessageCreate, current_user: User = Depends(require_admin_permission)):
    """Create new broadcast message"""
    expires_at = datetime.utcnow() + timedelta(minutes=broadcast_data.auto_hide_minutes)
    
    broadcast = BroadcastMessage(
        message=broadcast_data.message,
        interval_minutes=broadcast_data.interval_minutes,
        auto_hide_minutes=broadcast_data.auto_hide_minutes,
        expires_at=expires_at,
        created_by=current_user.id
    )
    
    await db.broadcasts.insert_one(broadcast.dict())
    return broadcast

@api_router.get("/broadcasts/active")
async def get_active_broadcasts():
    """Get currently active broadcasts (auto-hide expired ones)"""
    now = datetime.utcnow()
    
    # First, auto-deactivate expired broadcasts
    await db.broadcasts.update_many(
        {
            "is_active": True,
            "expires_at": {"$lte": now}
        },
        {"$set": {"is_active": False}}
    )
    
    # Get currently active broadcasts (only non-expired ones)
    active_broadcasts = await db.broadcasts.find(
        {
            "is_active": True,
            "$or": [
                {"expires_at": None},
                {"expires_at": {"$gt": now}}
            ]
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=None)
    
    return [BroadcastMessage(**broadcast) for broadcast in active_broadcasts]

@api_router.delete("/admin/broadcasts/{broadcast_id}")
async def delete_broadcast(broadcast_id: str, current_user: User = Depends(require_admin_permission)):
    """Delete broadcast message (admin only)"""
    result = await db.broadcasts.delete_one({"id": broadcast_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Broadcast not found")
    return {"message": "Broadcast deleted successfully"}

@api_router.put("/admin/broadcasts/{broadcast_id}")
async def update_broadcast(broadcast_id: str, broadcast_data: BroadcastMessageCreate, current_user: User = Depends(require_admin_permission)):
    """Update broadcast message"""
    result = await db.broadcasts.update_one(
        {"id": broadcast_id},
        {"$set": {
            "message": broadcast_data.message,
            "interval_minutes": broadcast_data.interval_minutes
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Broadcast not found")
    return {"message": "Broadcast updated successfully"}

@api_router.put("/admin/broadcasts/{broadcast_id}/toggle")
async def toggle_broadcast(broadcast_id: str, current_user: User = Depends(require_admin_permission)):
    """Toggle broadcast active status"""
    broadcast = await db.broadcasts.find_one({"id": broadcast_id}, {"_id": 0})
    if not broadcast:
        raise HTTPException(status_code=404, detail="Broadcast not found")
    
    new_status = not broadcast["is_active"]
    await db.broadcasts.update_one(
        {"id": broadcast_id},
        {"$set": {"is_active": new_status}}
    )
    
    action = "aktiviert" if new_status else "deaktiviert"
    return {"message": f"Broadcast {action}"}

# Advertisement Management APIs
@api_router.get("/admin/advertisements")
async def get_advertisements(current_user: User = Depends(require_admin_permission)):
    """Get all advertisements"""
    ads = await db.advertisements.find({}, {"_id": 0}).sort("created_at", -1).to_list(length=None)
    return [Advertisement(**ad) for ad in ads]

@api_router.post("/admin/advertisements", response_model=Advertisement)
async def create_advertisement(ad_data: AdvertisementCreate, current_user: User = Depends(require_admin_permission)):
    """Create new advertisement"""
    ad = Advertisement(
        title=ad_data.title,
        content=ad_data.content,
        link_url=ad_data.link_url,
        image_url=ad_data.image_url,
        display_location=ad_data.display_location,
        end_date=ad_data.end_date,
        created_by=current_user.id
    )
    
    await db.advertisements.insert_one(ad.dict())
    return ad

@api_router.delete("/admin/advertisements/{ad_id}")
async def delete_advertisement(ad_id: str, current_user: User = Depends(require_admin_permission)):
    """Delete advertisement"""
    result = await db.advertisements.delete_one({"id": ad_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Advertisement not found")
    return {"message": "Advertisement deleted successfully"}

@api_router.get("/advertisements")
async def get_active_advertisements(location: str = "sidebar"):
    """Get active advertisements for display"""
    now = datetime.utcnow()
    ads = await db.advertisements.find({
        "is_active": True,
        "display_location": location,
        "$or": [
            {"end_date": None},
            {"end_date": {"$gt": now}}
        ]
    }, {"_id": 0}).to_list(length=None)
    
    # Increment view count
    for ad in ads:
        await db.advertisements.update_one(
            {"id": ad["id"]},
            {"$inc": {"view_count": 1}}
        )
    
    return ads

@api_router.post("/advertisements/{ad_id}/click")
async def track_advertisement_click(ad_id: str):
    """Track advertisement click"""
    result = await db.advertisements.update_one(
        {"id": ad_id},
        {"$inc": {"click_count": 1}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Advertisement not found")
    return {"message": "Click tracked"}

# Enhanced Online Users with Forum Moderators
@api_router.get("/community/online-stats")
async def get_online_stats():
    """Get online users statistics with improved offline cleanup"""
    # Cleanup - mark users as offline if they haven't been seen in 10 minutes (increased from 5)
    # This prevents too aggressive cleanup that might mark active users as offline
    cutoff_time = datetime.utcnow() - timedelta(minutes=10)
    await db.users.update_many(
        {
            "is_online": True,
            "last_seen": {"$lt": cutoff_time}
        },
        {"$set": {"is_online": False}}
    )
    
    # Update last_seen for currently online users who are actively using the system
    current_time = datetime.utcnow()
    
    # Get actually online users with more lenient filtering
    online_users = await db.users.find(
        {"is_online": True}, 
        {"_id": 0, "username": 1, "role": 1, "is_vip": 1, "last_seen": 1}
    ).to_list(length=None)
    
    # Filter and categorize by roles with improved logic
    online_admins = []
    online_vips = []
    online_moderators = []
    online_regular = []
    
    for user in online_users:
        role = user.get("role", "user")
        is_vip = user.get("is_vip", False)
        
        # Categorize users based on role hierarchy
        if role == "superuser_admin":
            online_admins.append(user)
        elif role == "superuser_vip" or (is_vip and role != "superuser_admin"):
            online_vips.append(user)
        elif role == "forum_moderator":
            online_moderators.append(user)
        elif role == "user":
            online_regular.append(user)
    
    return OnlineUsersStats(
        total_online=len(online_users),
        online_users=online_regular,
        online_vips=online_vips,
        online_forum_moderators=online_moderators,
        online_admins=online_admins
    )

# Forum Moderator Management
@api_router.post("/admin/forum-moderators")
async def assign_forum_moderator(assignment: ForumModeratorAssign, current_user: User = Depends(require_admin_permission)):
    """Assign user as forum moderator"""
    # Check if user exists
    user = await db.users.find_one({"id": assignment.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user role to forum moderator
    await db.users.update_one(
        {"id": assignment.user_id},
        {"$set": {"role": UserRole.FORUM_MODERATOR}}
    )
    
    # Create moderator assignment record
    moderator = ForumModerator(
        user_id=assignment.user_id,
        username=user["username"],
        topic_id=assignment.topic_id,
        assigned_by=current_user.id
    )
    
    await db.forum_moderators.insert_one(moderator.dict())
    
    return {"message": f"User {user['username']} assigned as forum moderator"}

@api_router.get("/admin/forum-moderators")
async def get_forum_moderators(current_user: User = Depends(require_admin_permission)):
    """Get all forum moderators"""
    moderators = await db.forum_moderators.find({}, {"_id": 0}).to_list(length=None)
    return [ForumModerator(**mod) for mod in moderators]

# Forum Management APIs
@api_router.get("/forum/topics")
async def get_forum_topics():
    """Get all forum topics (public access)"""
    topics = await db.forum_topics.find(
        {"is_active": True}, 
        {"_id": 0}
    ).sort("created_at", 1).to_list(length=None)
    return [ForumTopic(**topic) for topic in topics]

@api_router.post("/admin/forum/topics", response_model=ForumTopic)
async def create_forum_topic(topic_data: ForumTopicCreate, current_user: User = Depends(require_admin_permission)):
    """Create new forum topic (admin only)"""
    topic = ForumTopic(
        name=topic_data.name,
        description=topic_data.description,
        is_public=topic_data.is_public,
        read_permission=topic_data.read_permission,
        write_permission=topic_data.write_permission,
        created_by=current_user.id
    )
    
    await db.forum_topics.insert_one(topic.dict())
    return topic

@api_router.get("/forum/topics/{topic_id}/threads")
async def get_forum_threads(topic_id: str, page: int = 1, limit: int = 20):
    """Get threads in a topic"""
    # Check if topic exists and user has read permission
    topic = await db.forum_topics.find_one({"id": topic_id}, {"_id": 0})
    if not topic:
        raise HTTPException(status_code=404, detail="Forum topic not found")
    
    skip = (page - 1) * limit
    
    threads = await db.forum_threads.find(
        {"topic_id": topic_id, "is_deleted": {"$ne": True}}, 
        {"_id": 0}
    ).sort([("is_pinned", -1), ("last_post_at", -1)]).skip(skip).limit(limit).to_list(length=None)
    
    return {
        "topic": ForumTopic(**topic),
        "threads": [ForumThread(**thread) for thread in threads],
        "page": page,
        "total_threads": topic.get("thread_count", 0)
    }

@api_router.post("/forum/threads", response_model=ForumThread)
async def create_forum_thread(thread_data: ForumThreadCreate, current_user: User = Depends(get_current_user)):
    """Create new forum thread"""
    # Check if user is banned
    if current_user.role == UserRole.BANNED:
        raise HTTPException(status_code=403, detail="Banned users cannot create threads")
    
    # Check topic exists and write permissions
    topic = await db.forum_topics.find_one({"id": thread_data.topic_id}, {"_id": 0})
    if not topic:
        raise HTTPException(status_code=404, detail="Forum topic not found")
    
    # Create thread
    thread = ForumThread(
        topic_id=thread_data.topic_id,
        title=thread_data.title,
        author_id=current_user.id,
        author_name=current_user.username,
        last_post_author=current_user.username
    )
    
    await db.forum_threads.insert_one(thread.dict())
    
    # Award points for creating forum thread
    await points_manager.process_forum_thread(current_user.id, current_user.username, thread.id)
    
    # Create activity feed item
    await create_activity_feed_item(
        current_user.id,
        current_user.username, 
        "forum_thread_created",
        "Neuer Forum-Thread",
        f"Hat einen neuen Thread '{thread_data.title}' erstellt",
        {"thread_id": thread.id, "topic_id": thread_data.topic_id, "thread_title": thread_data.title}
    )
    
    # Create initial post
    initial_post = ForumPost(
        thread_id=thread.id,
        author_id=current_user.id,
        author_name=current_user.username,
        content=thread_data.content
    )
    
    await db.forum_posts.insert_one(initial_post.dict())
    
    # Update topic thread count
    await db.forum_topics.update_one(
        {"id": thread_data.topic_id},
        {"$inc": {"thread_count": 1, "post_count": 1}}
    )
    
    return thread

@api_router.get("/forum/threads/{thread_id}/posts")
async def get_forum_posts(thread_id: str, page: int = 1, limit: int = 50):
    """Get posts in a thread"""
    thread = await db.forum_threads.find_one({"id": thread_id}, {"_id": 0})
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    skip = (page - 1) * limit
    
    posts = await db.forum_posts.find(
        {"thread_id": thread_id, "is_deleted": False}, 
        {"_id": 0}
    ).sort("created_at", 1).skip(skip).limit(limit).to_list(length=None)
    
    return {
        "thread": ForumThread(**thread),
        "posts": [ForumPost(**post) for post in posts],
        "page": page,
        "total_posts": thread.get("post_count", 0)
    }

@api_router.post("/forum/posts", response_model=ForumPost)
async def create_forum_post(post_data: ForumPostCreate, current_user: User = Depends(get_current_user)):
    """Create new forum post"""
    # Check if user is banned
    if current_user.role == UserRole.BANNED:
        raise HTTPException(status_code=403, detail="Banned users cannot post")
    
    # Check thread exists and is not locked
    thread = await db.forum_threads.find_one({"id": post_data.thread_id}, {"_id": 0})
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    if thread.get("is_locked", False):
        # Only moderators can post in locked threads
        if current_user.role not in [UserRole.SUPERUSER_ADMIN, UserRole.SUPERUSER_VIP, UserRole.FORUM_MODERATOR]:
            raise HTTPException(status_code=403, detail="Thread is locked")
    
    post = ForumPost(
        thread_id=post_data.thread_id,
        author_id=current_user.id,
        author_name=current_user.username,
        content=post_data.content,
        parent_post_id=post_data.parent_post_id
    )
    
    await db.forum_posts.insert_one(post.dict())
    
    # Award points for forum post
    await points_manager.process_forum_post(current_user.id, current_user.username, post.id)
    
    # Create activity feed item
    await create_activity_feed_item(
        current_user.id, 
        current_user.username,
        "forum_post_created",
        "Neuer Forum-Post",
        f"Hat einen neuen Beitrag in einem Thread erstellt",
        {"post_id": post.id, "thread_id": post_data.thread_id}
    )
    
    # Update thread stats
    await db.forum_threads.update_one(
        {"id": post_data.thread_id},
        {
            "$inc": {"post_count": 1},
            "$set": {
                "last_post_at": datetime.utcnow(),
                "last_post_author": current_user.username,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Update topic post count
    await db.forum_topics.update_one(
        {"id": thread["topic_id"]},
        {"$inc": {"post_count": 1}}
    )
    
    return post

# Forum Moderation APIs
@api_router.put("/admin/forum/threads/{thread_id}/lock")
async def toggle_thread_lock(thread_id: str, current_user: User = Depends(get_current_user)):
    """Lock/unlock thread (moderators only)"""
    # Check moderator permissions
    if current_user.role not in [UserRole.SUPERUSER_ADMIN, UserRole.SUPERUSER_VIP, UserRole.FORUM_MODERATOR]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    thread = await db.forum_threads.find_one({"id": thread_id}, {"_id": 0})
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    new_lock_status = not thread.get("is_locked", False)
    
    await db.forum_threads.update_one(
        {"id": thread_id},
        {"$set": {"is_locked": new_lock_status}}
    )
    
    action = "gesperrt" if new_lock_status else "entsperrt"
    return {"message": f"Thread {action}"}

@api_router.put("/admin/forum/threads/{thread_id}/pin")
async def toggle_thread_pin(thread_id: str, current_user: User = Depends(get_current_user)):
    """Pin/unpin thread (moderators only)"""
    if current_user.role not in [UserRole.SUPERUSER_ADMIN, UserRole.SUPERUSER_VIP, UserRole.FORUM_MODERATOR]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    thread = await db.forum_threads.find_one({"id": thread_id}, {"_id": 0})
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    new_pin_status = not thread.get("is_pinned", False)
    
    await db.forum_threads.update_one(
        {"id": thread_id},
        {"$set": {"is_pinned": new_pin_status}}
    )
    
    action = "angepinnt" if new_pin_status else "entpinnt"
    return {"message": f"Thread {action}"}

@api_router.delete("/admin/forum/posts/{post_id}")
async def delete_forum_post(post_id: str, current_user: User = Depends(get_current_user)):
    """Delete forum post (moderators and post author only)"""
    post = await db.forum_posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check permissions: post author or moderator
    if (post["author_id"] != current_user.id and 
        current_user.role not in [UserRole.SUPERUSER_ADMIN, UserRole.SUPERUSER_VIP, UserRole.FORUM_MODERATOR]):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Mark as deleted instead of actual deletion
    await db.forum_posts.update_one(
        {"id": post_id},
        {"$set": {"is_deleted": True}}
    )
    
    # Update thread and topic post counts
    thread = await db.forum_threads.find_one({"id": post["thread_id"]}, {"_id": 0})
    if thread:
        await db.forum_threads.update_one(
            {"id": post["thread_id"]},
            {"$inc": {"post_count": -1}}
        )
        
        # Update topic post count
        await db.forum_topics.update_one(
            {"id": thread["topic_id"]},
            {"$inc": {"post_count": -1}}
        )
    
    return {"message": "Post deleted successfully"}

@api_router.delete("/admin/forum/threads/{thread_id}")
async def delete_forum_thread(thread_id: str, current_user: User = Depends(get_current_user)):
    """Delete forum thread (VIP/ADMIN only)"""
    # Check permissions: only VIPs and Admins can delete threads
    if current_user.role not in [UserRole.SUPERUSER_ADMIN, UserRole.SUPERUSER_VIP]:
        raise HTTPException(status_code=403, detail="Nur VIPs und Admins können Threads löschen")
    
    # Find the thread
    thread = await db.forum_threads.find_one({"id": thread_id}, {"_id": 0})
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Mark thread as deleted (soft delete)
    await db.forum_threads.update_one(
        {"id": thread_id},
        {"$set": {"is_deleted": True}}
    )
    
    # Mark all posts in thread as deleted
    posts_result = await db.forum_posts.update_many(
        {"thread_id": thread_id, "is_deleted": False},
        {"$set": {"is_deleted": True}}
    )
    
    # Update topic thread and post counts
    deleted_posts_count = posts_result.modified_count
    await db.forum_topics.update_one(
        {"id": thread["topic_id"]},
        {
            "$inc": {
                "thread_count": -1,
                "post_count": -deleted_posts_count
            }
        }
    )
    
    return {"message": f"Thread und {deleted_posts_count} Posts wurden gelöscht"}

@api_router.delete("/admin/forum/topics/{topic_id}")
async def delete_forum_topic(topic_id: str, current_user: User = Depends(get_current_user)):
    """Delete forum topic (ADMIN only)"""
    # Check permissions: only Admins can delete topics
    if current_user.role not in [UserRole.SUPERUSER_ADMIN]:
        raise HTTPException(status_code=403, detail="Nur Admins können Topics löschen")
    
    # Find the topic
    topic = await db.forum_topics.find_one({"id": topic_id}, {"_id": 0})
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    # Mark topic as deleted (soft delete)
    await db.forum_topics.update_one(
        {"id": topic_id},
        {"$set": {"is_active": False}}
    )
    
    # Mark all threads in topic as deleted
    threads_result = await db.forum_threads.update_many(
        {"topic_id": topic_id, "is_deleted": {"$ne": True}},
        {"$set": {"is_deleted": True}}
    )
    
    # Mark all posts in topic as deleted
    posts_result = await db.forum_posts.update_many(
        {"thread_id": {"$in": await db.forum_threads.distinct("id", {"topic_id": topic_id})}},
        {"$set": {"is_deleted": True}}
    )
    
    return {"message": f"Topic gelöscht: {threads_result.modified_count} Threads und {posts_result.modified_count} Posts"}

# Points System API Endpoints
@api_router.get("/points/summary/{user_id}")
async def get_user_points_summary(user_id: str, current_user: User = Depends(get_current_user)):
    """Get detailed points summary for a user"""
    # Users can only see their own detailed summary, admins can see anyone's
    if current_user.id != user_id and current_user.role not in [UserRole.SUPERUSER_ADMIN, UserRole.SUPERUSER_VIP]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calculate total earned and spent
    earned_result = await db.point_transactions.aggregate([
        {"$match": {"user_id": user_id, "points": {"$gt": 0}}},
        {"$group": {"_id": None, "total": {"$sum": "$points"}}}
    ]).to_list(length=None)
    
    spent_result = await db.point_transactions.aggregate([
        {"$match": {"user_id": user_id, "points": {"$lt": 0}}},
        {"$group": {"_id": None, "total": {"$sum": "$points"}}}
    ]).to_list(length=None)
    
    # Calculate today's earnings
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_result = await db.point_transactions.aggregate([
        {"$match": {"user_id": user_id, "points": {"$gt": 0}, "created_at": {"$gte": today_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$points"}}}
    ]).to_list(length=None)
    
    # Get recent transactions
    recent_transactions = await db.point_transactions.find(
        {"user_id": user_id}, 
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(length=None)
    
    # Calculate user's rank
    users_above = await db.users.count_documents({"points": {"$gt": user["points"]}})
    rank_position = users_above + 1
    
    return UserPointsSummary(
        user_id=user_id,
        username=user["username"],
        current_points=user["points"],
        total_earned=earned_result[0]["total"] if earned_result else 0,
        total_spent=abs(spent_result[0]["total"]) if spent_result else 0,
        today_earned=today_result[0]["total"] if today_result else 0,
        rank_position=rank_position,
        recent_transactions=recent_transactions
    )

@api_router.get("/points/transactions")
async def get_point_transactions(user_id: Optional[str] = None, limit: int = 50, page: int = 1, current_user: User = Depends(get_current_user)):
    """Get point transactions (own transactions or all if admin)"""
    if user_id and current_user.id != user_id and current_user.role not in [UserRole.SUPERUSER_ADMIN, UserRole.SUPERUSER_VIP]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    filter_query = {}
    if user_id:
        filter_query["user_id"] = user_id
    elif current_user.role not in [UserRole.SUPERUSER_ADMIN, UserRole.SUPERUSER_VIP]:
        # Regular users can only see their own transactions
        filter_query["user_id"] = current_user.id
    
    skip = (page - 1) * limit
    transactions = await db.point_transactions.find(
        filter_query, 
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=None)
    
    return transactions

@api_router.post("/admin/points/award")
async def award_points_manually(transaction_data: PointTransactionCreate, current_user: User = Depends(require_admin_permission)):
    """Manually award or deduct points (admin only)"""
    user = await db.users.find_one({"id": transaction_data.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    transaction = await points_manager.award_points(
        user_id=transaction_data.user_id,
        username=user["username"],
        points=transaction_data.points,
        reason=transaction_data.reason,
        category=transaction_data.category,
        reference_id=transaction_data.reference_id,
        created_by=current_user.id,
        is_automated=False
    )
    
    return transaction

@api_router.get("/admin/points/rules")
async def get_point_earning_rules(current_user: User = Depends(require_admin_permission)):
    """Get all point earning rules (admin only)"""
    rules = await db.point_earning_rules.find({}, {"_id": 0}).sort("action", 1).to_list(length=None)
    return [PointEarningRule(**rule) for rule in rules]

@api_router.post("/admin/points/rules")
async def create_point_earning_rule(rule_data: PointEarningRuleCreate, current_user: User = Depends(require_admin_permission)):
    """Create new point earning rule (admin only)"""
    rule = PointEarningRule(**rule_data.dict())
    await db.point_earning_rules.insert_one(rule.dict())
    return rule

@api_router.put("/admin/points/rules/{rule_id}")
async def update_point_earning_rule(rule_id: str, rule_data: PointEarningRuleCreate, current_user: User = Depends(require_admin_permission)):
    """Update point earning rule (admin only)"""
    result = await db.point_earning_rules.update_one(
        {"id": rule_id},
        {"$set": rule_data.dict()}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"message": "Rule updated successfully"}

@api_router.delete("/admin/points/rules/{rule_id}")
async def delete_point_earning_rule(rule_id: str, current_user: User = Depends(require_admin_permission)):
    """Delete point earning rule (admin only)"""
    result = await db.point_earning_rules.delete_one({"id": rule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"message": "Rule deleted successfully"}

@api_router.get("/leaderboard")
async def get_leaderboard(limit: int = 100):
    """Get points leaderboard (public access)"""
    users = await db.users.find(
        {"points": {"$gt": 0}}, 
        {"_id": 0, "username": 1, "points": 1, "role": 1, "is_vip": 1}
    ).sort("points", -1).limit(limit).to_list(length=None)
    
    # Add rank position
    for i, user in enumerate(users):
        user["rank"] = i + 1
    
    return users

# Advanced Toplist System API Endpoints
@api_router.post("/toplist/advanced")
async def get_advanced_toplist(filter_data: ToplistFilter):
    """Get advanced toplist with filtering and detailed stats"""
    # Build time filter
    time_filter = {}
    now = datetime.utcnow()
    
    if filter_data.time_period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        time_filter["last_seen"] = {"$gte": start_date}
    elif filter_data.time_period == "this_week":
        start_date = now - timedelta(days=7)
        time_filter["last_seen"] = {"$gte": start_date}
    elif filter_data.time_period == "this_month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        time_filter["last_seen"] = {"$gte": start_date}
    
    # Build base query
    query = {"points": {"$gt": 0}}
    query.update(time_filter)
    
    if filter_data.user_role:
        query["role"] = filter_data.user_role
    if filter_data.min_points:
        query["points"] = {"$gte": filter_data.min_points}
    
    # Get users with enhanced stats
    users = await db.users.find(query, {"_id": 0}).sort("points", -1).limit(filter_data.limit).to_list(length=None)
    
    toplist_entries = []
    for i, user in enumerate(users):
        # Calculate activity stats
        forum_posts_count = await db.forum_posts.count_documents({"author_id": user["id"], "is_deleted": {"$ne": True}})
        forum_threads_count = await db.forum_threads.count_documents({"author_id": user["id"], "is_deleted": {"$ne": True}})
        guestbook_entries_count = await db.guestbook_entries.count_documents({"author_id": user["id"]})
        
        # Get total earned/spent
        earned_result = await db.point_transactions.aggregate([
            {"$match": {"user_id": user["id"], "points": {"$gt": 0}}},
            {"$group": {"_id": None, "total": {"$sum": "$points"}}}
        ]).to_list(length=None)
        
        spent_result = await db.point_transactions.aggregate([
            {"$match": {"user_id": user["id"], "points": {"$lt": 0}}},
            {"$group": {"_id": None, "total": {"$sum": "$points"}}}
        ]).to_list(length=None)
        
        # Calculate days active (simplified)
        days_active = max(1, (now - user["joined_date"]).days)
        
        entry = ToplistEntry(
            user_id=user["id"],
            username=user["username"],
            points=user["points"],
            rank=i + 1,
            role=user["role"],
            is_vip=user.get("is_vip", False),
            total_earned=earned_result[0]["total"] if earned_result else 0,
            total_spent=abs(spent_result[0]["total"]) if spent_result else 0,
            forum_posts=forum_posts_count,
            forum_threads=forum_threads_count,
            guestbook_entries=guestbook_entries_count,
            days_active=days_active,
            last_activity=user.get("last_seen", user["joined_date"]),
            joined_date=user["joined_date"]
        )
        toplist_entries.append(entry)
    
    return toplist_entries

@api_router.get("/toplist/stats")
async def get_toplist_stats():
    """Get comprehensive toplist statistics"""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)
    
    # Basic counts
    total_users = await db.users.count_documents({})
    active_today = await db.users.count_documents({"last_seen": {"$gte": today_start}})
    active_week = await db.users.count_documents({"last_seen": {"$gte": week_start}})
    
    # Total points distributed
    total_points_result = await db.point_transactions.aggregate([
        {"$match": {"points": {"$gt": 0}}},
        {"$group": {"_id": None, "total": {"$sum": "$points"}}}
    ]).to_list(length=None)
    
    total_points = total_points_result[0]["total"] if total_points_result else 0
    
    # Top earner today
    today_earner_result = await db.point_transactions.aggregate([
        {"$match": {"created_at": {"$gte": today_start}, "points": {"$gt": 0}}},
        {"$group": {"_id": "$user_id", "username": {"$first": "$username"}, "points": {"$sum": "$points"}}},
        {"$sort": {"points": -1}},
        {"$limit": 1}
    ]).to_list(length=None)
    
    top_earner_today = None
    if today_earner_result:
        top_earner_today = {
            "user_id": today_earner_result[0]["_id"],
            "username": today_earner_result[0]["username"],
            "points_today": today_earner_result[0]["points"]
        }
    
    # Category stats
    categories = {
        "forum": await db.point_transactions.count_documents({"category": "forum", "points": {"$gt": 0}}),
        "guestbook": await db.point_transactions.count_documents({"category": "guestbook", "points": {"$gt": 0}}),
        "chat": await db.point_transactions.count_documents({"category": "chat", "points": {"$gt": 0}}),
        "daily": await db.point_transactions.count_documents({"category": "daily", "points": {"$gt": 0}})
    }
    
    return ToplistStats(
        total_users=total_users,
        active_users_today=active_today,
        active_users_week=active_week,
        total_points_distributed=total_points,
        top_earner_today=top_earner_today,
        categories=categories
    )

# PHASE 5: Social Features API Endpoints

# Private Messaging System
@api_router.get("/messages/conversations")
async def get_user_conversations(current_user: User = Depends(get_current_user)):
    """Get all conversations for current user"""
    conversations = await db.conversations.find(
        {"participants": current_user.id}, 
        {"_id": 0}
    ).sort("last_message_at", -1).to_list(length=None)
    
    return [Conversation(**conv) for conv in conversations]

@api_router.get("/messages/conversation/{conversation_id}")
async def get_conversation_messages(conversation_id: str, page: int = 1, limit: int = 50, current_user: User = Depends(get_current_user)):
    """Get messages in a conversation"""
    # Verify user is part of conversation
    conversation = await db.conversations.find_one(
        {"id": conversation_id, "participants": current_user.id}, 
        {"_id": 0}
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    skip = (page - 1) * limit
    messages = await db.private_messages.find(
        {"conversation_id": conversation_id, "is_deleted": False}, 
        {"_id": 0}
    ).sort("timestamp", -1).skip(skip).limit(limit).to_list(length=None)
    
    # Mark messages as read
    await db.private_messages.update_many(
        {
            "conversation_id": conversation_id,
            "recipient_id": current_user.id,
            "is_read": False
        },
        {"$set": {"is_read": True}}
    )
    
    # Update unread count in conversation
    await db.conversations.update_one(
        {"id": conversation_id},
        {"$set": {f"unread_counts.{current_user.id}": 0}}
    )
    
    return [PrivateMessage(**msg) for msg in reversed(messages)]

@api_router.post("/messages/send")
async def send_private_message(message_data: MessageCreateRequest, current_user: User = Depends(get_current_user)):
    """Send a private message"""
    # Get recipient info
    recipient = await db.users.find_one({"id": message_data.recipient_id}, {"_id": 0})
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    # Find or create conversation
    conversation = await db.conversations.find_one(
        {
            "$or": [
                {"participants": {"$all": [current_user.id, message_data.recipient_id]}},
                {"participants": {"$all": [message_data.recipient_id, current_user.id]}}
            ]
        },
        {"_id": 0}
    )
    
    if not conversation:
        # Create new conversation
        conversation = Conversation(
            participants=[current_user.id, message_data.recipient_id],
            participant_usernames=[current_user.username, recipient["username"]],
            unread_counts={current_user.id: 0, message_data.recipient_id: 0}
        )
        await db.conversations.insert_one(conversation.dict())
    
    # Create message
    private_message = PrivateMessage(
        conversation_id=conversation["id"] if "id" in conversation else conversation.id,
        sender_id=current_user.id,
        sender_username=current_user.username,
        recipient_id=message_data.recipient_id,
        recipient_username=recipient["username"],
        message=message_data.message,
        message_type=message_data.message_type,
        reply_to_message_id=message_data.reply_to_message_id
    )
    
    await db.private_messages.insert_one(private_message.dict())
    
    # Update conversation
    conv_id = conversation["id"] if "id" in conversation else conversation.id
    current_unread = conversation.get("unread_counts", {}).get(message_data.recipient_id, 0) if "unread_counts" in conversation else 0
    
    await db.conversations.update_one(
        {"id": conv_id},
        {
            "$set": {
                "last_message": message_data.message[:100] + "..." if len(message_data.message) > 100 else message_data.message,
                "last_message_at": datetime.utcnow(),
                "last_message_by": current_user.username,
                f"unread_counts.{message_data.recipient_id}": current_unread + 1
            }
        }
    )
    
    return private_message

@api_router.get("/messages/unread-count")
async def get_unread_message_count(current_user: User = Depends(get_current_user)):
    """Get total unread message count for current user"""
    conversations = await db.conversations.find(
        {"participants": current_user.id}, 
        {"_id": 0, "unread_counts": 1}
    ).to_list(length=None)
    
    total_unread = sum(conv.get("unread_counts", {}).get(current_user.id, 0) for conv in conversations)
    return {"unread_count": total_unread}

# Friendship System
@api_router.get("/friends")
async def get_user_friends(current_user: User = Depends(get_current_user)):
    """Get friends list for current user"""
    friendships = await db.friendships.find(
        {
            "$or": [
                {"user1_id": current_user.id},
                {"user2_id": current_user.id}
            ]
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=None)
    
    friends = []
    for friendship in friendships:
        friend_id = friendship["user2_id"] if friendship["user1_id"] == current_user.id else friendship["user1_id"]
        friend_username = friendship["user2_username"] if friendship["user1_id"] == current_user.id else friendship["user1_username"]
        
        # Get friend's online status and basic info
        friend_data = await db.users.find_one({"id": friend_id}, {"_id": 0, "is_online": 1, "last_seen": 1, "role": 1, "is_vip": 1, "points": 1})
        
        friends.append({
            "friendship_id": friendship["id"],
            "friend_id": friend_id,
            "friend_username": friend_username,
            "friendship_date": friendship["created_at"],
            "is_online": friend_data.get("is_online", False) if friend_data else False,
            "last_seen": friend_data.get("last_seen") if friend_data else None,
            "role": friend_data.get("role", "user") if friend_data else "user",
            "is_vip": friend_data.get("is_vip", False) if friend_data else False,
            "points": friend_data.get("points", 0) if friend_data else 0
        })
    
    return friends

@api_router.post("/friends/request")
async def send_friend_request(request_data: FriendRequestCreate, current_user: User = Depends(get_current_user)):
    """Send a friend request"""
    # Check if recipient exists
    recipient = await db.users.find_one({"id": request_data.recipient_id}, {"_id": 0})
    if not recipient:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already friends
    existing_friendship = await db.friendships.find_one(
        {
            "$or": [
                {"user1_id": current_user.id, "user2_id": request_data.recipient_id},
                {"user1_id": request_data.recipient_id, "user2_id": current_user.id}
            ]
        }
    )
    if existing_friendship:
        raise HTTPException(status_code=400, detail="Already friends with this user")
    
    # Check if request already exists
    existing_request = await db.friend_requests.find_one(
        {
            "$or": [
                {"sender_id": current_user.id, "recipient_id": request_data.recipient_id, "status": "pending"},
                {"sender_id": request_data.recipient_id, "recipient_id": current_user.id, "status": "pending"}
            ]
        }
    )
    if existing_request:
        raise HTTPException(status_code=400, detail="Friend request already exists")
    
    # Create friend request
    friend_request = FriendRequest(
        sender_id=current_user.id,
        sender_username=current_user.username,
        recipient_id=request_data.recipient_id,
        recipient_username=recipient["username"],
        message=request_data.message
    )
    
    await db.friend_requests.insert_one(friend_request.dict())
    
    # Create personal notification for recipient
    await create_personal_notification(
        user_id=request_data.recipient_id,
        notification_type="friend_request",
        title="📬 Neue Freundschaftsanfrage",
        message=f"{current_user.username} möchte mit dir befreundet sein!",
        sender_id=current_user.id,
        sender_username=current_user.username,
        action_url=f"/friends?tab=received&highlight={friend_request.id}",
        action_text="Anfrage ansehen",
        reference_id=friend_request.id
    )
    
    return friend_request

@api_router.get("/friends/requests")
async def get_friend_requests(current_user: User = Depends(get_current_user)):
    """Get friend requests (sent and received)"""
    sent_requests = await db.friend_requests.find(
        {"sender_id": current_user.id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=None)
    
    received_requests = await db.friend_requests.find(
        {"recipient_id": current_user.id, "status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=None)
    
    return {
        "sent": [FriendRequest(**req) for req in sent_requests],
        "received": [FriendRequest(**req) for req in received_requests]
    }

@api_router.put("/friends/request/{request_id}/respond")
async def respond_to_friend_request(request_id: str, accept: bool, current_user: User = Depends(get_current_user)):
    """Accept or decline a friend request"""
    # Find the request
    friend_request = await db.friend_requests.find_one(
        {"id": request_id, "recipient_id": current_user.id, "status": "pending"},
        {"_id": 0}
    )
    if not friend_request:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    status = "accepted" if accept else "declined"
    
    # Update request status
    await db.friend_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": status,
                "responded_at": datetime.utcnow()
            }
        }
    )
    
    if accept:
        # Create friendship
        friendship = Friendship(
            user1_id=friend_request["sender_id"],
            user1_username=friend_request["sender_username"],
            user2_id=current_user.id,
            user2_username=current_user.username
        )
        await db.friendships.insert_one(friendship.dict())
        
        # Award points for making friends
        await points_manager.award_points(
            friend_request["sender_id"], 
            friend_request["sender_username"], 
            5, 
            f"Freundschaft mit {current_user.username}", 
            "social"
        )
        await points_manager.award_points(
            current_user.id, 
            current_user.username, 
            5, 
            f"Freundschaft mit {friend_request['sender_username']}", 
            "social"
        )
        
        return {"message": "Friend request accepted", "friendship": friendship}
    else:
        return {"message": "Friend request declined"}

# Enhanced Profile System
@api_router.get("/profile/{username}/enhanced")
async def get_enhanced_profile(username: str):
    """Get enhanced profile with customization and activity feed"""
    user = await db.users.find_one({"username": username}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get profile customization
    customization = await db.profile_customizations.find_one(
        {"user_id": user["id"]}, 
        {"_id": 0}
    )
    
    # Get recent activity (if user allows it)
    activity_feed = []
    if not customization or customization.get("show_activity_feed", True):
        recent_activities = await db.activity_feed.find(
            {"user_id": user["id"], "is_public": True},
            {"_id": 0}
        ).sort("timestamp", -1).limit(20).to_list(length=None)
        activity_feed = [ActivityFeedItem(**activity) for activity in recent_activities]
    
    # Get friends count
    friends_count = await db.friendships.count_documents(
        {
            "$or": [
                {"user1_id": user["id"]},
                {"user2_id": user["id"]}
            ]
        }
    )
    
    return {
        "user": UserResponse(**{k: v for k, v in user.items() if k != "password"}),
        "customization": ProfileCustomization(**customization) if customization else None,
        "activity_feed": activity_feed,
        "friends_count": friends_count,
        "stats": {
            "forum_posts": await db.forum_posts.count_documents({"author_id": user["id"], "is_deleted": {"$ne": True}}),
            "forum_threads": await db.forum_threads.count_documents({"author_id": user["id"], "is_deleted": {"$ne": True}}),
            "guestbook_entries": await db.guestbook_entries.count_documents({"author_id": user["id"]}),
            "days_since_joined": (datetime.utcnow() - user["joined_date"]).days
        }
    }

@api_router.put("/profile/customization")
async def update_profile_customization(customization_data: dict, current_user: User = Depends(get_current_user)):
    """Update profile customization settings"""
    # Prepare customization object
    customization = ProfileCustomization(
        user_id=current_user.id,
        **{k: v for k, v in customization_data.items() if k in ProfileCustomization.__fields__}
    )
    
    # Upsert customization
    await db.profile_customizations.update_one(
        {"user_id": current_user.id},
        {"$set": customization.dict()},
        upsert=True
    )
    
    return {"message": "Profile customization updated", "customization": customization}

@api_router.put("/profile/status")
async def update_status_message(status_data: dict, current_user: User = Depends(get_current_user)):
    """Update user status message"""
    status_message = status_data.get("status_message", "")
    status_emoji = status_data.get("status_emoji", "")
    
    # Validate status message length
    if len(status_message) > 100:
        raise HTTPException(status_code=400, detail="Status message too long (max 100 characters)")
    
    await db.profile_customizations.update_one(
        {"user_id": current_user.id},
        {
            "$set": {
                "status_message": status_message,
                "status_emoji": status_emoji,
                "updated_at": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    return {"message": "Status updated", "status_message": status_message, "status_emoji": status_emoji}

@api_router.get("/themes")
async def get_available_themes():
    """Get available profile themes"""
    themes = await db.profile_themes.find(
        {"is_public": True}, 
        {"_id": 0}
    ).sort("name", 1).to_list(length=None)
    
    # Add default themes
    default_themes = [
        {
            "id": "default_blue",
            "name": "RichComm Blue",
            "colors": {
                "primary": "#8b5cf6",
                "secondary": "#6366f1", 
                "accent": "#06b6d4",
                "background": "#0f172a"
            },
            "is_default": True
        },
        {
            "id": "dark_purple",
            "name": "Dark Purple",
            "colors": {
                "primary": "#7c3aed",
                "secondary": "#a855f7",
                "accent": "#c084fc",
                "background": "#1e1b4b"
            },
            "is_default": True
        },
        {
            "id": "neon_green",
            "name": "Neon Green",
            "colors": {
                "primary": "#10b981",
                "secondary": "#059669",
                "accent": "#34d399",
                "background": "#064e3b"
            },
            "is_default": True
        }
    ]
    
    return default_themes + [ProfileTheme(**theme) for theme in themes]

@api_router.get("/activity-feed/{user_id}")
async def get_user_activity_feed(user_id: str, limit: int = 50, current_user: User = Depends(get_current_user)):
    """Get activity feed for a specific user"""
    # Check if user exists
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check privacy settings
    customization = await db.profile_customizations.find_one({"user_id": user_id}, {"_id": 0})
    if customization and not customization.get("show_activity_feed", True):
        if current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Activity feed is private")
    
    # Build query - friends can see friends_only activities
    query = {"user_id": user_id, "is_public": True}
    
    # Check if current user is friends with target user
    if current_user.id != user_id:
        is_friend = await db.friendships.find_one(
            {
                "$or": [
                    {"user1_id": current_user.id, "user2_id": user_id},
                    {"user1_id": user_id, "user2_id": current_user.id}
                ]
            }
        )
        if is_friend:
            query["$or"] = [
                {"is_public": True},
                {"friends_only": True}
            ]
    else:
        # Own activity feed - see everything
        del query["is_public"]
    
    activities = await db.activity_feed.find(
        query,
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(length=None)
    
    return [ActivityFeedItem(**activity) for activity in activities]

# Activity Feed Helper Functions
async def create_activity_feed_item(user_id: str, username: str, activity_type: str, title: str, description: str, data: dict = {}, is_public: bool = True, friends_only: bool = False):
    """Helper function to create activity feed items"""
    activity = ActivityFeedItem(
        user_id=user_id,
        username=username,
        activity_type=activity_type,
        activity_title=title,
        activity_description=description,
        activity_data=data,
        is_public=is_public,
        friends_only=friends_only
    )
    
    await db.activity_feed.insert_one(activity.dict())
    return activity

# Personal Notifications System API Endpoints
@api_router.get("/notifications/personal")
async def get_personal_notifications(current_user: User = Depends(get_current_user)):
    """Get personal notifications for current user"""
    now = datetime.utcnow()
    
    # Clean up expired notifications
    await db.personal_notifications.delete_many({
        "user_id": current_user.id,
        "expires_at": {"$lte": now}
    })
    
    # Get active notifications
    notifications = await db.personal_notifications.find(
        {
            "user_id": current_user.id,
            "$or": [
                {"expires_at": None},
                {"expires_at": {"$gt": now}}
            ]
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=None)
    
    return [PersonalNotification(**notif) for notif in notifications]

@api_router.put("/notifications/personal/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: User = Depends(get_current_user)):
    """Mark notification as read"""
    result = await db.personal_notifications.update_one(
        {"id": notification_id, "user_id": current_user.id},
        {"$set": {"is_read": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}

@api_router.delete("/notifications/personal/{notification_id}")
async def dismiss_notification(notification_id: str, current_user: User = Depends(get_current_user)):
    """Dismiss/delete personal notification"""
    result = await db.personal_notifications.delete_one({
        "id": notification_id,
        "user_id": current_user.id
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification dismissed"}

# Helper function to create personal notifications
async def create_personal_notification(
    user_id: str, 
    notification_type: str, 
    title: str, 
    message: str, 
    sender_id: str = None, 
    sender_username: str = None,
    action_url: str = None, 
    action_text: str = None,
    reference_id: str = None,
    expires_hours: int = 24
):
    """Create a personal notification for a specific user"""
    expires_at = datetime.utcnow() + timedelta(hours=expires_hours)
    
    notification = PersonalNotification(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        message=message,
        action_url=action_url,
        action_text=action_text,
        sender_id=sender_id,
        sender_username=sender_username,
        reference_id=reference_id,
        expires_at=expires_at
    )
    
    await db.personal_notifications.insert_one(notification.dict())
    return notification

# Chat Moderation System API Endpoints
@api_router.get("/admin/chat/pending-messages")
async def get_pending_messages(current_user: User = Depends(get_current_user)):
    """Get pending messages for moderation (VIP/ADMIN only)"""
    if current_user.role not in [UserRole.SUPERUSER_ADMIN, UserRole.SUPERUSER_VIP]:
        raise HTTPException(status_code=403, detail="Only VIP/ADMIN can access moderation queue")
    
    pending_messages = await db.pending_chat_messages.find(
        {}, {"_id": 0}
    ).sort("timestamp", 1).to_list(length=None)
    
    return [PendingChatMessage(**msg) for msg in pending_messages]

@api_router.put("/admin/chat/approve-message/{message_id}")
async def approve_message(message_id: str, current_user: User = Depends(get_current_user)):
    """Approve pending chat message (VIP/ADMIN only)"""
    if current_user.role not in [UserRole.SUPERUSER_ADMIN, UserRole.SUPERUSER_VIP]:
        raise HTTPException(status_code=403, detail="Only VIP/ADMIN can moderate messages")
    
    # Find pending message
    pending_msg = await db.pending_chat_messages.find_one({"id": message_id}, {"_id": 0})
    if not pending_msg:
        raise HTTPException(status_code=404, detail="Pending message not found")
    
    # Create approved message
    approved_message = ChatMessage(
        room_id=pending_msg["room_id"],
        user_id=pending_msg["user_id"],
        username=pending_msg["username"],
        message=pending_msg["message"],
        timestamp=pending_msg["timestamp"],
        is_approved=True,
        pending_moderation=False,
        approved_by=current_user.id,
        approved_at=datetime.utcnow()
    )
    
    # Save approved message
    await db.chat_messages.insert_one(approved_message.dict())
    
    # Remove from pending queue
    await db.pending_chat_messages.delete_one({"id": message_id})
    
    # Broadcast approved message to room
    chat_message = {
        "type": "message",
        "message": approved_message.message,
        "username": approved_message.username,
        "user_role": pending_msg.get("user_role", "user"),
        "timestamp": approved_message.timestamp.isoformat(),
        "approved": True
    }
    
    await chat_manager.send_room_message(pending_msg["room_id"], json.dumps(chat_message))
    
    return {"message": "Message approved and sent"}

@api_router.delete("/admin/chat/reject-message/{message_id}")
async def reject_message(message_id: str, current_user: User = Depends(get_current_user)):
    """Reject pending chat message (VIP/ADMIN only)"""
    if current_user.role not in [UserRole.SUPERUSER_ADMIN, UserRole.SUPERUSER_VIP]:
        raise HTTPException(status_code=403, detail="Only VIP/ADMIN can moderate messages")
    
    # Remove from pending queue
    result = await db.pending_chat_messages.delete_one({"id": message_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pending message not found")
    
    return {"message": "Message rejected"}

@api_router.put("/admin/chat/rooms/{room_id}/moderation")
async def toggle_room_moderation(room_id: str, enable: bool, current_user: User = Depends(require_admin_permission)):
    """Enable/disable moderation for a chat room (ADMIN only)"""
    result = await db.chat_rooms.update_one(
        {"id": room_id},
        {"$set": {"moderated": enable}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Room not found")
    
    return {"message": f"Room moderation {'enabled' if enable else 'disabled'}"}

# Initialize default forum topics
async def init_default_forum_topics():
    """Create default forum topics"""
    default_topics = [
        {
            "name": "Allgemeine Diskussion",
            "description": "Allgemeine Themen und Diskussionen der Community",
            "is_public": True,
            "read_permission": ForumPermission.READ_WRITE,
            "write_permission": ForumPermission.READ_WRITE
        },
        {
            "name": "Gaming",
            "description": "Diskussionen über Spiele und Gaming",
            "is_public": True,
            "read_permission": ForumPermission.READ_WRITE,
            "write_permission": ForumPermission.READ_WRITE
        },
        {
            "name": "Technik & IT",
            "description": "Technische Diskussionen und IT-Themen",
            "is_public": True,
            "read_permission": ForumPermission.READ_WRITE,
            "write_permission": ForumPermission.READ_WRITE
        },
        {
            "name": "VIP Bereich",
            "description": "Exklusiver Bereich für VIP-Mitglieder",
            "is_public": False,
            "read_permission": ForumPermission.MODERATOR,
            "write_permission": ForumPermission.MODERATOR
        }
    ]
    
    for topic_data in default_topics:
        existing_topic = await db.forum_topics.find_one({"name": topic_data["name"]}, {"_id": 0})
        if not existing_topic:
            topic = ForumTopic(
                name=topic_data["name"],
                description=topic_data["description"],
                is_public=topic_data["is_public"],
                read_permission=topic_data["read_permission"],
                write_permission=topic_data["write_permission"],
                created_by="system"
            )
            await db.forum_topics.insert_one(topic.dict())

# WebSocket Chat Endpoints - Direct on main app (not API router)
@app.websocket("/api/ws/chat/{room_id}")
async def websocket_chat_endpoint(websocket: WebSocket, room_id: str, token: str = None):
    """Simplified and stable WebSocket endpoint for chat"""
    user = None
    try:
        print(f"🔌 New WebSocket connection attempt for room {room_id}")
        
        # Validate JWT token first
        try:
            if not token:
                print("❌ No token provided")
                await websocket.close(code=1008, reason="Authentication required")
                return
                
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            if not username:
                print("❌ Invalid token provided")
                await websocket.close(code=1008, reason="Invalid token")
                return
                
            user_data = await db.users.find_one({"username": username}, {"_id": 0})
            if not user_data:
                print("❌ User not found")
                await websocket.close(code=1008, reason="User not found")
                return
                
            user = User(**user_data)
        except Exception as e:
            print(f"❌ Token validation error: {e}")
            await websocket.close(code=1008, reason="Token validation failed")
            return
        
        # Check if user is banned
        if user.role == UserRole.BANNED:
            print(f"❌ Banned user {user.username} attempted to connect")
            await websocket.close(code=1008, reason="User is banned")
            return

        # Check if room exists
        room = await db.chat_rooms.find_one({"id": room_id}, {"_id": 0})
        if not room:
            print(f"❌ Room {room_id} not found")
            await websocket.close(code=1008, reason="Chat room not found")
            return
        
        print(f"✅ User {user.username} connecting to room {room['name']}")
        
        # Connect user to chat manager - this also accepts the connection
        success = await chat_manager.connect(websocket, user.id, room_id)
        if not success:
            print(f"❌ Failed to connect {user.username} to chat manager")
            return
            
        # Update user online status
        await db.users.update_one(
            {"id": user.id},
            {
                "$set": {
                    "is_online": True,
                    "current_room": room_id,
                    "last_seen": datetime.utcnow()
                }
            }
        )
        
        print(f"✅ {user.username} successfully connected to {room['name']}")
        
        # Send welcome message
        welcome_msg = {
            "type": "system",
            "message": f"Willkommen im {room['name']}, {user.username}!",
            "timestamp": datetime.utcnow().isoformat(),
            "user_count": chat_manager.get_user_count(room_id)
        }
        await websocket.send_text(json.dumps(welcome_msg))
        
        # Main message loop with improved error handling
        while True:
            try:
                # Wait for message with timeout
                message_data = await asyncio.wait_for(
                    websocket.receive_text(), 
                    timeout=60.0  # 60 second timeout
                )
                
                # Update last seen on activity
                await db.users.update_one(
                    {"id": user.id},
                    {"$set": {"last_seen": datetime.utcnow()}}
                )
                
                # Process message
                if not message_data or not message_data.strip():
                    continue
                    
                message_content = message_data.strip()
                
                # Handle chat commands
                if message_content.startswith('/'):
                    try:
                        command_result = await chat_commands.parse_and_execute(user, room_id, message_content)
                        if command_result:
                            await websocket.send_text(json.dumps(command_result))
                    except Exception as e:
                        print(f"❌ Command error: {e}")
                        error_msg = {
                            "type": "error",
                            "message": "Fehler beim Verarbeiten des Kommandos",
                            "timestamp": datetime.utcnow().isoformat()
                        }
                        await websocket.send_text(json.dumps(error_msg))
                    continue
                
                # Regular message handling
                chat_message = {
                    "type": "message",
                    "message": message_content,
                    "username": user.username,
                    "user_role": user.role,
                    "timestamp": datetime.utcnow().isoformat(),
                    "is_vip": user.is_vip
                }
                
                # Check if room has moderation enabled
                is_moderated = room.get("moderated", False)
                is_moderator = user.role in [UserRole.SUPERUSER_ADMIN, UserRole.SUPERUSER_VIP]
                
                if is_moderated and not is_moderator:
                    # Save to pending queue for moderation
                    pending_msg = PendingChatMessage(
                        room_id=room_id,
                        user_id=user.id,
                        username=user.username,
                        message=message_content,
                        user_role=user.role
                    )
                    await db.pending_chat_messages.insert_one(pending_msg.dict())
                    
                    # Send confirmation to sender
                    await websocket.send_text(json.dumps({
                        "type": "message_pending",
                        "message": "Nachricht wartet auf Freigabe durch Moderatoren",
                        "timestamp": datetime.utcnow().isoformat()
                    }))
                else:
                    # Save message to database
                    message_doc = ChatMessage(
                        room_id=room_id,
                        user_id=user.id,
                        username=user.username,
                        message=message_content,
                        is_approved=True,
                        pending_moderation=False
                    )
                    await db.chat_messages.insert_one(message_doc.dict())
                    
                    # Award points for chat message
                    await points_manager.process_chat_message(user.id, user.username)
                    
                    # Broadcast to room
                    await chat_manager.send_room_message(room_id, json.dumps(chat_message))
                    
            except asyncio.TimeoutError:
                # Send ping to check connection
                try:
                    ping_msg = {
                        "type": "ping",
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    await websocket.send_text(json.dumps(ping_msg))
                except:
                    print(f"❌ Ping failed for {user.username}, disconnecting")
                    break
                    
            except WebSocketDisconnect:
                print(f"🔌 User {user.username} disconnected from {room['name']}")
                break
                
            except Exception as e:
                print(f"❌ Message processing error for {user.username}: {e}")
                # Send error but continue connection
                try:
                    error_msg = {
                        "type": "error",
                        "message": "Ein Fehler ist aufgetreten",
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    await websocket.send_text(json.dumps(error_msg))
                except:
                    # If we can't send error message, connection is broken
                    break
                    
    except Exception as e:
        print(f"❌ WebSocket error for user {user.username if user else 'Unknown'}: {e}")
        
    finally:
        # Clean up connection
        if user:
            print(f"🧹 Cleaning up connection for {user.username}")
            
            # Disconnect from chat manager
            await chat_manager.disconnect(user.id)
            
            # Update user status
            await db.users.update_one(
                {"id": user.id},
                {
                    "$set": {
                        "current_room": None,
                        "last_seen": datetime.utcnow()
                    }
                }
            )
            
            print(f"✅ Cleanup completed for {user.username}")
        else:
            print("🧹 Cleanup completed for unknown user")

# Chat REST API endpoints
@api_router.get("/chat/rooms")
async def get_chat_rooms_with_users():
    """Get chat rooms with current user counts"""
    rooms = await db.chat_rooms.find({}, {"_id": 0}).to_list(length=None)
    
    for room in rooms:
        room_users = chat_manager.get_room_users(room["id"])
        room["active_users"] = len(room_users)
        room["user_list"] = []
        
        # Get usernames of active users
        for user_id in room_users:
            user_data = await db.users.find_one({"id": user_id}, {"_id": 0, "username": 1, "role": 1, "is_vip": 1})
            if user_data:
                room["user_list"].append({
                    "username": user_data["username"],
                    "role": user_data.get("role", "user"),
                    "is_vip": user_data.get("is_vip", False)
                })
    
    return rooms

@api_router.get("/chat/messages/{room_id}")
async def get_chat_history(room_id: str, limit: int = 50, current_user: User = Depends(get_current_user)):
    """Get recent chat messages for a room"""
    # Check room access
    room = await db.chat_rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Chat room not found")
    
    if room.get("is_private") and current_user.id not in room.get("allowed_users", []):
        if current_user.role not in [UserRole.SUPERUSER_VIP, UserRole.SUPERUSER_ADMIN]:
            raise HTTPException(status_code=403, detail="Access denied to private room")
    
    messages = await db.chat_messages.find(
        {"room_id": room_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(length=None)
    
    # Reverse to show oldest first
    messages.reverse()
    
    return {
        "room": room,
        "messages": messages
    }

@api_router.post("/chat/rooms/{room_id}/join")
async def join_chat_room(room_id: str, current_user: User = Depends(get_current_user)):
    """Join a chat room (update user's current room)"""
    room = await db.chat_rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Chat room not found")
    
    # Check room permissions
    if room.get("is_private") and current_user.id not in room.get("allowed_users", []):
        if current_user.role not in [UserRole.SUPERUSER_VIP, UserRole.SUPERUSER_ADMIN]:
            raise HTTPException(status_code=403, detail="Access denied to private room")
    
    # Check if user is banned
    chat_status = await db.user_chat_status.find_one({"user_id": current_user.id}, {"_id": 0})
    if chat_status and chat_status.get("temp_ban_expires"):
        ban_expires = chat_status["temp_ban_expires"]
        if isinstance(ban_expires, datetime) and ban_expires > datetime.utcnow():
            minutes_left = int((ban_expires - datetime.utcnow()).total_seconds() / 60)
            raise HTTPException(status_code=403, detail=f"Sie sind noch {minutes_left} Minuten gesperrt")
    
    # Update user's current room
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"current_room": room_id}}
    )
    
    return {"message": f"Dem Raum '{room['name']}' beigetreten"}

@api_router.post("/chat/rooms/{room_id}/leave")
async def leave_chat_room(room_id: str, current_user: User = Depends(get_current_user)):
    """Leave a chat room"""
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"current_room": None}}
    )
    
    return {"message": "Chat-Raum verlassen"}

# Chat Polling System Endpoints
class ChatMessageSend(BaseModel):
    room_id: str
    message: str

@api_router.post("/chat/send")
async def send_chat_message_polling(message_data: ChatMessageSend, current_user: User = Depends(get_current_user)):
    """Send a chat message via polling (non-WebSocket)"""
    # Check room exists and permissions
    room = await db.chat_rooms.find_one({"id": message_data.room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Chat room not found")
    
    # Check room permissions
    if room.get("is_private") and current_user.id not in room.get("allowed_users", []):
        if current_user.role not in [UserRole.SUPERUSER_VIP, UserRole.SUPERUSER_ADMIN]:
            raise HTTPException(status_code=403, detail="Access denied to private room")
    
    # Check if user is banned
    chat_status = await db.user_chat_status.find_one({"user_id": current_user.id}, {"_id": 0})
    if chat_status and chat_status.get("temp_ban_expires"):
        ban_expires = chat_status["temp_ban_expires"]
        if isinstance(ban_expires, datetime) and ban_expires > datetime.utcnow():
            minutes_left = int((ban_expires - datetime.utcnow()).total_seconds() / 60)
            raise HTTPException(status_code=403, detail=f"Sie sind noch {minutes_left} Minuten gesperrt")
    
    # Check if this is a command message
    if message_data.message.startswith('/'):
        # Process chat command
        command_parts = message_data.message[1:].split()
        command = command_parts[0].lower() if command_parts else ""
        args = command_parts[1:] if len(command_parts) > 1 else []
        
        # Initialize chat manager if not available
        if 'chat_manager' not in globals():
            from app.backend.server import ChatConnectionManager
            chat_manager = ChatConnectionManager()
        
        # Process command based on user role and command type
        command_result = await process_chat_command(current_user, message_data.room_id, command, args)
        
        if command_result:
            # Return command response instead of saving as regular message
            return {
                "message": "Command processed successfully",
                "command_response": command_result,
                "timestamp": datetime.utcnow()
            }
    
    # Validate regular message
    if not message_data.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    if len(message_data.message) > 500:
        raise HTTPException(status_code=400, detail="Message too long (max 500 characters)")
    
    # Create message document
    message_doc = ChatMessage(
        id=str(uuid.uuid4()),
        room_id=message_data.room_id,
        user_id=current_user.id,
        username=current_user.username,
        message=message_data.message.strip(),
        timestamp=datetime.utcnow(),
        user_role=current_user.role,
        is_approved=True,
        pending_moderation=False
    )
    
    # Save message to database
    await db.chat_messages.insert_one(message_doc.dict())
    
    # Award points for chat message
    await points_manager.process_chat_message(current_user.id, current_user.username)
    
    # Update user's last activity and current room
    await db.users.update_one(
        {"id": current_user.id},
        {
            "$set": {
                "last_seen": datetime.utcnow(),
                "current_room": message_data.room_id
            }
        }
    )
    
    return {
        "message": "Message sent successfully",
        "message_id": message_doc.id,
        "timestamp": message_doc.timestamp
    }

@api_router.get("/chat/messages/{room_id}/poll")
async def poll_chat_messages(
    room_id: str, 
    since: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    """Poll for new chat messages since a specific message ID"""
    # Check room exists and permissions
    room = await db.chat_rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Chat room not found")
    
    # Check room permissions
    if room.get("is_private") and current_user.id not in room.get("allowed_users", []):
        if current_user.role not in [UserRole.SUPERUSER_VIP, UserRole.SUPERUSER_ADMIN]:
            raise HTTPException(status_code=403, detail="Access denied to private room")
    
    # Build query
    query = {"room_id": room_id}
    
    # If 'since' parameter is provided, get messages after that message
    if since:
        # Find the timestamp of the 'since' message
        since_message = await db.chat_messages.find_one({"id": since}, {"_id": 0})
        if since_message:
            query["timestamp"] = {"$gt": since_message["timestamp"]}
    
    # Get messages
    messages = await db.chat_messages.find(
        query,
        {"_id": 0}
    ).sort("timestamp", 1).limit(limit).to_list(length=None)
    
    return {
        "room_id": room_id,
        "messages": messages,
        "count": len(messages)
    }

@api_router.put("/admin/users/{user_id}")
async def update_user(user_id: str, user_data: UserUpdate, current_user: User = Depends(require_admin_permission)):
    update_data = {k: v for k, v in user_data.dict().items() if v is not None}
    
    if update_data:
        result = await db.users.update_one(
            {"id": user_id},
            {"$set": update_data}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User updated successfully"}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(require_admin_permission)):
    # Prevent admin from deleting themselves
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

# Admin Chat Room Management
@api_router.post("/admin/chat-rooms", response_model=ChatRoom)
async def create_chat_room(room_data: ChatRoomCreate, current_user: User = Depends(require_admin_permission)):
    # Check if room name already exists
    existing_room = await db.chat_rooms.find_one({"name": room_data.name}, {"_id": 0})
    if existing_room:
        raise HTTPException(status_code=400, detail="Chat room with this name already exists")
    
    chat_room = ChatRoom(
        name=room_data.name,
        is_private=room_data.is_private,
        creator_id=current_user.id
    )
    
    await db.chat_rooms.insert_one(chat_room.dict())
    return chat_room

@api_router.delete("/admin/chat-rooms/{room_id}")
async def delete_chat_room(room_id: str, current_user: User = Depends(require_admin_permission)):
    result = await db.chat_rooms.delete_one({"id": room_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Chat room not found")
    return {"message": "Chat room deleted successfully"}

# Admin Statistics
@api_router.get("/admin/stats", response_model=AdminStats)
async def get_admin_stats(current_user: User = Depends(require_admin_permission)):
    total_users = await db.users.count_documents({})
    online_users = await db.users.count_documents({"is_online": True})
    total_chat_rooms = await db.chat_rooms.count_documents({})
    total_news = await db.news.count_documents({})
    
    # Recent registrations (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_registrations = await db.users.count_documents({"joined_date": {"$gte": week_ago}})
    
    return AdminStats(
        total_users=total_users,
        online_users=online_users,
        total_chat_rooms=total_chat_rooms,
        total_news=total_news,
        recent_registrations=recent_registrations
    )

# User Sanctions
@api_router.post("/admin/users/{user_id}/sanction")
async def sanction_user(
    user_id: str, 
    action: str,
    points_change: int = 0,
    current_user: User = Depends(require_admin_permission)
):
    """Apply sanctions: 'deduct_points', 'remove_write_permission', 'ban_temp'"""
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {}
    
    if action == "deduct_points" and points_change > 0:
        new_points = max(0, user["points"] - points_change)
        update_data["points"] = new_points
    
    elif action == "remove_write_permission":
        update_data["can_write"] = False
    
    elif action == "restore_write_permission":
        update_data["can_write"] = True
    
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
        
        # Log sanction
        sanction_log = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "admin_id": current_user.id,
            "action": action,
            "points_change": points_change,
            "timestamp": datetime.utcnow()
        }
        await db.sanction_logs.insert_one(sanction_log)
    
    return {"message": f"Sanction '{action}' applied successfully"}

# User Profile & Guestbook endpoints
@api_router.get("/users/{username}/profile")
async def get_user_profile(username: str):
    """Get user profile (public information)"""
    user = await db.users.find_one({"username": username}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.get("show_profile", True):
        raise HTTPException(status_code=403, detail="Profile is private")
    
    return UserResponse(**user)

@api_router.put("/users/profile")
async def update_my_profile(profile_data: UserProfileUpdate, current_user: User = Depends(get_current_user)):
    """Update own profile"""
    update_data = {k: v for k, v in profile_data.dict().items() if v is not None}
    
    if update_data:
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": update_data}
        )
    
    return {"message": "Profile updated successfully"}

@api_router.put("/users/password")
async def change_password(password_request: PasswordChangeRequest, current_user: User = Depends(get_current_user)):
    """Change user password"""
    # Get current user with password
    user_with_password = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    if not user_with_password:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not verify_password(password_request.current_password, user_with_password["password"]):
        raise HTTPException(status_code=400, detail="Aktuelles Passwort ist falsch")
    
    # Validate new password (minimum 6 characters)
    if len(password_request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Neues Passwort muss mindestens 6 Zeichen haben")
    
    # Hash and update new password
    new_hashed_password = get_password_hash(password_request.new_password)
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"password": new_hashed_password}}
    )
    
    return {"message": "Passwort erfolgreich geändert"}

@api_router.put("/users/heartbeat")
async def user_heartbeat(current_user: User = Depends(get_current_user)):
    """Update user's last_seen timestamp to keep them online"""
    await db.users.update_one(
        {"id": current_user.id},
        {
            "$set": {
                "last_seen": datetime.utcnow(),
                "is_online": True
            }
        }
    )
    return {"message": "Heartbeat updated"}

@api_router.get("/users/{username}/guestbook")
async def get_guestbook(username: str, limit: int = 50, current_user: User = Depends(get_current_user)):
    """Get user's guestbook entries with privacy filtering"""
    user = await db.users.find_one({"username": username}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.get("guestbook_open", True):
        raise HTTPException(status_code=403, detail="Guestbook is closed")
    
    # Build query based on privacy permissions
    base_query = {"user_id": user["id"], "is_visible": True}
    
    # If current user is the guestbook owner, show all entries (private and public)
    if current_user.id == user["id"]:
        # Owner sees all their entries
        pass
    else:
        # Others see only public entries + private entries they authored
        base_query["$or"] = [
            {"is_private": False},  # Public entries
            {"is_private": True, "author_id": current_user.id}  # Private entries authored by current user
        ]
    
    entries = await db.guestbook_entries.find(
        base_query, 
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(length=None)
    
    return {"entries": entries}

@api_router.post("/users/{username}/guestbook")
async def create_guestbook_entry(
    username: str, 
    entry_data: GuestbookEntryCreate, 
    current_user: User = Depends(get_current_user)
):
    """Create a new guestbook entry (now allows self-entries)"""
    target_user = await db.users.find_one({"username": username}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not target_user.get("guestbook_open", True):
        raise HTTPException(status_code=403, detail="Guestbook is closed")
    
    # Remove restriction - users can now write in their own guestbook
    # if target_user["id"] == current_user.id:
    #     raise HTTPException(status_code=400, detail="Cannot write in your own guestbook")
    
    entry = GuestbookEntry(
        user_id=target_user["id"],
        author_id=current_user.id,
        author_name=current_user.username,
        message=entry_data.message,
        is_private=entry_data.is_private  # Set privacy based on request
    )
    
    await db.guestbook_entries.insert_one(entry.dict())
    
    # Award points for guestbook entry
    await points_manager.process_guestbook_entry(current_user.id, current_user.username, entry.id)
    
    # Create personal notification for guestbook owner (only if not writing to own guestbook)
    if target_user["id"] != current_user.id:
        await create_personal_notification(
            user_id=target_user["id"],
            notification_type="guestbook_entry",
            title="📝 Neuer Gästebuch-Eintrag",
            message=f"{current_user.username} hat in Ihr Gästebuch geschrieben: \"{entry_data.message[:50]}{'...' if len(entry_data.message) > 50 else ''}\"",
            action_url=f"/profile/{username}#guestbook",
            action_text="Gästebuch ansehen",
            sender_id=current_user.id,
            sender_username=current_user.username,
            reference_id=entry.id
        )
    
    return entry

@api_router.delete("/users/guestbook/{entry_id}")
async def delete_guestbook_entry(entry_id: str, current_user: User = Depends(get_current_user)):
    """Delete a guestbook entry (only owner of guestbook or admins)"""
    entry = await db.guestbook_entries.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Guestbook entry not found")
    
    # Check if user is owner of guestbook or admin
    if (entry["user_id"] != current_user.id and 
        current_user.role not in [UserRole.SUPERUSER_ADMIN, UserRole.SUPERUSER_VIP]):
        raise HTTPException(status_code=403, detail="Not authorized to delete this entry")
    
    await db.guestbook_entries.delete_one({"id": entry_id})
    return {"message": "Guestbook entry deleted successfully"}

@api_router.put("/users/guestbook/settings")
async def update_guestbook_settings(
    guestbook_open: bool, 
    current_user: User = Depends(get_current_user)
):
    """Toggle guestbook open/closed"""
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"guestbook_open": guestbook_open}}
    )
    
    action = "opened" if guestbook_open else "closed"
    return {"message": f"Guestbook {action} successfully"}

# Search users endpoint
@api_router.get("/users/search")
async def search_users(query: str, limit: int = 20):
    """Search users by username"""
    if len(query) < 2:
        return []
    
    users = await db.users.find(
        {
            "username": {"$regex": query, "$options": "i"},
            "show_profile": True
        },
        {"_id": 0, "password": 0}
    ).limit(limit).to_list(length=None)
    
    return [UserResponse(**user) for user in users]

@api_router.get("/")
async def root():
    return {"message": "RichComm Community API - Ready!"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await init_default_data()
    await init_default_forum_topics()
    logger.info("RichComm Community API started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()