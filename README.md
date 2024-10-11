# Tower Visibility App

The Tower Visibility App is a web application that calculates and visualizes the visibility area of a tower based on topographical data. It allows users to place a tower on a map, set its height, and see the areas that would be visible from that tower.

## Features

- Interactive map interface using Leaflet
- Tower placement by clicking on the map
- Adjustable tower height and viewer height
- Calculation of visibility based on topographical data
- Visualization of visible areas on the map
- Persistence of last selected tower location

## Technologies Used

- React
- Leaflet for map rendering
- GeoTIFF for handling geospatial data
- OpenTopography API for fetching elevation data

## Getting Started

### Prerequisites

- Node.js (version 12 or higher)
- npm (usually comes with Node.js)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/tower-visibility-app.git
   cd tower-visibility-app
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory and add your OpenTopography API key:
   ```
   REACT_APP_OPENTOPOGRAPHY_API_KEY=your_api_key_here
   ```

### Running the App Locally

1. Start the development server:
   ```
   npm start
   ```

2. Open your browser and navigate to `http://localhost:3000`

## Usage

1. The map will load with the last saved tower location (or a default location if it's your first time).
2. Click on the map to place the tower at a new location.
3. Adjust the tower height and viewer height using the input fields.
4. Click the "Calculate Visibility" button to see the areas visible from the tower.
5. The blue shaded areas on the map represent the visible regions from the tower.

## Deployed Version

You can test the live version of the app at:

[https://tower-awqz8rwhp-tjthejugglers-projects.vercel.app/](https://tower-awqz8rwhp-tjthejugglers-projects.vercel.app/)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).
