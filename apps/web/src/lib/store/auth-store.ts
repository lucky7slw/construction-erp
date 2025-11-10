import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { apiClient, type User, type LoginRequest, type RegisterRequest } from '@/lib/api/client';

interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  _hasHydrated: boolean;

  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  setUser: (user: User) => void;
  setHasHydrated: (hydrated: boolean) => void;
}

const STORAGE_KEY = 'hhhomespm-auth';

// Initialize API client tokens from localStorage on module load
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem(STORAGE_KEY);
  console.log('[Auth Store] Raw localStorage value:', stored);
  if (stored) {
    try {
      const data = JSON.parse(stored);
      console.log('[Auth Store] Parsed JSON:', JSON.stringify(data, null, 2));

      // Zustand persist stores it in { state: { ... } } structure
      const state = data.state || data;
      console.log('[Auth Store] Extracted state:', JSON.stringify(state, null, 2));

      if (state.accessToken && state.refreshToken) {
        console.log('[Auth Store] Setting tokens in API client...');
        apiClient.setAccessToken(state.accessToken);
        apiClient.setRefreshToken(state.refreshToken);
        console.log('[Auth Store] ✓ Tokens successfully set in API client');
      } else {
        console.warn('[Auth Store] ✗ Tokens not found in state. Debug info:', {
          hasAccessToken: !!state.accessToken,
          hasRefreshToken: !!state.refreshToken,
          accessTokenValue: state.accessToken ? `${state.accessToken.substring(0, 20)}...` : 'null/undefined',
          refreshTokenValue: state.refreshToken ? `${state.refreshToken.substring(0, 20)}...` : 'null/undefined',
          allStateKeys: Object.keys(state)
        });
      }
    } catch (e) {
      console.error('[Auth Store] Failed to parse auth storage:', e);
    }
  } else {
    console.warn('[Auth Store] No auth data found in localStorage');
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      _hasHydrated: false, // Always start false to avoid SSR hydration mismatch

      // Actions
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await apiClient.login(credentials);
          const { user, tokens } = response;

          // Update API client with tokens (already done in apiClient.login)
          // apiClient.setAccessToken and setRefreshToken called in login method

          set({
            user,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
          });
          throw error;
        }
      },

      register: async (data: RegisterRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await apiClient.register(data);
          const { user, tokens } = response;

          // Backend now returns tokens on registration, so log user in
          set({
            user,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Registration failed',
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });

        try {
          // Call logout endpoint if user is authenticated
          if (get().isAuthenticated) {
            await apiClient.logout();
          }
        } catch (error) {
          // Continue with logout even if API call fails
          console.warn('Logout API call failed:', error);
        } finally {
          // Clear API client token
          apiClient.setAccessToken(null);

          // Clear auth state
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      refreshAuth: async () => {
        const { accessToken, refreshToken } = get();

        if (!accessToken || !refreshToken) {
          return;
        }

        set({ isLoading: true });

        try {
          // Set tokens in API client
          apiClient.setAccessToken(accessToken);
          apiClient.setRefreshToken(refreshToken);

          // Try to get current user profile to validate token
          const response = await apiClient.getProfile();

          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          // Token validation failed, clear auth state
          await get().logout();
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setUser: (user: User) => {
        set({ user });
      },

      setHasHydrated: (hydrated: boolean) => {
        set({ _hasHydrated: hydrated });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these fields
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => {
        console.log('[Auth Store] onRehydrateStorage: outer function called (store created)');
        // This runs before rehydration - return callback that runs after
        return (state, error) => {
          console.log('[Auth Store] onRehydrateStorage: inner callback called (rehydration complete)');
          console.log('[Auth Store] State after rehydration:', { state, error });
          // Tokens are already set at module load time in the code above
          // Just mark as hydrated when rehydration completes
          useAuthStore.setState({ _hasHydrated: true });
          console.log('[Auth Store] ✓ _hasHydrated set to true');
        };
      },
    }
  )
);

// Selectors for easier access to specific state
export const useAuth = () => {
  const store = useAuthStore();
  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
  };
};

export const useAuthActions = () => {
  const store = useAuthStore();
  return {
    login: store.login,
    register: store.register,
    logout: store.logout,
    refreshAuth: store.refreshAuth,
    clearError: store.clearError,
    setLoading: store.setLoading,
  };
};