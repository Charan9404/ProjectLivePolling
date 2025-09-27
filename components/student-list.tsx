"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, UserMinus, CheckCircle, Clock } from "lucide-react"

interface StudentListProps {
  students: Record<string, string>
  answers: Record<string, string>
  onRemoveStudent: (studentId: string) => void
}

export default function StudentList({ students, answers, onRemoveStudent }: StudentListProps) {
  const studentEntries = Object.entries(students)
  const answeredCount = Object.keys(answers).length

  return (
    <Card className="poll-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Connected Students
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {studentEntries.length} joined
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 bg-accent/50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Response Progress</span>
            <span className="font-medium">
              {answeredCount} / {studentEntries.length} answered
            </span>
          </div>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {studentEntries.map(([studentId, studentName]) => {
            const hasAnswered = answers[studentName] !== undefined

            return (
              <div key={studentId} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">{studentName.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="font-medium">{studentName}</span>
                  {hasAnswered ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveStudent(studentId)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <UserMinus className="w-4 h-4" />
                </Button>
              </div>
            )
          })}
          {studentEntries.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No students have joined yet</p>
              <p className="text-sm">Share your poll code to get started</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
