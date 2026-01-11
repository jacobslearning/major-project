import { useEffect } from "react";
import { useMap } from "react-leaflet";

const MapController = ({ selectedIncident }) => {
  const map = useMap();

  useEffect(() => {
    if (
      selectedIncident &&
      selectedIncident.latitude &&
      selectedIncident.longitude
    ) {
      map.flyTo([selectedIncident.latitude, selectedIncident.longitude], 6, {
        duration: 1.2,
      });
    }
  }, [selectedIncident, map]);

  return null;
};

export default MapController;
