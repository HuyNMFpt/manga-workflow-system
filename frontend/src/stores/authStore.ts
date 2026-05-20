// Updated authStore.ts - Ensure localStorage sync
// File: frontend/src/stores/authStore.ts

import { create } from 'zustand'

interface User {
  id: number
  name: string
  email: string
  role: string
  avatar_url?: string | null
}

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  
  setAuth: (user: User, token: string, refreshToken?: string) => void
  logout: () => void
  initFromStorage: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,

  setAuth: (user, token, refreshToken) => {
    // Save to localStorage
    localStorage.setItem('token', token)
    localStorage.setItem('userRole', user.role)
    localStorage.setItem('userName', user.name)
    localStorage.setItem('userEmail', user.email)
    localStorage.setItem('user', JSON.stringify(user))
    
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken)
    }

    // Update Zustand state
    set({
      user,
      token,
      refreshToken: refreshToken || token,
      isAuthenticated: true
    })

    console.log('✅ Auth state saved to localStorage and Zustand')
  },

  logout: () => {
    // Clear localStorage
    localStorage.clear()
    
    // Clear Zustand state
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false
    })

    console.log('✅ Auth state cleared')
  },

  // Initialize from localStorage on app load
  initFromStorage: () => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    const refreshToken = localStorage.getItem('refreshToken')

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        set({
          user,
          token,
          refreshToken: refreshToken || token,
          isAuthenticated: true
        })
        console.log('✅ Auth state restored from localStorage')
      } catch (error) {
        console.error('❌ Failed to parse user from localStorage:', error)
        localStorage.clear()
      }
    }
  }
}))
