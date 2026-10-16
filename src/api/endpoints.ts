import { request } from './client'
import type {
  AuthResponse,
  Json,
  Page,
  Preset,
  ShareCreated,
  SharePayload,
  Show,
  Team,
  TeamMember,
  TeamRole,
  User,
  UserRole,
  Venue,
} from '../types/api'

export const authApi = {
  register: (body: { email: string; password: string; role?: UserRole }) =>
    request<AuthResponse>({ method: 'POST', url: '/api/auth/register', data: body }),
  login: (body: { email: string; password: string }) =>
    request<AuthResponse>({ method: 'POST', url: '/api/auth/login', data: body }),
  refresh: (refreshToken: string) =>
    request<AuthResponse>({ method: 'POST', url: '/api/auth/refresh', data: { refreshToken } }),
  logout: () => request<null>({ method: 'POST', url: '/api/auth/logout' }),
}

export const usersApi = {
  me: () => request<User>({ method: 'GET', url: '/api/users/me' }),
  update: (body: { role?: UserRole; preferences?: Json }) =>
    request<User>({ method: 'PATCH', url: '/api/users/me', data: body }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<null>({ method: 'PATCH', url: '/api/users/me/password', data: body }),
  remove: () => request<null>({ method: 'DELETE', url: '/api/users/me' }),
}

export interface VenueInput {
  name?: string
  teamUuid?: string
  dimensions?: Json
  surfaces?: Json
  notes?: string
}

export const venuesApi = {
  list: (params: { name?: string; page?: number; size?: number } = {}) =>
    request<Page<Venue>>({ method: 'GET', url: '/api/venues', params }),
  create: (body: VenueInput & { name: string }) =>
    request<Venue>({ method: 'POST', url: '/api/venues', data: body }),
  get: (uuid: string) => request<Venue>({ method: 'GET', url: `/api/venues/${uuid}` }),
  update: (uuid: string, body: VenueInput) =>
    request<Venue>({ method: 'PATCH', url: `/api/venues/${uuid}`, data: body }),
  remove: (uuid: string) => request<null>({ method: 'DELETE', url: `/api/venues/${uuid}` }),
}

export interface ShowInput {
  name?: string
  showDate?: string
  calculatorStates?: Json
  inputList?: Json[]
  notes?: string
}

export const showsApi = {
  listForVenue: (venueUuid: string, params: { page?: number; size?: number } = {}) =>
    request<Page<Show>>({ method: 'GET', url: `/api/venues/${venueUuid}/shows`, params }),
  create: (venueUuid: string, body: ShowInput & { name: string }) =>
    request<Show>({ method: 'POST', url: `/api/venues/${venueUuid}/shows`, data: body }),
  get: (uuid: string) => request<Show>({ method: 'GET', url: `/api/shows/${uuid}` }),
  update: (uuid: string, body: ShowInput) =>
    request<Show>({ method: 'PATCH', url: `/api/shows/${uuid}`, data: body }),
  remove: (uuid: string) => request<null>({ method: 'DELETE', url: `/api/shows/${uuid}` }),
}

export const presetsApi = {
  list: (tab?: string) =>
    request<Preset[]>({ method: 'GET', url: '/api/presets', params: tab ? { tab } : {} }),
  create: (body: {
    name: string
    calculatorTab: string
    inputs: Json
    teamUuid?: string
    isPublic?: boolean
  }) => request<Preset>({ method: 'POST', url: '/api/presets', data: body }),
  get: (uuid: string) => request<Preset>({ method: 'GET', url: `/api/presets/${uuid}` }),
  update: (uuid: string, body: { name?: string; inputs?: Json; isPublic?: boolean }) =>
    request<Preset>({ method: 'PATCH', url: `/api/presets/${uuid}`, data: body }),
  remove: (uuid: string) => request<null>({ method: 'DELETE', url: `/api/presets/${uuid}` }),
}

export const shareApi = {
  create: (body: { calculatorTab: string; inputs: Json; outputs: Json; singleUse?: boolean }) =>
    request<ShareCreated>({ method: 'POST', url: '/api/share', data: body }),
  get: (token: string) =>
    request<SharePayload>({ method: 'GET', url: `/api/share/${encodeURIComponent(token)}` }),
}

export const teamsApi = {
  list: () => request<Team[]>({ method: 'GET', url: '/api/teams' }),
  create: (name: string) => request<Team>({ method: 'POST', url: '/api/teams', data: { name } }),
  get: (uuid: string) => request<Team>({ method: 'GET', url: `/api/teams/${uuid}` }),
  addMember: (uuid: string, body: { email: string; role: Exclude<TeamRole, 'OWNER'> }) =>
    request<TeamMember>({ method: 'POST', url: `/api/teams/${uuid}/members`, data: body }),
  updateMember: (uuid: string, userUuid: string, role: Exclude<TeamRole, 'OWNER'>) =>
    request<TeamMember>({
      method: 'PATCH',
      url: `/api/teams/${uuid}/members/${userUuid}`,
      data: { role },
    }),
  removeMember: (uuid: string, userUuid: string) =>
    request<null>({ method: 'DELETE', url: `/api/teams/${uuid}/members/${userUuid}` }),
  remove: (uuid: string) => request<null>({ method: 'DELETE', url: `/api/teams/${uuid}` }),
}
