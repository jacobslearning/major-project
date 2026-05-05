import { useMap } from "react-leaflet";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";

const MapFilters = ({ selectedTypes, setSelectedTypes, allTypes }) => {
  const map = useMap();
  const containerRef = useRef(null);
  const controlRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    const div = L.DomUtil.create("div", "map-filter-control leaflet-bar");
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    const control = L.control({ position: "topright" });
    control.onAdd = () => div;
    control.addTo(map);

    containerRef.current = div;
    controlRef.current = control;

    return () => {
      control.remove();
      containerRef.current = null;
      controlRef.current = null;
    };
  }, [map]);

  if (!containerRef.current) return null;

  return createPortal(
    <FilterPanel
      allTypes={allTypes}
      selectedTypes={selectedTypes}
      setSelectedTypes={setSelectedTypes}
    />,
    containerRef.current,
  );
};

const FilterPanel = ({ allTypes, selectedTypes, setSelectedTypes }) => {
  const toggle = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const allSelected = selectedTypes.length === 0;

  return (
    <div
      style={{
        background: "#1a1a1a",
        padding: "8px",
        borderRadius: "4px",
        color: "#fff",
        maxHeight: "300px",
        overflowY: "auto",
        width: "200px",
        fontSize: "0.85rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <b>Filter by Type</b>
        {!allSelected && (
          <button
            onClick={() => setSelectedTypes([])}
            style={{
              background: "none",
              border: "none",
              color: "#00afff",
              cursor: "pointer",
              fontSize: "0.75rem",
              padding: 0,
            }}
          >
            Clear
          </button>
        )}
      </div>

      {allTypes.length === 0 && (
        <div style={{ color: "#888", fontStyle: "italic" }}>Loading…</div>
      )}

      {allTypes.map((type) => {
        const checked = selectedTypes.includes(type);
        return (
          <label
            key={type}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              padding: "2px 0",
              color: checked ? "#fff" : "#aaa",
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(type)}
              style={{ cursor: "pointer" }}
            />
            {type}
          </label>
        );
      })}
    </div>
  );
};

export default MapFilters;
