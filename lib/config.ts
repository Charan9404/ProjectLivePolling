// Configuration for backend URL
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5005'

// Helper function to get API endpoint
export const getApiUrl = (endpoint: string) => {
  return `${BACKEND_URL}${endpoint}`
}
