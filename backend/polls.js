const polls = {}

function createPoll(teacherId, question, options, duration = 60) {
  const pollCode = Math.floor(100000 + Math.random() * 900000).toString()
  polls[pollCode] = {
    teacherId,
    question,
    options,
    answers: {}, // { studentName: answer }
    students: {}, // { socketId: studentName }
    startTime: Date.now(),
    duration,
    isActive: true,
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

module.exports = { polls, createPoll, getPoll, submitAnswer, removeStudent }
