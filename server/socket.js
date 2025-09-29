const polls = new Map();
const students = new Map();

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('submit-answer', ({ pollId, studentId, answer }) => {
    console.log(`🎯 SUBMIT_ANSWER received:`, { pollId, studentId, answer });
    
    const poll = polls.get(pollId);
    if (!poll) {
      console.log('❌ Poll not found:', pollId);
      return;
    }

    // Validate student and answer
    if (!poll.students.has(studentId)) {
      console.log('❌ Student not found in poll:', studentId);
      return;
    }

    // Record answer and mark as submitted
    if (!poll.responses) poll.responses = new Map();
    poll.responses.set(studentId, answer);
    poll.students.get(studentId).hasSubmitted = true;

    console.log(`✅ Answer recorded for student ${studentId}`);

    // Get actual active students
    const activeStudents = Array.from(poll.students.values())
      .filter(s => s.connected);
    const totalActive = activeStudents.length;
    const totalSubmitted = Array.from(poll.students.values())
      .filter(s => s.hasSubmitted).length;

    console.log(`📊 Progress: ${totalSubmitted}/${totalActive} students submitted`);

    // Send progress update to all
    io.to(pollId).emit('poll-update', {
      responses: Array.from(poll.responses.entries()),
      submittedCount: totalSubmitted,
      totalCount: totalActive,
      complete: false
    });

    // Check if poll should complete
    if (totalSubmitted >= totalActive) {
      console.log(`🎯 All students submitted, completing poll ${pollId}`);
      poll.isActive = false;
      io.to(pollId).emit('poll-complete', {
        responses: Array.from(poll.responses.entries()),
        submittedCount: totalSubmitted,
        totalCount: totalActive,
        complete: true
      });
    }
  });

  socket.on('student_join', ({ pollId, studentName }) => {
    console.log(`🎯 Student ${studentName} joining poll ${pollId}`);
    
    const poll = polls.get(pollId);
    if (!poll) {
      socket.emit('error', 'Poll not found');
      return;
    }

    // Add student to poll
    const studentId = socket.id;
    if (!poll.students) poll.students = new Map();
    
    poll.students.set(studentId, {
      name: studentName,
      connected: true,
      hasSubmitted: false,
      joinedAt: Date.now()
    });

    socket.join(pollId);
    console.log(`✅ Student ${studentName} joined poll ${pollId}`);

    // Send current state to all
    io.to(pollId).emit('students-updated', {
      students: Array.from(poll.students.entries())
    });

    // Send poll state to joining student
    socket.emit('poll-state', {
      question: poll.question,
      options: poll.options,
      isActive: poll.isActive,
      startTime: poll.startTime,
      duration: poll.duration
    });
  });

  socket.on('disconnect', () => {
    console.log('🔴 Disconnect:', socket.id);
    
    // Update student connection status in all polls
    polls.forEach((poll, pollId) => {
      if (poll.students?.has(socket.id)) {
        const student = poll.students.get(socket.id);
        student.connected = false;
        console.log(`Student ${student.name} marked as disconnected in poll ${pollId}`);
        
        io.to(pollId).emit('students-updated', {
          students: Array.from(poll.students.entries())
        });
      }
    });
  });

  socket.on('submit_answer', ({ pollCode, studentName, answer }) => {
    console.log(`🎯 RECEIVED SUBMIT_ANSWER:`, { pollCode, studentName, answer });
    
    const poll = polls.get(pollCode);
    if (!poll) {
      console.log('❌ Poll not found:', pollCode);
      return;
    }

    // Record the answer without affecting other students
    if (!poll.answers) poll.answers = {};
    poll.answers[studentName] = answer;
    
    console.log(`✅ Answer recorded for ${studentName}`);

    // Send update to all clients without terminating anyone
    io.to(pollCode).emit('update_results', {
      answers: poll.answers,
      submittedStudent: studentName
    });

    // Only mark poll as complete when timer ends
    const allSubmitted = Object.keys(poll.answers).length === Object.keys(poll.students).length;
    if (allSubmitted) {
      console.log(`📊 All students have submitted for poll ${pollCode}`);
    }
  });
});