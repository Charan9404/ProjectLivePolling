"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Minus, Play, X, AlertCircle, Dice6 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface NewQuestionFormProps {
  onSubmit: (question: string, options: { text: string; isCorrect: boolean }[], duration: number, expectedResponses: number | null) => void
  onCancel: () => void
  canStart: boolean
}

export default function NewQuestionForm({ onSubmit, onCancel, canStart }: NewQuestionFormProps) {
  const [question, setQuestion] = useState("")
  const [options, setOptions] = useState([{ text: "", isCorrect: false }, { text: "", isCorrect: false }])
  const [duration, setDuration] = useState(60)
  const [expectedResponses, setExpectedResponses] = useState<number | null>(null)
  const [diceClickCount, setDiceClickCount] = useState(0)

  // Predefined option sets for dice feature
  const optionSets = [
    [
      { text: "Yes", isCorrect: false },
      { text: "No", isCorrect: false }
    ],
    [
      { text: "Strongly Agree", isCorrect: false },
      { text: "Agree", isCorrect: false },
      { text: "Neutral", isCorrect: false },
      { text: "Disagree", isCorrect: false },
      { text: "Strongly Disagree", isCorrect: false }
    ],
    [
      { text: "Excellent", isCorrect: false },
      { text: "Good", isCorrect: false },
      { text: "Average", isCorrect: false },
      { text: "Poor", isCorrect: false }
    ],
    [
      { text: "Very Easy", isCorrect: false },
      { text: "Easy", isCorrect: false },
      { text: "Medium", isCorrect: false },
      { text: "Hard", isCorrect: false },
      { text: "Very Hard", isCorrect: false }
    ]
  ]

  const rollDice = () => {
    const nextSet = diceClickCount % optionSets.length
    setOptions(optionSets[nextSet])
    setDiceClickCount(diceClickCount + 1)
  }

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, { text: "", isCorrect: false }])
    }
  }

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const updateOptionText = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = { ...newOptions[index], text: value }
    setOptions(newOptions)
  }

  const updateOptionCorrect = (index: number, isCorrect: boolean) => {
    const newOptions = [...options]
    newOptions[index] = { ...newOptions[index], isCorrect }
    setOptions(newOptions)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanOptions = options
      .map((opt) => ({ ...opt, text: opt.text.trim() }))
      .filter((opt) => opt.text !== "")

    if (!question.trim() || cleanOptions.length < 2) {
      return
    }

    onSubmit(question.trim(), cleanOptions, duration, expectedResponses)
  }

  const isValid = question.trim() && options.filter((opt) => opt.text.trim()).length >= 2

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
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={rollDice}
                  title="Roll dice for quick automated options"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600"
                >
                  <Dice6 className="w-4 h-4 mr-1" />
                  Roll Dice
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={addOption} disabled={options.length >= 6}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Option
                </Button>
              </div>
            </div>
            {options.map((option, index) => (
              <div key={index} className="space-y-3 p-4 border rounded-lg">
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <Input
                    placeholder={`Option ${index + 1}`}
                    value={option.text}
                    onChange={(e) => updateOptionText(index, e.target.value)}
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
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground">Is it Correct?</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`correct-${index}`}
                        checked={option.isCorrect === true}
                        onChange={() => updateOptionCorrect(index, true)}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-sm">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`correct-${index}`}
                        checked={option.isCorrect === false}
                        onChange={() => updateOptionCorrect(index, false)}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-sm">No</span>
                    </label>
                  </div>
                </div>
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

          <div className="space-y-2">
            <Label htmlFor="expectedResponses">Expected Responses (Optional)</Label>
            <Input
              id="expectedResponses"
              type="number"
              placeholder="e.g., 25 (leave empty for all joined students)"
              value={expectedResponses || ""}
              onChange={(e) => setExpectedResponses(e.target.value ? Number.parseInt(e.target.value) : null)}
              min="1"
              max="1000"
            />
            <p className="text-xs text-muted-foreground">
              Set how many students you expect to answer. Leave empty to allow all joined students to answer.
            </p>
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
