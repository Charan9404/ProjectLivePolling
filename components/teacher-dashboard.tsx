"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, RotateCcw, History } from "lucide-react"
import { getSocket } from "@/lib/socket"
import { useToast } from "@/hooks/use-toast"
import CreatePollForm from "./create-poll-form"
import PollCodeDisplay from "./poll-code-display"
import StudentList from "./student-list"
import PollResultsChart from "./poll-results-chart"
import PollTimer from "./poll-timer"
import NewQuestionForm from "./new-question-form"
import PollHistory from "./poll-history"

interface TeacherDashboardProps {
  onBack: () => void
}

interface PollState {
  pollCode: string | null
  question: string
  options: { text: string; isCorrect: boolean }[]
  answers: Record<string, string>
  students: Record<string, string>
  duration: number
  startTime?: number
  expectedResponses?: number | null
  isActive: boolean
  showResults: boolean
  messages?: ChatMessage[]
  questionHistory?: QuestionHistoryEntry[]
}

interface QuestionHistoryEntry {
  question: string
  options: { text: string; isCorrect: boolean }[]
  answers: Record<string, string>
  students: Record<string, string>
  startTime: number
  endTime: number
  duration: number
  totalResponses: number
  correctAnswers: string[]
  messages?: ChatMessage[]
}

interface ChatMessage {
  id: string
  from: "teacher" | "student"
  name: string
  text: string
  ts: number
}

export default function TeacherDashboard({ onBack }: TeacherDashboardProps) {
  const [pollState, setPollState] = useState<PollState>({
    pollCode: null,
    question: "",
    options: [],
    answers: {},
    students: {},
    duration: 300,
    isActive: false,
    showResults: false,
  })
  const [isCreating, setIsCreating] = useState(false)
  const [showNewQuestionForm, setShowNewQuestionForm] = useState(false)
  const [chatOpen, setChatOpen] = useState(true)
  const [chatInput, setChatInput] = useState("")
  const [historyOpen, setHistoryOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const socket = getSocket()

    socket.on("poll_created", ({ pollCode }) => {
      setPollState((prev) => ({
        ...prev,
        pollCode,
        isActive: true,
        showResults: false,
      }))
      setIsCreating(false)
      
      // Join the poll room to receive updates
      socket.emit("teacher_subscribe", { pollCode })
      
      toast({
        title: "Poll created successfully!",
        description: `Share code ${pollCode} with your students`,
      })
    })

    socket.on("joined_poll_ack", ({ students }) => {
      setPollState((prev) => ({ ...prev, students }))
    })

    socket.on("update_results", ({ answers }) => {
      console.log("Teacher received update_results:", answers)
      setPollState((prev) => ({ ...prev, answers, showResults: true }))
    })

    socket.on("new_question", ({ question, options, duration, startTime }) => {
      setPollState((prev) => ({
        ...prev,
        question,
        options,
        duration,
        startTime,
        answers: {},
        isActive: true,
        showResults: false,
      }))
    })

    socket.on("question_started", ({ startTime, duration }) => {
      console.log("Teacher received question_started:", { startTime, duration })
      setPollState((prev) => ({
        ...prev,
        startTime,
        duration,
        isActive: true,
        showResults: false,
      }))
    })

    socket.on("poll_state", ({ question, options, answers, students, duration, startTime, expectedResponses, isActive, messages, questionHistory }) => {
      setPollState((prev) => ({
        ...prev,
        question,
        options,
        answers,
        students,
        duration,
        startTime,
        expectedResponses,
        isActive,
        showResults: !isActive && Object.keys(answers || {}).length > 0,
        messages: messages || prev.messages || [],
        questionHistory: questionHistory || [],
      }))
    })

    socket.on("chat_message", ({ message }) => {
      setPollState((prev) => ({ ...prev, messages: [ ...(prev.messages || []), message ] }))
    })

    socket.on("error", (message) => {
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    })

    return () => {
      socket.off("poll_created")
      socket.off("joined_poll_ack")
      socket.off("update_results")
      socket.off("new_question")
      socket.off("question_started")
      socket.off("poll_state")
      socket.off("chat_message")
      socket.off("error")
    }
  }, [toast])

  const createPoll = (question: string, options: { text: string; isCorrect: boolean }[], duration: number, expectedResponses: number | null) => {
    setIsCreating(true)
    setPollState((prev) => ({ ...prev, question, options, duration, expectedResponses }))
    const socket = getSocket()
    socket.emit("teacher_create_poll", { question, options, duration, expectedResponses })
  }

  const startNewQuestion = (question: string, options: { text: string; isCorrect: boolean }[], duration: number, expectedResponses: number | null) => {
    if (!pollState.pollCode) return

    console.log("Teacher starting new question:", { question, options, duration, expectedResponses, pollCode: pollState.pollCode })

    setPollState((prev) => ({
      ...prev,
      question,
      options,
      duration,
      expectedResponses,
      answers: {},
      isActive: true,
      showResults: false,
    }))

    const socket = getSocket()
    socket.emit("teacher_new_question", {
      pollCode: pollState.pollCode,
      question,
      options,
      duration,
      expectedResponses,
    })
    setShowNewQuestionForm(false)
    toast({
      title: "New question started!",
      description: "Students can now submit their answers",
    })
  }

  const handleTimeUp = () => {
    if (!pollState.pollCode) return

    setPollState((prev) => ({ ...prev, isActive: false, showResults: true }))
    const socket = getSocket()
    socket.emit("time_up", { pollCode: pollState.pollCode })
  }

  const removeStudent = (studentId: string) => {
    if (!pollState.pollCode) return

    const socket = getSocket()
    socket.emit("remove_student", { pollCode: pollState.pollCode, studentId })
  }

  const resetPoll = () => {
    setPollState({
      pollCode: null,
      question: "",
      options: [],
      answers: {},
      students: {},
      duration: 300,
      isActive: false,
      showResults: false,
    })
    setShowNewQuestionForm(false)
  }

  const canStartNewQuestion = () => {
    if (!pollState.isActive) return true
    
    const currentAnswers = Object.keys(pollState.answers).length
    const joinedStudents = Object.keys(pollState.students).length
    const expected = pollState.expectedResponses || joinedStudents
    
    // Allow if all expected responses received or all joined students answered
    const allExpectedAnswered = expected && currentAnswers >= expected
    const allJoinedAnswered = joinedStudents > 0 && currentAnswers >= joinedStudents
    
    return allExpectedAnswered || allJoinedAnswered
  }

  const sendTeacherMessage = () => {
    if (!pollState.pollCode || !chatInput.trim()) return
    const socket = getSocket()
    socket.emit("teacher_send_message", { pollCode: pollState.pollCode, text: chatInput.trim() })
    setChatInput("")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-primary/10">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
              <p className="text-muted-foreground">Create and manage live polls for your classroom</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setHistoryOpen(true)} 
              className="gap-2 bg-transparent"
            >
              <History className="w-4 h-4" />
              Poll History
            </Button>
            {pollState.pollCode && (
              <Button variant="outline" onClick={resetPoll} className="gap-2 bg-transparent">
                <RotateCcw className="w-4 h-4" />
                New Poll
              </Button>
            )}
              <Button
                onClick={() => setShowNewQuestionForm(true)}
                disabled={!canStartNewQuestion()}
                className="gap-2 gradient-bg text-white"
              >
                <Plus className="w-4 h-4" />
                New Question
              </Button>
            </div>
          )}
        </div>

        {!pollState.pollCode ? (
          <div className="max-w-2xl mx-auto">
            <CreatePollForm onCreatePoll={createPoll} isLoading={isCreating} />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {pollState.question && (
                <Card className="poll-card">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Current Question</span>
                      <Badge variant={pollState.isActive ? "default" : "secondary"}>
                        {pollState.isActive ? "Active" : "Ended"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-medium mb-4 text-balance">{pollState.question}</div>
                    <div className="space-y-2">
                      {pollState.options.map((option, index) => (
                        <div key={index} className="p-3 bg-accent/30 rounded-lg">
                          <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {option.text}
                        </div>
                      ))}
                    </div>
                    {pollState.isActive && (
                      <div className="mt-6">
                        <PollTimer
                          duration={pollState.duration}
                          startTime={pollState.startTime}
                          onTimeUp={handleTimeUp}
                          isActive={pollState.isActive}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Question History */}
              {pollState.questionHistory && pollState.questionHistory.length > 0 && (
                <Card className="poll-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="w-5 h-5" />
                      Previous Questions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {pollState.questionHistory.map((entry, index) => (
                        <div key={index} className="p-4 bg-accent/20 rounded-lg border">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-medium text-lg">{entry.question}</h4>
                            <div className="flex gap-2 text-sm text-muted-foreground">
                              <span>{entry.totalResponses} responses</span>
                              <span>•</span>
                              <span>{Math.round((entry.endTime - entry.startTime) / 1000)}s</span>
                            </div>
                          </div>
                          <div className="space-y-2 mb-3">
                            {entry.options.map((option, optIndex) => (
                              <div key={optIndex} className="flex items-center gap-2 p-2 bg-background/50 rounded">
                                <span className="font-medium">{String.fromCharCode(65 + optIndex)}.</span>
                                <span className="flex-1">{option.text}</span>
                                {option.isCorrect && (
                                  <Badge variant="default" className="text-xs">Correct</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Correct answers: {entry.correctAnswers.join(", ")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {pollState.showResults && (
                <PollResultsChart
                  question={pollState.question}
                  options={pollState.options}
                  answers={pollState.answers}
                />
              )}
            </div>

            <div className="space-y-6">
              <PollCodeDisplay pollCode={pollState.pollCode} isActive={pollState.isActive} />
              
              {/* Response Progress */}
              {pollState.isActive && (
                <Card className="poll-card">
                  <CardHeader>
                    <CardTitle>Response Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Responses Received</span>
                        <span className="font-medium">
                          {Object.keys(pollState.answers).length} / {pollState.expectedResponses || Object.keys(pollState.students).length}
                        </span>
                      </div>
                      <div className="w-full bg-accent/30 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min(100, (Object.keys(pollState.answers).length / (pollState.expectedResponses || Object.keys(pollState.students).length || 1)) * 100)}%` 
                          }}
                        />
                      </div>
                      {pollState.expectedResponses && (
                        <p className="text-xs text-muted-foreground">
                          Expected: {pollState.expectedResponses} students
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <StudentList students={pollState.students} answers={pollState.answers} onRemoveStudent={removeStudent} />
            </div>
          </div>
        )}

        {showNewQuestionForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="max-w-2xl w-full">
              <NewQuestionForm
                onSubmit={startNewQuestion}
                onCancel={() => setShowNewQuestionForm(false)}
                canStart={canStartNewQuestion()}
              />
            </div>
          </div>
        )}
      </div>

      {showNewQuestionForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="max-w-2xl w-full">
            <NewQuestionForm
              onSubmit={startNewQuestion}
              onCancel={() => setShowNewQuestionForm(false)}
              canStart={canStartNewQuestion()}
            />
          </div>
        </div>
      )}

      {pollState.pollCode && (
        <div className="fixed bottom-4 right-4 w-80 z-50">
          <div className="shadow-lg rounded-xl overflow-hidden bg-background border">
            <div className="flex items-center justify-between px-3 py-2 bg-accent/40">
              <div className="text-sm font-medium">Class Chat</div>
              <Button variant="ghost" size="sm" onClick={() => setChatOpen(!chatOpen)} className="bg-transparent">
                {chatOpen ? "Hide" : "Show"}
              </Button>
            </div>
            {chatOpen && (
              <div className="flex flex-col h-80">
                <div className="flex-1 p-3 space-y-3 overflow-auto">
                  {(pollState.messages || []).map((m) => (
                    <div key={m.id} className={`text-sm ${m.from === "teacher" ? "text-foreground" : ""}`}>
                      <div className="font-medium mb-0.5">
                        {m.from === "teacher" ? "You" : m.name}
                        <span className="ml-2 text-[10px] text-muted-foreground">{new Date(m.ts).toLocaleTimeString()}</span>
                      </div>
                      <div className={`px-3 py-2 rounded-lg inline-block ${m.from === "teacher" ? "bg-primary text-primary-foreground" : "bg-accent"}`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Message all students"
                    className="flex-1 px-3 py-2 rounded-md border bg-background"
                  />
                  <Button onClick={sendTeacherMessage} className="gradient-bg text-white">Send</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Poll History Dialog */}
      <PollHistory 
        teacherId={getSocket().id} 
        isOpen={historyOpen} 
        onClose={() => setHistoryOpen(false)} 
      />
    </div>
  )
}
