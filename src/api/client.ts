import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { useAuth } from '../store/authStore'
import type { ApiEnvelope, ApiErrorBody, AuthResponse } from '../types/api'

/**
 * Empty in development (Vite proxies /api to localhost:8080) and in the Docker image (nginx
 * proxies /api); set to https://api.trysona.io for production builds.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuth.getState().accessToken
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshInFlight: Promise<string | null> | null = null

/** Single-flight refresh: concurrent 401s share one /refresh call. */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    const refreshToken = useAuth.getState().refreshToken
    refreshInFlight = (async () => {
      if (!refreshToken) return null
      try {
        const { data } = await axios.post<ApiEnvelope<AuthResponse>>(
          `${API_BASE_URL}/api/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } },
        )
        useAuth.getState().setSession(data.data)
        return data.data.accessToken
      } catch {
        useAuth.getState().clear()
        return null
      }
    })().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const config = error.config as RetriableConfig | undefined
    const isAuthCall = config?.url?.includes('/api/auth/')
    if (error.response?.status === 401 && config && !config._retried && !isAuthCall) {
      config._retried = true
      const token = await refreshAccessToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
        return api(config)
      }
    }
    return Promise.reject(error)
  },
)

/** Unwraps the `{ success, data }` envelope. */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await api.request<ApiEnvelope<T>>(config)
  return response.data.data
}

/** Human-readable message for any API failure. */
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    if (!error.response)
      return navigator.onLine ? 'Could not reach the Sona server' : 'You are offline'
    return error.response.data?.message ?? `Request failed (${error.response.status})`
  }
  return error instanceof Error ? error.message : 'Something went wrong'
}
