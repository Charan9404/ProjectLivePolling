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
  options: { text: string; isCorrect: boolean }[]
  duration: number
  startTime?: number
  hasSubmitted: boolean
  selectedAnswer: string
  results: Record<string, string> | null
  connectedStudents: Record<string, string>
  showTimer: boolean
  messages?: ChatMessage[]
}

interface ChatMessage {
  id: string
  from: "teacher" | "student"
  name: string
  text: string
  ts: number
}

export default function StudentInterface({ onBack }: StudentInterfaceProps) {
  const [state, setState] = useState<StudentState>({
    name: "",
    pollCode: "",
    isJoined: false,
    currentQuestion: "",
    options: [],
    duration: 300,
    hasSubmitted: false,
    selectedAnswer: "",
    results: null,
    connectedStudents: {},
    showTimer: false,
    messages: [],
  })
  const [isJoining, setIsJoining] = useState(false)
  const [chatOpen, setChatOpen] = useState(true)
  const [replyText, setReplyText] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    const socket = getSocket()
    
    console.log("Student interface mounted, setting up socket listeners")

    socket.on("joined_poll", ({ question, options, duration, startTime, messages }) => {
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
        messages: messages || [],
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

    socket.on("new_question", ({ question, options, duration, startTime, messages }) => {
      console.log("🎯🎯🎯 STUDENT RECEIVED NEW_QUESTION EVENT:", { question, options, duration, startTime, messages })
      console.log("🎯 Student name:", state.name)
      console.log("🎯 Poll code:", state.pollCode)
      setState((prev) => {
        console.log("Student state before new question:", { 
          hasSubmitted: prev.hasSubmitted, 
          selectedAnswer: prev.selectedAnswer, 
          results: prev.results,
          currentQuestion: prev.currentQuestion
        })
        const newState = {
          ...prev,
          currentQuestion: question,
          options,
          duration,
          startTime,
          hasSubmitted: false,
          selectedAnswer: "",
          results: null,
          showTimer: true,
          messages: messages || prev.messages || [],
        }
        
        console.log("🎯 New state after question update:", newState)
        console.log("Student state after new question:", { 
          hasSubmitted: newState.hasSubmitted, 
          selectedAnswer: newState.selectedAnswer, 
          results: newState.results,
          currentQuestion: newState.currentQuestion
        })
        return newState
      })
      toast({
        title: "New question!",
        description: "A new poll question has started",
      })
    })

    socket.on("update_results", ({ answers }) => {
      console.log("🎯🎯🎯 STUDENT RECEIVED UPDATE_RESULTS:", { answers })
      console.log("🎯 Student name:", state.name)
      console.log("🎯 Current state before update:", {
        currentQuestion: state.currentQuestion,
        options: state.options,
        selectedAnswer: state.selectedAnswer,
        hasSubmitted: state.hasSubmitted
      })
      
      // Validate the data before updating state
      if (!answers || typeof answers !== 'object') {
        console.error("🚨 Invalid answers data received:", answers)
        return
      }
      
      setState((prev) => {
        const newState = { 
          ...prev, 
          results: answers, 
          showTimer: false
        }
        console.log("🎯 New state after update:", {
          currentQuestion: newState.currentQuestion,
          options: newState.options,
          selectedAnswer: newState.selectedAnswer,
          hasSubmitted: newState.hasSubmitted,
          results: newState.results
        })
        return newState
      })
    })

    // Force update results when poll ends
    socket.on("time_up", ({ answers }) => {
      console.log("Student received time_up:", answers)
      setState((prev) => ({ ...prev, results: answers, showTimer: false }))
    })


    socket.on("chat_message", ({ message }) => {
      console.log("Student received chat message:", { 
        message, 
        studentName: state.name, 
        messageFrom: message.from, 
        messageName: message.name,
        isTeacher: message.from === "teacher",
        isOwnMessage: message.from === "student" && message.name === state.name,
        nameMatch: message.name === state.name
      })
      // Students see teacher messages and their own messages
      // Temporarily show all messages for debugging
      if (message.from === "teacher" || (message.from === "student" && message.name === state.name) || true) {
        console.log("Adding message to student chat")
        setState((prev) => {
          const newMessages = [...(prev.messages || []), message]
          console.log("Updated messages array:", newMessages)
          return { ...prev, messages: newMessages }
        })
      } else {
        console.log("Message filtered out - not teacher and not own message")
      }
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
      socket.off("chat_message")
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
    console.log("🎯🎯🎯 SUBMIT_ANSWER CALLED:", {
      selectedAnswer: state.selectedAnswer,
      hasSubmitted: state.hasSubmitted,
      studentName: state.name,
      pollCode: state.pollCode
    })

    if (!state.selectedAnswer || state.hasSubmitted) {
      console.log("❌ Cannot submit: selectedAnswer=", state.selectedAnswer, "hasSubmitted=", state.hasSubmitted)
      return
    }

    console.log("🎯 Student submitting answer:", {
      pollCode: state.pollCode,
      studentName: state.name,
      answer: state.selectedAnswer,
      options: state.options,
      currentQuestion: state.currentQuestion
    })

    // Validate answer before submitting
    if (!state.options.some(opt => opt.text === state.selectedAnswer)) {
      console.error("🚨 Invalid answer selected:", state.selectedAnswer, "Options:", state.options)
      toast({
        title: "Invalid Answer",
        description: "Please select a valid option",
        variant: "destructive"
      })
      return
    }

    console.log("✅ Validation passed, emitting submit_answer event")
    setState((prev) => ({ ...prev, hasSubmitted: true }))
    const socket = getSocket()
    
    console.log("🎯 Socket connection:", socket.connected)
    console.log("🎯 Emitting submit_answer event")
    
    socket.emit("submit_answer", {
      pollCode: state.pollCode,
      studentName: state.name,
      answer: state.selectedAnswer,
    })

    console.log("✅ submit_answer event emitted")

    toast({
      title: "Answer submitted!",
      description: "Your response has been recorded",
    })
  }

  const handleTimeUp = () => {
    setState((prev) => ({ ...prev, showTimer: false }))
  }

  const sendReply = () => {
    if (!replyText.trim() || !state.pollCode) return
    const socket = getSocket()
    socket.emit("student_send_message", { pollCode: state.pollCode, text: replyText.trim() })
    setReplyText("")
  }

  const leavePoll = () => {
    setState({
      name: "",
      pollCode: "",
      isJoined: false,
      currentQuestion: "",
      options: [],
      duration: 300,
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

  // Debug logging
  console.log("🎯 Student render state:", {
    name: state.name,
    currentQuestion: state.currentQuestion,
    selectedAnswer: state.selectedAnswer,
    hasSubmitted: state.hasSubmitted,
    results: state.results,
    options: state.options
  })

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
                          onClick={() => {
                            console.log("🎯 Option clicked:", option.text, "current selectedAnswer:", state.selectedAnswer)
                            setState((prev) => ({ ...prev, selectedAnswer: option.text }))
                            console.log("✅ Option set in state")
                          }}
                          className={`p-4 text-left rounded-lg border-2 transition-all ${
                            state.selectedAnswer === option.text
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50 hover:bg-accent/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                state.selectedAnswer === option.text
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-muted-foreground"
                              }`}
                            >
                              {state.selectedAnswer === option.text && <div className="w-2 h-2 bg-current rounded-full" />}
                            </div>
                            <span className="font-medium">{String.fromCharCode(65 + index)}.</span>
                            <span>{option.text}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <Button
                      onClick={() => {
                        console.log("🎯 Submit button clicked!")
                        console.log("🎯 Current state:", {
                          selectedAnswer: state.selectedAnswer,
                          hasSubmitted: state.hasSubmitted,
                          options: state.options
                        })
                        submitAnswer()
                      }}
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
                  <div className="space-y-6">
                    <div className="text-center py-4">
                      <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                      <h3 className="text-lg font-semibold mb-2">Answer Submitted!</h3>
                      <p className="text-muted-foreground">Waiting for other students to respond...</p>
                    </div>
                    
                    {/* Show student's selection */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground">Your Answer:</h4>
                      <div className="p-3 rounded-lg border-2 border-primary bg-primary/5">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full border-2 border-primary bg-primary text-white flex items-center justify-center">
                            <div className="w-2 h-2 bg-current rounded-full" />
                          </div>
                          <span className="font-medium">
                            {String.fromCharCode(65 + state.options.findIndex(opt => opt.text === state.selectedAnswer))}.
                          </span>
                          <span className="font-medium">{state.selectedAnswer}</span>
                          <span className="ml-auto px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                            Your Choice
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Show correct answers */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground">Correct Answers:</h4>
                      <div className="space-y-2">
                        {state.options.map((option, index) => {
                          const isStudentChoice = option.text === state.selectedAnswer
                          const isCorrect = option.isCorrect
                          const isCorrectAndSelected = isCorrect && isStudentChoice
                          
                          return (
                            <div key={index} className={`p-3 rounded-lg border ${
                              isCorrect 
                                ? "border-green-200 bg-green-50" 
                                : "border-gray-200 bg-gray-50"
                            }`}>
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                  isCorrect 
                                    ? "border-green-500 bg-green-500 text-white" 
                                    : "border-gray-300"
                                }`}>
                                  {isCorrect && <div className="w-2 h-2 bg-current rounded-full" />}
                                </div>
                                <span className="font-medium">{String.fromCharCode(65 + index)}.</span>
                                <span className={isCorrect ? "text-green-800 font-medium" : "text-gray-600"}>
                                  {option.text}
                                </span>
                                <div className="ml-auto flex gap-2">
                                  {isStudentChoice && (
                                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                      You Selected
                                    </span>
                                  )}
                                  {isCorrect && (
                                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                      ✓ Correct
                                    </span>
                                  )}
                                  {isCorrectAndSelected && (
                                    <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-full">
                                      Right!
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {state.results && (
            <div className="space-y-6">
              {/* Student's personal result */}
              <Card className="poll-card">
                <CardHeader>
                  <CardTitle className="text-lg">Your Result</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg border-2 border-primary bg-primary/5">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full border-2 border-primary bg-primary text-white flex items-center justify-center">
                          <div className="w-2 h-2 bg-current rounded-full" />
                        </div>
                        <span className="font-medium">
                          {String.fromCharCode(65 + state.options.findIndex(opt => opt.text === state.selectedAnswer))}.
                        </span>
                        <span className="font-medium">{state.selectedAnswer}</span>
                        <div className="ml-auto flex gap-2">
                          {state.options.find(opt => opt.text === state.selectedAnswer)?.isCorrect ? (
                            <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-full">
                              Correct!
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                              Incorrect
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Full results with voting counts */}
              <PollResultsChart question={state.currentQuestion} options={state.options} answers={state.results} />
            </div>
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

      {/* Chat Panel - Student (view teacher, reply to teacher) */}
      <div className="fixed bottom-4 right-4 w-80 z-50">
        <div className="shadow-lg rounded-xl overflow-hidden bg-background border">
          <div className="flex items-center justify-between px-3 py-2 bg-accent/40">
            <div className="text-sm font-medium">Teacher Chat</div>
            <Button variant="ghost" size="sm" onClick={() => setChatOpen(!chatOpen)} className="bg-transparent">
              {chatOpen ? "Hide" : "Show"}
            </Button>
          </div>
          {chatOpen && (
            <div className="flex flex-col h-72">
              <div className="flex-1 p-3 space-y-3 overflow-auto">
                {console.log("Rendering messages:", state.messages)}
                {(state.messages || []).map((m) => (
                  <div key={m.id} className="text-sm">
                    <div className="font-medium mb-0.5">
                      {m.from === "teacher" ? "Teacher" : m.name}
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
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Reply to teacher"
                  className="flex-1 px-3 py-2 rounded-md border bg-background"
                />
                <Button onClick={sendReply} className="gradient-bg text-white">Send</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
