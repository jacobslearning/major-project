import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/leaflet.markercluster.js";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import MapController from "./MapController";
import MapFilters from "./MapFilters";
import { ClusteredMarkers } from "./ClusteredMarkers";

const Map = ({
  incidents = [],
  selectedIncident,
  selectedTypes,
  setSelectedTypes,
  allTypes,
}) => {
  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapController selectedIncident={selectedIncident} />
      <MapFilters
        selectedTypes={selectedTypes}
        setSelectedTypes={setSelectedTypes}
        allTypes={allTypes}
      />
      <ClusteredMarkers incidents={incidents} />
    </MapContainer>
  );
};

export default Map;
