import { useEffect } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

const incidentTypes = ["Earthquake", "Wildfire", "Flood", "Terrorist Attack"];

const MapFilters = ({ selectedTypes, setSelectedTypes }) => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    // have to do it within the DOMUtil bit of leaflet to have it on the map itself

    const container = L.DomUtil.create("div", "map-filter-control leaflet-bar");

    container.style.background = "#1a1a1a";
    container.style.padding = "8px";
    container.style.borderRadius = "4px";
    container.style.color = "#fff";

    container.innerHTML = "<b>Filter by Type</b><br/>";

    incidentTypes.forEach((type) => {
      const id = `filter-${type.replace(/\s/g, "")}`;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = id;
      checkbox.checked = selectedTypes.includes(type);

      checkbox.onchange = () => {
        if (checkbox.checked) {
          setSelectedTypes([...selectedTypes, type]);
        } else {
          setSelectedTypes(selectedTypes.filter((t) => t !== type));
        }
      };

      const label = document.createElement("label");
      label.htmlFor = id;
      label.style.marginRight = "8px";
      label.style.display = "block";
      label.style.cursor = "pointer";
      label.innerText = type;

      label.prepend(checkbox);
      container.appendChild(label);
    });

    const filterControl = L.control({ position: "topright" });
    filterControl.onAdd = () => container;
    filterControl.addTo(map);

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    return () => {
      filterControl.remove();
    };
  }, [map, selectedTypes, setSelectedTypes]);

  return null;
};

export default MapFilters;
