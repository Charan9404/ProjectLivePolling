"use client"

import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"
import { Clock } from "lucide-react"

interface PollTimerProps {
  duration: number
  onTimeUp: () => void
  isActive: boolean
}

export default function PollTimer({ duration, onTimeUp, isActive }: PollTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration)

  useEffect(() => {
    if (!isActive) return

    setTimeLeft(duration)
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [duration, onTimeUp, isActive])

  const progress = ((duration - timeLeft) / duration) * 100
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Clock className="w-4 h-4" />
          Time Remaining
        </div>
        <div className="text-lg font-mono font-bold text-primary">
          {minutes}:{seconds.toString().padStart(2, "0")}
        </div>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  )
}
