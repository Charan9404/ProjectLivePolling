"use client"

import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"
import { Clock } from "lucide-react"

interface PollTimerProps {
  duration: number
  startTime?: number
  onTimeUp: () => void
  isActive: boolean
}

export default function PollTimer({ duration, startTime, onTimeUp, isActive }: PollTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration)

  useEffect(() => {
    console.log("PollTimer effect:", { duration, startTime, isActive })
    
    if (!isActive) return

    const updateTimer = () => {
      if (startTime) {
        // Calculate remaining time based on server start time
        const elapsed = (Date.now() - startTime) / 1000
        const remaining = Math.max(0, duration - elapsed)
        
        console.log("Timer calculation:", { elapsed, remaining, startTime, duration })
        
        if (remaining <= 0) {
          onTimeUp()
          return 0
        }
        return Math.ceil(remaining)
      } else {
        console.log("No startTime, using fallback timer")
        // Fallback to local timer if no startTime provided
        return (prev: number) => {
          if (prev <= 1) {
            onTimeUp()
            return 0
          }
          return prev - 1
        }
      }
    }

    // Initial calculation
    const initialTime = startTime ? updateTimer() : duration
    console.log("Initial time set to:", initialTime)
    setTimeLeft(initialTime)

    const interval = setInterval(() => {
      if (startTime) {
        const newTime = updateTimer()
        setTimeLeft(newTime)
      } else {
        setTimeLeft(updateTimer())
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [duration, startTime, onTimeUp, isActive])

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
