import type { UserRole } from '../types/api'

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'TOURING', label: 'Touring engineer' },
  { value: 'INSTALLED', label: 'Installed / systems' },
  { value: 'HOUSE_OF_WORSHIP', label: 'House of worship' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'OTHER', label: 'Other' },
]
