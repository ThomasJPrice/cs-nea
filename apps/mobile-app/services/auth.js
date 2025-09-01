import axios from 'axios'

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL
})

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const handleApiRequest = async (endpoint, method="GET", data=null) => {
  try {
    const response = await api.request({
      url: endpoint,
      method,
      data
    })
    return response.data
  } catch (error) {
    console.error("Error handling API request:", error)
    return null
  }
}