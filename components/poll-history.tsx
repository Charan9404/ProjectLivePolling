"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { History, Users, Clock, CheckCircle, XCircle, MessageSquare, BarChart3 } from "lucide-react"
import PollResultsChart from "./poll-results-chart"
import { getApiUrl } from "@/lib/config"

interface PollHistoryEntry {
  _id: string
  pollCode: string
  question: string
  options: { text: string; isCorrect: boolean }[]
  answers: Record<string, string>
  students: Record<string, string>
  totalResponses: number
  correctAnswers: string[]
  duration: number
  expectedResponses?: number
  startTime: number
  endTime: number
  createdAt: string
  messages: Array<{
    id: string
    from: 'teacher' | 'student'
    name: string
    text: string
    ts: number
  }>
}

interface PollHistoryProps {
  teacherId: string
  isOpen: boolean
  onClose: () => void
}

export default function PollHistory({ teacherId, isOpen, onClose }: PollHistoryProps) {
  const [history, setHistory] = useState<PollHistoryEntry[]>([])
  const [selectedPoll, setSelectedPoll] = useState<PollHistoryEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    totalPolls: 0,
    totalResponses: 0,
    avgResponses: 0,
    totalStudents: 0
  })

  useEffect(() => {
    if (isOpen && teacherId) {
      fetchHistory()
    }
  }, [isOpen, teacherId])

  useEffect(() => {
    if (history.length > 0) {
      fetchStats()
    }
  }, [history])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const response = await fetch(getApiUrl('/api/poll-history-all'))
      if (response.ok) {
        const data = await response.json()
        setHistory(data.data || [])
      } else {
        console.error('Failed to fetch poll history')
      }
    } catch (error) {
      console.error('Error fetching poll history:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      // Calculate stats from the history data instead of using API
      if (history.length > 0) {
        const totalPolls = history.length
        const totalResponses = history.reduce((sum, poll) => sum + poll.totalResponses, 0)
        const avgResponses = totalResponses / totalPolls
        const totalStudents = history.reduce((sum, poll) => sum + Object.keys(poll.students).length, 0)
        
        setStats({
          totalPolls,
          totalResponses,
          avgResponses,
          totalStudents
        })
      }
    } catch (error) {
      console.error('Error calculating poll stats:', error)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getAccuracyRate = (poll: PollHistoryEntry) => {
    if (poll.totalResponses === 0) return 0
    const correctCount = Object.values(poll.answers).filter(answer => 
      poll.correctAnswers.includes(answer)
    ).length
    return Math.round((correctCount / poll.totalResponses) * 100)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-0 flex items-center justify-center p-0">
        <div className="w-full h-full bg-background border-0 shadow-none overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-8 pb-6 border-b bg-gradient-to-r from-primary/10 to-accent/10 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-3 text-4xl font-bold">
                <History className="w-8 h-8" />
                Poll History
              </h2>
              <p className="text-xl text-muted-foreground mt-2">
                View past poll results and analytics
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-2xl hover:bg-accent rounded-full p-2 transition-colors"
            >
              ×
            </button>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 overflow-hidden p-8">
          {/* Stats Overview */}
          <div className="lg:col-span-1 space-y-4 overflow-y-auto pr-2">
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/10">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl flex items-center gap-3">
                  <BarChart3 className="w-6 h-6 text-primary" />
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 border">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <span className="text-lg font-medium">Total Polls</span>
                  </div>
                  <Badge variant="default" className="bg-primary text-primary-foreground text-lg px-3 py-1">{stats.totalPolls}</Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 border">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-lg font-medium">Total Responses</span>
                  </div>
                  <Badge variant="default" className="bg-green-500 text-white text-lg px-3 py-1">{stats.totalResponses}</Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 border">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-lg font-medium">Avg Responses</span>
                  </div>
                  <Badge variant="default" className="bg-blue-500 text-white text-lg px-3 py-1">{stats.avgResponses.toFixed(1)}</Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 border">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-lg font-medium">Total Students</span>
                  </div>
                  <Badge variant="default" className="bg-purple-500 text-white text-lg px-3 py-1">{stats.totalStudents}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Poll History List */}
            <Card className="border-2 border-accent/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl flex items-center gap-2">
                  <History className="w-5 h-5 text-accent" />
                  Recent Polls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                      Loading polls...
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No polls found</p>
                      <p className="text-sm">Create your first poll to see it here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {history.map((poll) => (
                        <Card 
                          key={poll._id} 
                          className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${
                            selectedPoll?._id === poll._id 
                              ? 'ring-2 ring-primary bg-primary/5' 
                              : 'hover:bg-accent/30'
                          }`}
                          onClick={() => setSelectedPoll(poll)}
                        >
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <span className="font-medium text-sm line-clamp-2 flex-1">
                                  {poll.question}
                                </span>
                                <Badge variant="outline" className="text-xs ml-2 shrink-0">
                                  {poll.pollCode || 'N/A'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {poll.totalResponses} responses
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDuration(poll.duration)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  {getAccuracyRate(poll)}% accuracy
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(poll.createdAt)}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Poll Details */}
          <div className="lg:col-span-3 overflow-y-auto pr-2">
            {selectedPoll ? (
              <div className="space-y-6">
                {/* Poll Header */}
                <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/10">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-2xl mb-2 line-clamp-2">{selectedPoll.question}</CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">Code</Badge>
                            {selectedPoll.pollCode || 'N/A'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(selectedPoll.createdAt)}
                          </span>
                        </CardDescription>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <Badge variant="default" className="bg-primary text-primary-foreground">
                          {selectedPoll.totalResponses} responses
                        </Badge>
                        <Badge variant={getAccuracyRate(selectedPoll) >= 70 ? "default" : "destructive"} className="text-xs">
                          {getAccuracyRate(selectedPoll)}% accuracy
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Results Chart */}
                <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-green-800">
                      <BarChart3 className="w-5 h-5" />
                      Poll Results
                      <Badge variant="outline" className="ml-auto text-xs">
                        {selectedPoll.totalResponses} responses
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PollResultsChart 
                      question={selectedPoll.question}
                      options={selectedPoll.options}
                      answers={selectedPoll.answers}
                    />
                  </CardContent>
                </Card>

                {/* Student Responses */}
                <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-blue-800">
                      <Users className="w-5 h-5" />
                      Student Responses
                      <Badge variant="outline" className="ml-auto text-xs">
                        {Object.keys(selectedPoll.answers).length} students
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-3">
                        {Object.entries(selectedPoll.answers).map(([studentName, answer]) => {
                          const isCorrect = selectedPoll.correctAnswers.includes(answer)
                          return (
                            <div key={studentName} className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                              isCorrect 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-red-50 border-red-200'
                            }`}>
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                  isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {studentName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-medium">{studentName}</span>
                                  <span className="text-muted-foreground ml-2">→</span>
                                  <span className="font-medium">{answer}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {isCorrect ? (
                                  <CheckCircle className="w-5 h-5 text-green-500" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-red-500" />
                                )}
                                <Badge variant={isCorrect ? "default" : "destructive"} className="text-xs">
                                  {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                                </Badge>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Chat Messages */}
                {selectedPoll.messages && selectedPoll.messages.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Chat Messages
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[500px]">
                        <div className="space-y-2">
                          {selectedPoll.messages.map((message) => (
                            <div key={message.id} className="p-2 rounded-lg bg-accent/20">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={message.from === 'teacher' ? 'default' : 'secondary'} className="text-xs">
                                  {message.from === 'teacher' ? 'Teacher' : message.name}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(message.ts)}
                                </span>
                              </div>
                              <p className="text-sm">{message.text}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="h-96">
                <CardContent className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a poll to view details</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
