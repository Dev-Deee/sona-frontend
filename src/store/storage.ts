import { createJSONStorage, type StateStorage } from 'zustand/middleware'

/** localStorage that degrades to an in-memory map (private mode, blocked storage). */
function safe(getStorage: () => Storage): StateStorage {
  const memory = new Map<string, string>()
  return {
    getItem: (name) => {
      try {
        return getStorage().getItem(name)
      } catch {
        return memory.get(name) ?? null
      }
    },
    setItem: (name, value) => {
      try {
        getStorage().setItem(name, value)
      } catch {
        memory.set(name, value)
      }
    },
    removeItem: (name) => {
      try {
        getStorage().removeItem(name)
      } catch {
        memory.delete(name)
      }
    },
  }
}

export const localJSON = createJSONStorage(() => safe(() => localStorage))
export const sessionJSON = createJSONStorage(() => safe(() => sessionStorage))

export function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeLocal(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage unavailable — setting just won't persist */
  }
}
