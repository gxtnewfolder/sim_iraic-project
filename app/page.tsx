'use client';

import { useEffect, useState } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

// Add type imports
type Libraries = ("places")[];
const libraries: Libraries = ["places"];

interface Detection {
  _id: string;
  timestamp: string;
  image: string;
  location: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  confidence: number;
}

interface Message {
  _id: string;
  topic: string;
  message: string;
  timestamp: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '400px'
};

const center = {
  lat: 13.7563, // Default center (Bangkok)
  lng: 100.5018
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  scaleControl: true,
  streetViewControl: true,
  rotateControl: true,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'on' }]
    }
  ]
};

export default function Dashboard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDetection, setSelectedDetection] = useState<Detection | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [showInfoWindow, setShowInfoWindow] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch MQTT messages
      const messagesResponse = await fetch('/api/getMessages');
      if (!messagesResponse.ok) {
        throw new Error('Failed to fetch messages');
      }
      const messagesData = await messagesResponse.json();
      setMessages(messagesData);

      // Fetch vendor detections
      const detectionsResponse = await fetch('/api/getDetections');
      if (!detectionsResponse.ok) {
        throw new Error('Failed to fetch detections');
      }
      const detectionsData = await detectionsResponse.json();
      console.log('Detections data:', detectionsData);
      setDetections(detectionsData);

      setError(null);
    } catch (err) {
      setError('Failed to load data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-500">{error}</div>
      </div>
    );
  }

  // Filter detections that have valid coordinates
  const detectionsWithCoordinates = detections.filter(
    (detection) => detection.coordinates?.latitude != null && detection.coordinates?.longitude != null
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Street Vendor Detection Dashboard</h1>
      
      {/* Google Map */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Detection Locations</h2>
        <div className="rounded-lg overflow-hidden shadow-lg">
          <LoadScript 
            googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
            onLoad={() => setMapLoaded(true)}
            onError={(error) => {
              console.error('Error loading Google Maps:', error);
              setError('Failed to load Google Maps');
            }}
            libraries={libraries}
          >
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              zoom={13}
              center={center}
              options={mapOptions}
              onLoad={(map) => {
                setMapInstance(map);
                console.log('Map loaded successfully');
              }}
              onUnmount={() => {
                setMapInstance(null);
                console.log('Map unmounted');
              }}
            >
              {detectionsWithCoordinates.map((detection) => (
                <Marker
                  key={detection._id}
                  position={{
                    lat: detection.coordinates!.latitude,
                    lng: detection.coordinates!.longitude
                  }}
                  onClick={() => {
                    setSelectedDetection(detection);
                    setShowInfoWindow(true);
                    if (mapInstance) {
                      mapInstance.panTo({
                        lat: detection.coordinates!.latitude,
                        lng: detection.coordinates!.longitude
                      });
                      mapInstance.setZoom(16);
                    }
                  }}
                  title={`Location: ${detection.location}\nConfidence: ${(detection.confidence * 100).toFixed(1)}%`}
                />
              ))}
              
              {selectedDetection && showInfoWindow && (
                <InfoWindow
                  position={{
                    lat: selectedDetection.coordinates!.latitude,
                    lng: selectedDetection.coordinates!.longitude
                  }}
                  onCloseClick={() => {
                    setShowInfoWindow(false);
                    setSelectedDetection(null);
                  }}
                >
                  <div className="max-w-sm">
                    <img
                      src={`data:image/jpeg;base64,${selectedDetection.image}`}
                      alt={`Detection at ${selectedDetection.location}`}
                      className="w-full h-40 object-cover rounded mb-3"
                    />
                    <h3 className="font-semibold mb-2">Location: {selectedDetection.location}</h3>
                    <p className="text-sm text-gray-600 mb-1">
                      Coordinates: {selectedDetection.coordinates!.latitude.toFixed(6)}, {selectedDetection.coordinates!.longitude.toFixed(6)}
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      Confidence: {(selectedDetection.confidence * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">
                      Time: {new Date(selectedDetection.timestamp).toLocaleString()}
                    </p>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </LoadScript>
        </div>
        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* Vendor Detections */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Recent Detections</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {detections.map((detection) => (
            <div
              key={detection._id}
              className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedDetection(detection);
                setShowInfoWindow(true);
                if (mapInstance && detection.coordinates) {
                  mapInstance.panTo({
                    lat: detection.coordinates.latitude,
                    lng: detection.coordinates.longitude
                  });
                  mapInstance.setZoom(16);
                  // Scroll the page up to the map
                  document.querySelector('.mb-12')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              <img
                src={`data:image/jpeg;base64,${detection.image}`}
                alt={`Detection at ${detection.location}`}
                className="w-full h-48 object-cover rounded mb-4"
              />
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">Location: {detection.location}</h3>
                  {detection.coordinates && (
                    <p className="text-sm text-gray-600">
                      Coordinates: {detection.coordinates.latitude.toFixed(6)}, {detection.coordinates.longitude.toFixed(6)}
                    </p>
                  )}
                  <p className="text-sm text-gray-600">Confidence: {(detection.confidence * 100).toFixed(1)}%</p>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(detection.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MQTT Messages */}
      {/* <div>
        <h2 className="text-2xl font-semibold mb-4">System Messages</h2>
        <div className="grid gap-4">
          {messages.map((message) => (
            <div
              key={message._id}
              className="bg-white p-4 rounded-lg shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">Topic: {message.topic}</h3>
                  <p className="mt-2">{message.message}</p>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(message.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div> */}

      {/* <button
        onClick={fetchData}
        className="mt-8 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        Refresh Data
      </button> */}
    </div>
  );
}
