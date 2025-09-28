import { io } from "socket.io-client"

const fromCRA = process.env.REACT_APP_BACKEND_URL
const fromNext = process.env.NEXT_PUBLIC_BACKEND_URL
const SOCKET_URL = (fromCRA && fromCRA.trim()) || (fromNext && fromNext.trim()) || "http://localhost:5005"

console.log("[LivePolling] Using Socket.IO URL:", SOCKET_URL)

const socket = io(SOCKET_URL, {
  path: "/socket.io", // ensure consistent path
  transports: ["websocket"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  timeout: 20000,
})

socket.on("connect", () => {
  console.log("✅ Connected to server:", socket.id)
})

socket.on("disconnect", (reason) => {
  console.log("❌ Disconnected from server:", reason)
})

socket.on("connect_error", (error) => {
  console.error("❌ Connection error:", error)
})

export { socket }
export default socket
