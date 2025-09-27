"use client"

import { io, type Socket } from "socket.io-client"

let socket: Socket | null = null

export const getSocket = (): Socket => {
  if (!socket) {
    // Prefer explicit env override when available
    const envUrl = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SOCKET_URL : undefined

    const serverUrl =
      envUrl && envUrl.trim().length > 0
        ? envUrl.trim()
        : process.env.NODE_ENV === "production"
          ? window.location.origin
          : "http://localhost:5005"

    console.log("[v0] Using Socket.IO URL:", serverUrl)

    socket = io(serverUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      timeout: 20000,
      forceNew: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socket.on("connect", () => {
      console.log("Connected to server:", socket?.id)
    })

    socket.on("disconnect", (reason) => {
      console.log("Disconnected from server:", reason)
    })

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error)
    })
  }
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    disconnectSocket()
  })
}
