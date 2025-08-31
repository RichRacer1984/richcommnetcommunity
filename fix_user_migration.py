#!/usr/bin/env python3
"""
Database migration script to add missing profile fields to existing users
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / '.env')

async def migrate_users():
    """Add missing profile fields to existing users"""
    
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🔄 Starting user migration...")
    
    # Find users missing the new profile fields
    users_to_update = await db.users.find({
        "$or": [
            {"bio": {"$exists": False}},
            {"location": {"$exists": False}},
            {"website": {"$exists": False}},
            {"guestbook_open": {"$exists": False}},
            {"show_profile": {"$exists": False}}
        ]
    }).to_list(length=None)
    
    print(f"📊 Found {len(users_to_update)} users to migrate")
    
    if not users_to_update:
        print("✅ No users need migration")
        client.close()
        return
    
    # Update each user with default values
    for user in users_to_update:
        username = user.get('username', 'Unknown')
        print(f"🔧 Updating user: {username}")
        
        update_fields = {}
        
        if "bio" not in user:
            update_fields["bio"] = None
        if "location" not in user:
            update_fields["location"] = None
        if "website" not in user:
            update_fields["website"] = None
        if "guestbook_open" not in user:
            update_fields["guestbook_open"] = True
        if "show_profile" not in user:
            update_fields["show_profile"] = True
        
        if update_fields:
            result = await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": update_fields}
            )
            
            if result.modified_count > 0:
                print(f"✅ Updated {username} with fields: {list(update_fields.keys())}")
            else:
                print(f"⚠️  Failed to update {username}")
    
    print("🎉 Migration completed!")
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_users())