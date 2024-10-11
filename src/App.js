import React from 'react';
   import { MapContainer, TileLayer } from 'react-leaflet';
   import 'leaflet/dist/leaflet.css';

   function App() {
     return (
       <div className="App">
         <h1>Tower Visibility Calculator</h1>
         <MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: '400px', width: '100%' }}>
           <TileLayer
             url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
             attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
           />
         </MapContainer>
       </div>
     );
   }

   export default App;