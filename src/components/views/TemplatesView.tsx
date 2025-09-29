import React, { useState } from 'react';
import { MetaConnectionCard } from '@/components/meta/MetaConnectionCard';
import { TemplatesList } from '@/components/meta/TemplatesList';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { Skeleton } from '@/components/ui/skeleton';

export const TemplatesView = () => {
  const { connection, loading, refetch, isConnected } = useMetaConnection();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleConnectionUpdate = () => {
    refetch();
    setRefreshKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MetaConnectionCard 
        connection={connection} 
        onConnectionUpdate={handleConnectionUpdate}
      />
      
      {isConnected && (
        <TemplatesList 
          key={refreshKey}
          connection={connection!} 
        />
      )}
    </div>
  );
};
