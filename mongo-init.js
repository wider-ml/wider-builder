// MongoDB initialization script for wider-builder
// This script runs when the MongoDB container starts for the first time

// Switch to the wider-builder database
db = db.getSiblingDB('wider-builder');

// Create a user for the application
db.createUser({
  user: 'wider-app',
  pwd: 'wider-app-password',
  roles: [
    {
      role: 'readWrite',
      db: 'wider-builder'
    }
  ]
});

// Create the chats collection with indexes
db.createCollection('chats');

// Create indexes for the chats collection
db.chats.createIndex({ "id": 1 }, { unique: true });
db.chats.createIndex({ "userId": 1 });
db.chats.createIndex({ "urlId": 1 });
db.chats.createIndex({ "timestamp": -1 });
db.chats.createIndex({ "userId": 1, "timestamp": -1 });

// Create the snapshots collection with indexes
db.createCollection('snapshots');

// Create indexes for the snapshots collection
db.snapshots.createIndex({ "chatId": 1 }, { unique: true });
db.snapshots.createIndex({ "createdAt": -1 });

print('MongoDB initialization completed successfully');
print('Created database: wider-builder');
print('Created user: wider-app');
print('Created collections: chats, snapshots');
print('Created indexes for optimal query performance');
