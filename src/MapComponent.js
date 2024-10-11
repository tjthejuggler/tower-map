import React, { useState, useEffect, lazy, Suspense } from 'react';

const MapComponentInner = lazy(() => import('./MapComponentInner'));

const MapComponent = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div>
      {isMounted && (
        <Suspense fallback={<div>Loading map...</div>}>
          <MapComponentInner />
        </Suspense>
      )}
    </div>
  );
};

export default MapComponent;