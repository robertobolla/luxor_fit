import React from 'react';

// Hook para manejar el estado de refresh
export const useRefresh = (onRefresh: () => Promise<void>) => {
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return {
    refreshing,
    onRefresh: handleRefresh,
  };
};
