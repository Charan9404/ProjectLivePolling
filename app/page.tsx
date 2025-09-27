"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, GraduationCap, BarChart3, Clock } from "lucide-react"
import TeacherDashboard from "@/components/teacher-dashboard"
import StudentInterface from "@/components/student-interface"

export default function HomePage() {
  const [role, setRole] = useState<"teacher" | "student" | null>(null)

  if (role === "teacher") {
    return <TeacherDashboard onBack={() => setRole(null)} />
  }

  if (role === "student") {
    return <StudentInterface onBack={() => setRole(null)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-primary/10">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <BarChart3 className="w-4 h-4" />
            Live Polling System
          </div>
          <h1 className="text-5xl font-bold text-foreground mb-6 text-balance">
            Engage your classroom with
            <span className="text-primary"> real-time polls</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            Create interactive polls, gather instant feedback, and visualize results in real-time. Perfect for
            classrooms, meetings, and presentations.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card
            className="poll-card hover:shadow-lg transition-all duration-300 cursor-pointer group"
            onClick={() => setRole("teacher")}
          >
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Teacher Dashboard</CardTitle>
              <CardDescription className="text-base">
                Create polls, manage questions, and view live results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Create unlimited polls with custom questions
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Set time limits and manage student responses
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                View real-time analytics and results
              </div>
              <Button className="w-full mt-6 gradient-bg border-0 text-white hover:opacity-90">Start Teaching</Button>
            </CardContent>
          </Card>

          <Card
            className="poll-card hover:shadow-lg transition-all duration-300 cursor-pointer group"
            onClick={() => setRole("student")}
          >
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Student Portal</CardTitle>
              <CardDescription className="text-base">Join polls with a code and submit your answers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Join any poll with a simple 6-digit code
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Submit answers and see live results
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Participate in real-time discussions
              </div>
              <Button
                variant="outline"
                className="w-full mt-6 border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
              >
                Join Poll
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Real-time Updates</h3>
              <p className="text-sm text-muted-foreground">See responses as they come in with live synchronization</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Visual Analytics</h3>
              <p className="text-sm text-muted-foreground">Beautiful charts and graphs to visualize poll results</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Easy Participation</h3>
              <p className="text-sm text-muted-foreground">Students join instantly with just a name and poll code</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
