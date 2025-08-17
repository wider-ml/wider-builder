import { atom, computed } from 'nanostores';
import { getCookie } from 'cookies-next';
import { getUser } from '~/lib/auth/api';

export interface User {
  id?: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;

  // Add other user properties as needed based on your API response
}

export interface UserState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

// Initialize user state
const initialState: UserState = {
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
};

// Create the main user store
export const userStore = atom<UserState>(initialState);

// Computed values for easy access
export const currentUser = computed(userStore, (state) => state.user);
export const isUserLoading = computed(userStore, (state) => state.isLoading);
export const userError = computed(userStore, (state) => state.error);
export const isAuthenticated = computed(userStore, (state) => state.isAuthenticated);

// Helper function to check if tokens exist
const hasValidTokens = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const accessToken = getCookie('wider_access_token');
  const refreshToken = getCookie('wider_refresh_token');

  return !!(accessToken && refreshToken);
};

// Action to fetch user data
export const fetchUserData = async (): Promise<void> => {
  // Check if tokens are available
  if (!hasValidTokens()) {
    userStore.set({
      ...userStore.get(),
      isAuthenticated: false,
      error: 'No authentication tokens found',
    });
    return;
  }

  // Set loading state
  userStore.set({
    ...userStore.get(),
    isLoading: true,
    error: null,
  });

  try {
    const response = await getUser();

    // Assuming the API returns user data in response.data or directly in response
    const userData = response.data || response;

    userStore.set({
      user: userData,
      isLoading: false,
      error: null,
      isAuthenticated: true,
    });
  } catch (error: any) {
    console.error('Failed to fetch user data:', error);

    userStore.set({
      user: null,
      isLoading: false,
      error: error.message || 'Failed to fetch user data',
      isAuthenticated: false,
    });
  }
};

// Action to clear user data (for logout)
export const clearUserData = (): void => {
  userStore.set(initialState);
};

// Action to update user data locally
export const updateUserData = (updates: Partial<User>): void => {
  const currentState = userStore.get();

  if (currentState.user) {
    userStore.set({
      ...currentState,
      user: {
        ...currentState.user,
        ...updates,
      },
    });
  }
};

// Action to initialize user data (call this when tokens are available)
export const initializeUser = async (): Promise<void> => {
  if (hasValidTokens()) {
    await fetchUserData();
  }
};

// Action to refresh user data
export const refreshUserData = async (): Promise<void> => {
  await fetchUserData();
};

// Helper to get user data synchronously (returns null if not loaded)
export const getUserData = (): User | null => {
  return userStore.get().user;
};

// Helper to check authentication status
export const checkAuthStatus = (): boolean => {
  return hasValidTokens() && userStore.get().isAuthenticated;
};
