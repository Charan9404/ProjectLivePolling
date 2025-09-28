const polls = {}

function createPoll(teacherId, question, options, duration = 60, expectedResponses = null) {
  const pollCode = Math.floor(100000 + Math.random() * 900000).toString()
  polls[pollCode] = {
    teacherId,
    question,
    options, // Array of { text, isCorrect }
    answers: {}, // { studentName: answer }
    students: {}, // { socketId: studentName }
    startTime: Date.now(),
    duration,
    expectedResponses,
    isActive: true,
    messages: [], // [{ from: 'teacher'|'student', name, text, ts }]
    questionHistory: [], // Array of previous questions with their results
  }
  return pollCode
}

function getPoll(pollCode) {
  return polls[pollCode]
}

function submitAnswer(pollCode, studentName, answer) {
  const poll = polls[pollCode]
  if (poll) poll.answers[studentName] = answer
}

function removeStudent(pollCode, studentId) {
  const poll = polls[pollCode]
  if (poll && poll.students[studentId]) {
    const studentName = poll.students[studentId]
    delete poll.students[studentId]
    delete poll.answers[studentName]
  }
}

function saveQuestionToHistory(pollCode) {
  const poll = polls[pollCode]
  if (!poll || !poll.question) return

  // Save current question to history before starting new one
  const questionEntry = {
    question: poll.question,
    options: poll.options,
    answers: { ...poll.answers }, // Copy current answers
    students: { ...poll.students }, // Copy current students
    startTime: poll.startTime,
    endTime: Date.now(),
    duration: poll.duration,
    expectedResponses: poll.expectedResponses,
    totalResponses: Object.keys(poll.answers).length,
    correctAnswers: poll.options.filter(opt => opt.isCorrect).map(opt => opt.text),
    messages: [...(poll.messages || [])] // Copy messages
  }

  poll.questionHistory.push(questionEntry)
}

module.exports = { polls, createPoll, getPoll, submitAnswer, removeStudent, saveQuestionToHistory }
