# MongoDB Setup for Poll History

## Current Status
- MongoDB integration code is complete
- MongoDB connection is not configured
- Polls are only stored in memory (lost on server restart)

## To Enable Persistent Storage:

### Step 1: Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/atlas
2. Click "Try Free"
3. Create an account (free tier available)

### Step 2: Create a Cluster
1. Choose "M0 Sandbox" (free tier)
2. Select a region close to you
3. Name your cluster (e.g., "live-polling")
4. Click "Create Cluster"

### Step 3: Get Connection String
1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your database user password
5. Replace `<dbname>` with `live-polling`

### Step 4: Set Environment Variable
Replace the placeholder in `.env` file with your actual connection string:

```bash
MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/live-polling?retryWrites=true&w=majority
```

### Step 5: Restart Backend
```bash
cd backend && node index.js
```

## What Gets Stored
- Poll questions and options
- Student responses and names
- Chat messages
- Timing data
- Accuracy statistics
- Response counts

## Current Behavior
- Without MongoDB: App works normally, no history saved
- With MongoDB: All polls automatically saved to history when they end
