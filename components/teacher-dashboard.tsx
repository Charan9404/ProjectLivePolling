"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, RotateCcw } from "lucide-react"
import { getSocket } from "@/lib/socket"
import { useToast } from "@/hooks/use-toast"
import CreatePollForm from "./create-poll-form"
import PollCodeDisplay from "./poll-code-display"
import StudentList from "./student-list"
import PollResultsChart from "./poll-results-chart"
import PollTimer from "./poll-timer"
import NewQuestionForm from "./new-question-form"

interface TeacherDashboardProps {
  onBack: () => void
}

interface PollState {
  pollCode: string | null
  question: string
  options: string[]
  answers: Record<string, string>
  students: Record<string, string>
  duration: number
  startTime?: number
  isActive: boolean
  showResults: boolean
}

export default function TeacherDashboard({ onBack }: TeacherDashboardProps) {
  const [pollState, setPollState] = useState<PollState>({
    pollCode: null,
    question: "",
    options: [],
    answers: {},
    students: {},
    duration: 60,
    isActive: false,
    showResults: false,
  })
  const [isCreating, setIsCreating] = useState(false)
  const [showNewQuestionForm, setShowNewQuestionForm] = useState(false)
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
      toast({
        title: "Poll created successfully!",
        description: `Share code ${pollCode} with your students`,
      })
    })

    socket.on("joined_poll_ack", ({ students }) => {
      setPollState((prev) => ({ ...prev, students }))
    })

    socket.on("update_results", ({ answers }) => {
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

    socket.on("poll_state", ({ question, options, answers, students, duration, startTime, isActive }) => {
      setPollState((prev) => ({
        ...prev,
        question,
        options,
        answers,
        students,
        duration,
        startTime,
        isActive,
        showResults: !isActive && Object.keys(answers || {}).length > 0,
      }))
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
      socket.off("error")
    }
  }, [toast])

  const createPoll = (question: string, options: string[], duration: number) => {
    setIsCreating(true)
    setPollState((prev) => ({ ...prev, question, options, duration }))
    const socket = getSocket()
    socket.emit("teacher_create_poll", { question, options, duration })
  }

  const startNewQuestion = (question: string, options: string[], duration: number) => {
    if (!pollState.pollCode) return

    console.log("Teacher starting new question:", { question, options, duration, pollCode: pollState.pollCode })

    setPollState((prev) => ({
      ...prev,
      question,
      options,
      duration,
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
      duration: 60,
      isActive: false,
      showResults: false,
    })
    setShowNewQuestionForm(false)
  }

  const canStartNewQuestion = () => {
    const allAnswered = Object.keys(pollState.answers).length === Object.keys(pollState.students).length
    return !pollState.isActive || allAnswered
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
          {pollState.pollCode && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetPoll} className="gap-2 bg-transparent">
                <RotateCcw className="w-4 h-4" />
                New Poll
              </Button>
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
                          <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {option}
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
    </div>
  )
}
