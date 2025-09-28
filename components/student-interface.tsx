"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Users, Clock, CheckCircle } from "lucide-react"
import { getSocket } from "@/lib/socket"
import { useToast } from "@/hooks/use-toast"
import PollTimer from "./poll-timer"
import PollResultsChart from "./poll-results-chart"

interface StudentInterfaceProps {
  onBack: () => void
}

interface StudentState {
  name: string
  pollCode: string
  isJoined: boolean
  currentQuestion: string
  options: string[]
  duration: number
  startTime?: number
  hasSubmitted: boolean
  selectedAnswer: string
  results: Record<string, string> | null
  connectedStudents: Record<string, string>
  showTimer: boolean
}

export default function StudentInterface({ onBack }: StudentInterfaceProps) {
  const [state, setState] = useState<StudentState>({
    name: "",
    pollCode: "",
    isJoined: false,
    currentQuestion: "",
    options: [],
    duration: 60,
    hasSubmitted: false,
    selectedAnswer: "",
    results: null,
    connectedStudents: {},
    showTimer: false,
  })
  const [isJoining, setIsJoining] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const socket = getSocket()

    socket.on("joined_poll", ({ question, options, duration, startTime }) => {
      setState((prev) => ({
        ...prev,
        isJoined: true,
        currentQuestion: question,
        options,
        duration,
        startTime,
        hasSubmitted: false,
        selectedAnswer: "",
        results: null,
        showTimer: true,
      }))
      setIsJoining(false)
      toast({
        title: "Successfully joined poll!",
        description: "You can now participate in the poll",
      })
    })

    socket.on("joined_poll_ack", ({ students }) => {
      setState((prev) => ({ ...prev, connectedStudents: students }))
    })

    socket.on("new_question", ({ question, options, duration, startTime }) => {
      setState((prev) => ({
        ...prev,
        currentQuestion: question,
        options,
        duration,
        startTime,
        hasSubmitted: false,
        selectedAnswer: "",
        results: null,
        showTimer: true,
      }))
      toast({
        title: "New question!",
        description: "A new poll question has started",
      })
    })

    socket.on("update_results", ({ answers }) => {
      setState((prev) => ({ ...prev, results: answers, showTimer: false }))
    })

    socket.on("error", (message) => {
      setIsJoining(false)
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    })

    return () => {
      socket.off("joined_poll")
      socket.off("joined_poll_ack")
      socket.off("new_question")
      socket.off("update_results")
      socket.off("error")
    }
  }, [toast])

  const joinPoll = (e: React.FormEvent) => {
    e.preventDefault()
    if (!state.name.trim() || !state.pollCode.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both your name and poll code",
        variant: "destructive",
      })
      return
    }

    setIsJoining(true)
    // Store name in session storage for this poll code
    sessionStorage.setItem(`poll_name_${state.pollCode}`, state.name.trim())

    const socket = getSocket()
    socket.emit("student_join", {
      pollCode: state.pollCode.trim(),
      studentName: state.name.trim(),
    })
  }

  const submitAnswer = () => {
    if (!state.selectedAnswer || state.hasSubmitted) return

    setState((prev) => ({ ...prev, hasSubmitted: true }))
    const socket = getSocket()
    socket.emit("submit_answer", {
      pollCode: state.pollCode,
      studentName: state.name,
      answer: state.selectedAnswer,
    })

    toast({
      title: "Answer submitted!",
      description: "Your response has been recorded",
    })
  }

  const handleTimeUp = () => {
    setState((prev) => ({ ...prev, showTimer: false }))
  }

  const leavePoll = () => {
    setState({
      name: "",
      pollCode: "",
      isJoined: false,
      currentQuestion: "",
      options: [],
      duration: 60,
      hasSubmitted: false,
      selectedAnswer: "",
      results: null,
      connectedStudents: {},
      showTimer: false,
    })
  }

  // Load saved name for this poll code
  useEffect(() => {
    if (state.pollCode) {
      const savedName = sessionStorage.getItem(`poll_name_${state.pollCode}`)
      if (savedName) {
        setState((prev) => ({ ...prev, name: savedName }))
      }
    }
  }, [state.pollCode])

  if (!state.isJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-primary/10">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={onBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Join Poll</h1>
              <p className="text-muted-foreground">Enter your details to participate in the live poll</p>
            </div>
          </div>

          <div className="max-w-md mx-auto">
            <Card className="poll-card">
              <CardHeader>
                <CardTitle>Student Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={joinPoll} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter your name"
                      value={state.name}
                      onChange={(e) => setState((prev) => ({ ...prev, name: e.target.value }))}
                      className="text-center text-lg"
                    />
                    <p className="text-xs text-muted-foreground">This name will be visible to your teacher</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pollCode">Poll Code</Label>
                    <Input
                      id="pollCode"
                      placeholder="Enter 6-digit code"
                      value={state.pollCode}
                      onChange={(e) => setState((prev) => ({ ...prev, pollCode: e.target.value }))}
                      className="text-center text-2xl font-mono tracking-wider"
                      maxLength={6}
                    />
                    <p className="text-xs text-muted-foreground">Get this code from your teacher</p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full gradient-bg text-white"
                    disabled={isJoining || !state.name.trim() || !state.pollCode.trim()}
                  >
                    {isJoining ? "Joining..." : "Join Poll"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-primary/10">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={leavePoll} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Leave Poll
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Poll Participant</h1>
              <p className="text-muted-foreground">Welcome, {state.name}!</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              <Users className="w-4 h-4 mr-1" />
              {Object.keys(state.connectedStudents).length} students
            </Badge>
            <Badge variant="outline" className="font-mono">
              {state.pollCode}
            </Badge>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {state.currentQuestion && (
            <Card className="poll-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Current Question</span>
                  {state.hasSubmitted && (
                    <Badge className="bg-green-500">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Submitted
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-xl font-medium text-balance">{state.currentQuestion}</div>

                {!state.hasSubmitted && !state.results && (
                  <>
                    <div className="grid gap-3">
                      {state.options.map((option, index) => (
                        <button
                          key={index}
                          onClick={() => setState((prev) => ({ ...prev, selectedAnswer: option }))}
                          className={`p-4 text-left rounded-lg border-2 transition-all ${
                            state.selectedAnswer === option
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50 hover:bg-accent/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                state.selectedAnswer === option
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-muted-foreground"
                              }`}
                            >
                              {state.selectedAnswer === option && <div className="w-2 h-2 bg-current rounded-full" />}
                            </div>
                            <span className="font-medium">{String.fromCharCode(65 + index)}.</span>
                            <span>{option}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <Button
                      onClick={submitAnswer}
                      disabled={!state.selectedAnswer}
                      className="w-full gradient-bg text-white"
                    >
                      Submit Answer
                    </Button>
                  </>
                )}

                {state.showTimer && !state.hasSubmitted && (
                  <PollTimer 
                    duration={state.duration} 
                    startTime={state.startTime}
                    onTimeUp={handleTimeUp} 
                    isActive={true} 
                  />
                )}

                {state.hasSubmitted && !state.results && (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                    <h3 className="text-lg font-semibold mb-2">Answer Submitted!</h3>
                    <p className="text-muted-foreground">Waiting for other students to respond...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {state.results && (
            <PollResultsChart question={state.currentQuestion} options={state.options} answers={state.results} />
          )}

          {!state.currentQuestion && (
            <Card className="poll-card">
              <CardContent className="text-center py-12">
                <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Waiting for Question</h3>
                <p className="text-muted-foreground">Your teacher will start the poll shortly</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
