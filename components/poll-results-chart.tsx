"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BarChart3, Users } from "lucide-react"

interface PollResultsChartProps {
  question: string
  options: { text: string; isCorrect: boolean }[]
  answers: Record<string, string>
}

export default function PollResultsChart({ question, options, answers }: PollResultsChartProps) {
  console.log("PollResultsChart received:", { question, options, answers })
  
  const answerCounts = options.reduce(
    (acc, option) => {
      acc[option.text] = Object.values(answers).filter((answer) => answer === option.text).length
      return acc
    },
    {} as Record<string, number>,
  )

  const totalAnswers = Object.values(answerCounts).reduce((sum, count) => sum + count, 0)
  const maxCount = Math.max(...Object.values(answerCounts))
  
  console.log("PollResultsChart calculated:", { answerCounts, totalAnswers, maxCount })

  return (
    <Card className="poll-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Poll Results
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          {totalAnswers} responses
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-lg font-medium text-balance">{question}</div>
        <div className="space-y-4">
          {options.map((option, index) => {
            const count = answerCounts[option.text]
            const percentage = totalAnswers > 0 ? (count / totalAnswers) * 100 : 0
            const isHighest = count === maxCount && count > 0

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${isHighest ? "text-primary" : "text-foreground"}`}>
                      {option.text}
                    </span>
                    {option.isCorrect && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        ✓ Correct
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{count}</span>
                    <span className={`text-sm font-medium ${isHighest ? "text-primary" : "text-muted-foreground"}`}>
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <Progress value={percentage} className="h-3" />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
