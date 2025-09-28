# Live Polling System

A modern, real-time polling system built with Next.js and Socket.IO for interactive classroom engagement.

## Features

### Teacher Dashboard
- Create unlimited polls with custom questions
- Set configurable time limits (30 seconds to 10 minutes)
- Real-time student management and monitoring
- Live results visualization with charts
- Start new questions dynamically
- Remove students if needed

### Student Interface
- Join polls with simple 6-digit codes
- Submit answers with intuitive UI
- Real-time timer and progress tracking
- View live results after submission
- Automatic reconnection handling

### Technical Features
- Real-time synchronization with Socket.IO
- Modern UI with Tailwind CSS and shadcn/ui
- Responsive design for all devices
- Purple-themed professional interface
- Session persistence for student names
- Error handling and validation

## Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone <your-repo-url>
   cd live-polling-system
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   # Install frontend dependencies
   npm install
   
   # Install backend dependencies
   cd backend
   npm install
   cd ..
   \`\`\`

### Running the Application

You need to run both the frontend and backend servers:

1. **Start the backend server** (Terminal 1)
   \`\`\`bash
   cd backend
   npm start
   \`\`\`
   Backend will run on http://localhost:5005

2. **Start the frontend server** (Terminal 2)
   \`\`\`bash
   npm run dev
   \`\`\`
   Frontend will run on http://localhost:3000

### Usage

1. **Teacher Setup**
   - Go to http://localhost:3000
   - Click "Teacher Dashboard"
   - Create a new poll with your question and answer options
   - Share the generated 6-digit code with students

2. **Student Participation**
   - Go to http://localhost:3000
   - Click "Student Portal"
   - Enter your name and the poll code
   - Answer questions when they appear
   - View live results after submission

## Project Structure

\`\`\`
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── globals.css        # Global styles with purple theme
│   ├── layout.tsx         # Root layout
│   └── page.tsx          # Homepage
├── backend/               # Express.js backend
│   ├── index.js          # Socket.IO server
│   ├── polls.js          # Poll management logic
│   └── package.json      # Backend dependencies
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── teacher-dashboard.tsx
│   ├── student-interface.tsx
│   ├── poll-timer.tsx
│   ├── poll-results-chart.tsx
│   └── ...
├── lib/                  # Utilities
│   └── socket.ts         # Socket.IO client setup
└── package.json          # Frontend dependencies
\`\`\`

## Deployment

### Backend Deployment
Deploy the `backend/` folder to any Node.js hosting service (Heroku, Railway, etc.)

### Frontend Deployment
Deploy to Vercel, Netlify, or any Next.js compatible platform. Update the socket connection URL in `lib/socket.ts` to point to your deployed backend.

## Assignment Requirements Checklist

**Must-Have Requirements**
- [x] Functional system with all core features working
- [x] Teacher can create polls and students can answer them
- [x] Both teacher and student can view poll results
- [x] Real-time updates with Socket.IO
- [x] Modern UI following design principles

**Good to Have**
- [x] Configurable poll time limit by teacher
- [x] Option for teacher to remove a student
- [x] Well-designed user interface with purple theme

**Technical Stack**
- [x] Frontend: React (Next.js)
- [x] Backend: Express.js with Socket.io
- [x] Real-time polling functionality
- [x] Professional UI design

## API Endpoints

- `GET /` - Health check
- `GET /api/poll/:code` - Get poll information (debugging)

## Socket Events

### Teacher Events
- `teacher_create_poll` - Create a new poll
- `teacher_new_question` - Start a new question
- `teacher_subscribe` - Subscribe to poll updates
- `remove_student` - Remove a student from poll
- `time_up` - End current question

### Student Events
- `student_join` - Join a poll
- `submit_answer` - Submit an answer

### Broadcast Events
- `poll_created` - Poll creation confirmation
- `joined_poll` - Student successfully joined
- `joined_poll_ack` - Student list update
- `new_question` - New question started
- `update_results` - Live results update
- `error` - Error messages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is created for educational purposes as part of the Intervue.io SDE Intern assignment.
