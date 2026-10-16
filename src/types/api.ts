export type UserRole = 'TOURING' | 'INSTALLED' | 'HOUSE_OF_WORSHIP' | 'STUDENT' | 'OTHER'
export type TeamRole = 'OWNER' | 'EDITOR' | 'VIEWER'
export type Json = Record<string, unknown>

export interface ApiEnvelope<T> {
  success: true
  data: T
  message: string
  timestamp: string
}

export interface ApiErrorBody {
  success: false
  error: string
  message: string
  details?: { field: string; message: string }[]
  timestamp: string
}

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface User {
  uuid: string
  email: string
  role: UserRole
  preferences: Json
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  tokenType: 'Bearer'
  expiresIn: number
  user: User
}

export interface Venue {
  uuid: string
  name: string
  ownerUuid: string
  teamUuid: string | null
  dimensions: Json | null
  surfaces: Json | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface Show {
  uuid: string
  name: string
  showDate: string | null
  venueUuid: string
  ownerUuid: string
  calculatorStates: Json
  inputList: Json[]
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface Preset {
  uuid: string
  name: string
  calculatorTab: string
  inputs: Json
  ownerUuid: string
  teamUuid: string | null
  isPublic: boolean
  createdAt: string
}

export interface ShareCreated {
  token: string
  expiresAt: string
  singleUse: boolean
}

export interface SharePayload {
  calculatorTab: string
  inputs: Json
  outputs: Json
  expiresAt: string
}

export interface TeamMember {
  userUuid: string
  email: string
  role: TeamRole
  joinedAt: string
}

export interface Team {
  uuid: string
  name: string
  ownerUuid: string | null
  myRole: TeamRole | null
  createdAt: string
  members: TeamMember[]
}
