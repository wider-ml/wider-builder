import { useStore } from '@nanostores/react';
import { useEffect } from 'react';
import {
  currentUser,

  //   userStore,
  isUserLoading,
  userError,
  isAuthenticated,
  fetchUserData,
  clearUserData,
  updateUserData,
  initializeUser,
  refreshUserData,

  //   getUserData,
  checkAuthStatus,
  type User,
} from '~/lib/stores/user';

export interface UseUserReturn {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  fetchUser: () => Promise<void>;
  clearUser: () => void;
  updateUser: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  initUser: () => Promise<void>;
}

/**
 * Custom hook for managing user state throughout the application
 *
 * @param autoFetch - Whether to automatically fetch user data when tokens are available (default: true)
 * @returns Object containing user data and management functions
 */
export const useUser = (autoFetch: boolean = true): UseUserReturn => {
  // Subscribe to store values

  //   const userState = useStore(userStore);
  const user = useStore(currentUser);
  const isLoading = useStore(isUserLoading);
  const error = useStore(userError);
  const authenticated = useStore(isAuthenticated);

  // Auto-fetch user data when component mounts and tokens are available
  useEffect(() => {
    if (autoFetch && !user && !isLoading && checkAuthStatus()) {
      initializeUser();
    }
  }, [autoFetch, user, isLoading]);

  return {
    user,
    isLoading,
    error,
    isAuthenticated: authenticated,
    fetchUser: fetchUserData,
    clearUser: clearUserData,
    updateUser: updateUserData,
    refreshUser: refreshUserData,
    initUser: initializeUser,
  };
};

/**
 * Hook that only returns user data without automatic fetching
 * Useful for components that just need to display user info
 */
export const useUserData = (): User | null => {
  const user = useStore(currentUser);
  return user;
};

/**
 * Hook that only returns authentication status
 */
export const useAuthStatus = (): boolean => {
  const authenticated = useStore(isAuthenticated);
  return authenticated;
};

/**
 * Hook for user loading state
 */
export const useUserLoading = (): boolean => {
  const isLoading = useStore(isUserLoading);
  return isLoading;
};
