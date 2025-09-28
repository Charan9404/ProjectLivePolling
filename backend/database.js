const { MongoClient } = require('mongodb')

// MongoDB connection string - replace with your actual connection string
let MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/live-polling'

// Fix connection string for Railway deployment
if (MONGODB_URI.includes('mongodb+srv://')) {
  // Add SSL and connection options for Railway
  if (!MONGODB_URI.includes('ssl=')) {
    MONGODB_URI = MONGODB_URI.includes('?') 
      ? MONGODB_URI + '&ssl=true&authSource=admin'
      : MONGODB_URI + '?ssl=true&authSource=admin'
  }
}
const DB_NAME = 'live-polling'

let client = null
let db = null

async function connectToDatabase() {
  if (db) {
    return db
  }

  try {
    // Check if MongoDB URI is provided
    if (!MONGODB_URI || MONGODB_URI === 'mongodb://localhost:27017/live-polling') {
      console.log('⚠️  MongoDB not configured - Poll history will be disabled')
      console.log('📝 To enable poll history:')
      console.log('   1. Create MongoDB Atlas account at https://www.mongodb.com/atlas')
      console.log('   2. Get your connection string')
      console.log('   3. Set MONGODB_URI environment variable')
      return null
    }

    console.log('🔗 Attempting to connect to MongoDB...')
    console.log('📍 MongoDB URI:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@')) // Hide credentials

    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 15000,
      maxPoolSize: 10,
      minPoolSize: 1,
    })
    await client.connect()
    
    // Test the connection
    await client.db(DB_NAME).admin().ping()
    
    db = client.db(DB_NAME)
    console.log('✅ Connected to MongoDB successfully')
    console.log('📊 Database:', DB_NAME)
    return db
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message)
    console.error('🔍 Error details:', {
      name: error.name,
      code: error.code,
      codeName: error.codeName
    })
    console.log('⚠️  Poll history will be disabled until MongoDB is configured')
    console.log('📝 App will continue to work without poll history storage')
    return null
  }
}

async function getDatabase() {
  if (!db) {
    await connectToDatabase()
  }
  return db
}

// Poll History Schema
const PollHistorySchema = {
  pollCode: String,
  teacherId: String,
  question: String,
  options: Array, // [{ text: String, isCorrect: Boolean }]
  answers: Object, // { studentName: answer }
  students: Object, // { socketId: studentName }
  duration: Number,
  expectedResponses: Number,
  startTime: Number,
  endTime: Number,
  totalResponses: Number,
  correctAnswers: Array, // Array of correct option texts
  createdAt: Date,
  messages: Array // Chat messages
}

// Save poll to history
async function savePollHistory(pollData) {
  try {
    const db = await getDatabase()
    if (!db) {
      console.log('⚠️  MongoDB not available - skipping poll history save')
      return null
    }
    
    const collection = db.collection('pollHistory')
    
    const historyEntry = {
      pollCode: pollData.pollCode,
      teacherId: pollData.teacherId,
      question: pollData.question,
      options: pollData.options,
      answers: pollData.answers,
      students: pollData.students,
      duration: pollData.duration,
      expectedResponses: pollData.expectedResponses,
      startTime: pollData.startTime,
      endTime: Date.now(),
      totalResponses: Object.keys(pollData.answers).length,
      correctAnswers: pollData.options.filter(opt => opt.isCorrect).map(opt => opt.text),
      createdAt: new Date(),
      messages: pollData.messages || []
    }
    
    const result = await collection.insertOne(historyEntry)
    console.log('✅ Poll saved to history:', result.insertedId)
    return result.insertedId
  } catch (error) {
    console.error('❌ Error saving poll history:', error)
    return null
  }
}

// Get poll history for a teacher
async function getPollHistory(teacherId, limit = 20) {
  try {
    const db = await getDatabase()
    if (!db) {
      console.log('⚠️  MongoDB not available - returning empty history')
      return []
    }
    
    const collection = db.collection('pollHistory')
    
    const query = teacherId ? { teacherId } : {}
    const history = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()
    
    console.log(`✅ Retrieved ${history.length} polls for teacher ${teacherId || 'all'}`)
    return history
  } catch (error) {
    console.error('❌ Error retrieving poll history:', error)
    return []
  }
}

// Get specific poll details
async function getPollDetails(pollCode, teacherId) {
  try {
    const db = await getDatabase()
    if (!db) {
      console.log('⚠️  MongoDB not available - returning null')
      return null
    }
    
    const collection = db.collection('pollHistory')
    
    const poll = await collection.findOne({ 
      pollCode, 
      teacherId 
    })
    
    if (poll) {
      console.log(`✅ Retrieved poll details for ${pollCode}`)
    } else {
      console.log(`❌ Poll not found: ${pollCode}`)
    }
    
    return poll
  } catch (error) {
    console.error('❌ Error retrieving poll details:', error)
    return null
  }
}

// Get poll statistics
async function getPollStats(teacherId) {
  try {
    const db = await getDatabase()
    if (!db) {
      console.log('⚠️  MongoDB not available - returning empty stats')
      return {
        totalPolls: 0,
        totalResponses: 0,
        avgResponses: 0,
        totalStudents: 0
      }
    }
    
    const collection = db.collection('pollHistory')
    
    const stats = await collection.aggregate([
      { $match: { teacherId } },
      {
        $group: {
          _id: null,
          totalPolls: { $sum: 1 },
          totalResponses: { $sum: '$totalResponses' },
          avgResponses: { $avg: '$totalResponses' },
          totalStudents: { $sum: { $size: '$students' } }
        }
      }
    ]).toArray()
    
    return stats[0] || {
      totalPolls: 0,
      totalResponses: 0,
      avgResponses: 0,
      totalStudents: 0
    }
  } catch (error) {
    console.error('❌ Error retrieving poll stats:', error)
    return {
      totalPolls: 0,
      totalResponses: 0,
      avgResponses: 0,
      totalStudents: 0
    }
  }
}

module.exports = {
  connectToDatabase,
  getDatabase,
  savePollHistory,
  getPollHistory,
  getPollDetails,
  getPollStats
}
