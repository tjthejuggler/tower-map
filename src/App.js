import React, { Suspense, lazy } from 'react';

const MapComponent = lazy(() => import('./MapComponent'));

function App() {
  return (
    <div className="App">
      <h1>Tower Visibility Calculator</h1>
      <Suspense fallback={<div>Loading map...</div>}>
        <MapComponent />
      </Suspense>
    </div>
  );
}

export default App;