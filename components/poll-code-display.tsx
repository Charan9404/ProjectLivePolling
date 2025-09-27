"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, Check, Share2, QrCode } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PollCodeDisplayProps {
  pollCode: string
  isActive: boolean
}

export default function PollCodeDisplay({ pollCode, isActive }: PollCodeDisplayProps) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(pollCode)
      setCopied(true)
      toast({
        title: "Poll code copied!",
        description: "Share this code with your students",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the code manually",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="poll-card border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Poll Code
          </div>
          <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-green-500" : ""}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-4xl font-mono font-bold text-primary mb-2 tracking-wider">{pollCode}</div>
          <p className="text-sm text-muted-foreground">Share this code with your students</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={copyToClipboard} className="flex-1 bg-transparent" variant="outline">
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? "Copied!" : "Copy Code"}
          </Button>
          <Button variant="outline" size="icon">
            <QrCode className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
