import { useUser } from '~/lib/hooks/useUser';

interface UserProfileProps {
  showFullProfile?: boolean;
}

/**
 * Example component demonstrating how to use the user system
 * This can be used anywhere in the application to display user information
 */
export const UserProfile: React.FC<UserProfileProps> = ({ showFullProfile = false }) => {
  const { user, isLoading, error, isAuthenticated, refreshUser } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
        <span>Loading user...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-sm">
        <span>Error: {error}</span>
        <button onClick={refreshUser} className="ml-2 text-blue-500 hover:text-blue-700 underline">
          Retry
        </button>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <div className="text-gray-500 text-sm">Not authenticated</div>;
  }

  if (showFullProfile) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          {user.avatar && <img src={user.avatar} alt={user.username || 'User'} className="w-12 h-12 rounded-full" />}
          <div>
            <h3 className="font-semibold text-lg">
              {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username || 'Unknown User'}
            </h3>
            {user.email && <p className="text-gray-600 text-sm">{user.email}</p>}
            {user.bio && <p className="text-gray-700 text-sm mt-1">{user.bio}</p>}
            {user.isVerified && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                ✓ Verified
              </span>
            )}
          </div>
        </div>
        <button
          onClick={refreshUser}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          Refresh Profile
        </button>
      </div>
    );
  }

  // Compact profile view
  return (
    <div className="flex items-center space-x-2">
      {user.avatar && <img src={user.avatar} alt={user.username || 'User'} className="w-8 h-8 rounded-full" />}
      <span className="text-sm font-medium">
        {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username || 'User'}
      </span>
      {user.isVerified && <span className="text-green-500 text-xs">✓</span>}
    </div>
  );
};

export default UserProfile;
