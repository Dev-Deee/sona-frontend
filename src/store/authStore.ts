import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { localJSON } from './storage'
import type { User } from '../types/api'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  setSession: (session: { accessToken: string; refreshToken: string; user: User }) => void
  setUser: (user: User) => void
  clear: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: ({ accessToken, refreshToken, user }) => set({ accessToken, refreshToken, user }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'sona_auth', storage: localJSON },
  ),
)

export const isLoggedIn = () => useAuth.getState().accessToken !== null
