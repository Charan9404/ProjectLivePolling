"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Minus, Play, X, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface NewQuestionFormProps {
  onSubmit: (question: string, options: string[], duration: number) => void
  onCancel: () => void
  canStart: boolean
}

export default function NewQuestionForm({ onSubmit, onCancel, canStart }: NewQuestionFormProps) {
  const [question, setQuestion] = useState("")
  const [options, setOptions] = useState(["", ""])
  const [duration, setDuration] = useState(60)

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, ""])
    }
  }

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanOptions = options.map((opt) => opt.trim()).filter((opt) => opt !== "")

    if (!question.trim() || cleanOptions.length < 2) {
      return
    }

    onSubmit(question.trim(), cleanOptions, duration)
  }

  const isValid = question.trim() && options.filter((opt) => opt.trim()).length >= 2

  return (
    <Card className="poll-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Start New Question</span>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!canStart && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Wait for all students to answer the current question or for time to run out before starting a new one.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="question">Poll Question</Label>
            <Textarea
              id="question"
              placeholder="What would you like to ask your students?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-20"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Answer Options</Label>
              <Button type="button" variant="outline" size="sm" onClick={addOption} disabled={options.length >= 6}>
                <Plus className="w-4 h-4 mr-1" />
                Add Option
              </Button>
            </div>
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeOption(index)}
                  disabled={options.length <= 2}
                >
                  <Minus className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Time Limit</Label>
            <Select value={duration.toString()} onValueChange={(value) => setDuration(Number.parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 seconds</SelectItem>
                <SelectItem value="60">1 minute</SelectItem>
                <SelectItem value="120">2 minutes</SelectItem>
                <SelectItem value="300">5 minutes</SelectItem>
                <SelectItem value="600">10 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 gradient-bg text-white" disabled={!isValid || !canStart}>
              <Play className="w-4 h-4 mr-2" />
              Start Question
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
