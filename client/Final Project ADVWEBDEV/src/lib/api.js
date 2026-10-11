import axios from 'axios'

export const api = axios.create({ baseURL: '/api', withCredentials: true, timeout: 15000 })

export function errorMessage(error) {
  return error.response?.data?.message || (error.code === 'ECONNABORTED'
    ? 'The request timed out. Please try again.'
    : 'Unable to connect. Please try again.')
}
