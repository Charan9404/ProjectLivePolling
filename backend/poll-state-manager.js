// Simple Poll State Manager - Bulletproof sync
const polls = {}

function createPoll(teacherId, question, options, duration = 300, expectedResponses = null) {
  const pollCode = Math.floor(100000 + Math.random() * 900000).toString()
  polls[pollCode] = {
    teacherId,
    question,
    options,
    answers: {},
    students: {},
    startTime: Date.now(),
    duration,
    expectedResponses,
    isActive: true,
    messages: [],
    questionHistory: [],
  }
  console.log(`🎯 Created poll ${pollCode} with duration ${duration}s`)
  return pollCode
}

function getPoll(pollCode) {
  return polls[pollCode]
}

function addStudent(pollCode, socketId, studentName) {
  const poll = polls[pollCode]
  if (poll) {
    poll.students[socketId] = studentName
    console.log(`🎯 Added student ${studentName} to poll ${pollCode}`)
  }
}

function removeStudent(pollCode, socketId) {
  const poll = polls[pollCode]
  if (poll && poll.students[socketId]) {
    const studentName = poll.students[socketId]
    delete poll.students[socketId]
    delete poll.answers[studentName]
    console.log(`🎯 Removed student ${studentName} from poll ${pollCode}`)
  }
}

function submitAnswer(pollCode, studentName, answer) {
  const poll = polls[pollCode]
  if (poll) {
    poll.answers[studentName] = answer
    console.log(`🎯 Student ${studentName} answered: ${answer}`)
    return true
  }
  return false
}

function getPollState(pollCode) {
  const poll = polls[pollCode]
  if (!poll) return null
  
  return {
    question: poll.question,
    options: poll.options,
    answers: poll.answers,
    students: poll.students,
    duration: poll.duration,
    startTime: poll.startTime,
    expectedResponses: poll.expectedResponses,
    isActive: poll.isActive,
    messages: poll.messages || [],
    questionHistory: poll.questionHistory || [],
  }
}

function updatePollQuestion(pollCode, question, options, duration = 300, expectedResponses) {
  const poll = polls[pollCode]
  if (!poll) return false
  
  // Save current question to history
  if (poll.question && poll.question.trim()) {
    poll.questionHistory.push({
      question: poll.question,
      options: poll.options,
      answers: { ...poll.answers },
      students: { ...poll.students },
      startTime: poll.startTime,
      endTime: Date.now(),
      duration: poll.duration,
      totalResponses: Object.keys(poll.answers).length,
      correctAnswers: poll.options.filter(opt => opt.isCorrect).map(opt => opt.text),
    })
  }
  
  // Update poll with new question
  poll.question = question.trim()
  poll.options = options
  poll.answers = {}
  poll.startTime = Date.now()
  poll.duration = duration
  poll.expectedResponses = expectedResponses || poll.expectedResponses
  poll.isActive = true
  
  console.log(`🎯 Updated poll ${pollCode} with new question: ${question}`)
  return true
}

function deactivatePoll(pollCode) {
  const poll = polls[pollCode]
  if (poll) {
    poll.isActive = false
    console.log(`🎯 Deactivated poll ${pollCode}`)
  }
}

function getAllPolls() {
  return polls
}

module.exports = {
  createPoll,
  getPoll,
  addStudent,
  removeStudent,
  submitAnswer,
  getPollState,
  updatePollQuestion,
  deactivatePoll,
  getAllPolls
}
