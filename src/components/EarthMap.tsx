import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Compass,
  Navigation,
  Train,
  Ship,
  Footprints,
  MapPin,
  Clock,
  Users,
  Send,
  X,
  Sparkles,
  ArrowRight,
  Globe,
} from 'lucide-react';
import { Character, Location, WorldState, getLocalTime } from '../types/world';

interface EarthMapProps {
  locations: Location[];
  characters: Character[];
  worldState: WorldState;
  selectedLocationId: string | null;
  onSelectLocation: (locationId: string | null) => void;
  onInspectCharacter: (char: Character) => void;
  onTravelCharacter?: (characterId: string, destinationLocationId: string) => void;
}

type TileProvider = 'osm_standard' | 'carto_dark' | 'carto_voyager';

const TILE_LAYERS: Record<TileProvider, { name: string; url: string; attribution: string; maxZoom: number }> = {
  osm_standard: {
    name: 'OpenStreetMap Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  carto_dark: {
    name: 'Carto Dark Matter',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  },
  carto_voyager: {
    name: 'Carto Voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  },
};

export const EarthMap: React.FC<EarthMapProps> = ({
  locations,
  characters,
  worldState,
  selectedLocationId,
  onSelectLocation,
  onInspectCharacter,
  onTravelCharacter,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(3);
  const [tileProvider, setTileProvider] = useState<TileProvider>('carto_dark');
  const [showRoutes, setShowRoutes] = useState(true);
  const [travelModalChar, setTravelModalChar] = useState<Character | null>(null);
  const [selectedDestId, setSelectedDestId] = useState<string>('');

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [25, 10],
        zoom: 3,
        minZoom: 2,
        maxZoom: 19,
        zoomControl: false, // Custom styled zoom controls
        attributionControl: true,
      });

      const config = TILE_LAYERS[tileProvider];
      const tiles = L.tileLayer(config.url, {
        attribution: config.attribution,
        maxZoom: config.maxZoom,
      }).addTo(map);

      tileLayerRef.current = tiles;
      routesLayerRef.current = L.layerGroup().addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);

      map.on('zoomend', () => {
        setCurrentZoom(map.getZoom());
      });

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update tile provider
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const config = TILE_LAYERS[tileProvider];
    tileLayerRef.current.setUrl(config.url);
  }, [tileProvider]);

  // Fullscreen resize & escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isFullscreen]);

  // Fly to selected location
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedLocationId) return;
    const loc = locations.find((l) => l.id === selectedLocationId);
    if (loc) {
      mapInstanceRef.current.flyTo([loc.coordinates.lat, loc.coordinates.lng], Math.max(7, currentZoom), {
        duration: 1.2,
      });
    }
  }, [selectedLocationId]);

  // Render Routes and Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !routesLayerRef.current) return;

    routesLayerRef.current.clearLayers();
    markersLayerRef.current.clearLayers();

    // 1. Draw Physical Transit Route Corridors
    if (showRoutes) {
      const drawnPairs = new Set<string>();

      locations.forEach((origin) => {
        origin.routes.forEach((route) => {
          const dest = locations.find((l) => l.id === route.destinationId);
          if (!dest) return;

          const pairKey = [origin.id, dest.id].sort().join('--');
          if (drawnPairs.has(pairKey)) return;
          drawnPairs.add(pairKey);

          const latlngs: L.LatLngExpression[] = [
            [origin.coordinates.lat, origin.coordinates.lng],
            [dest.coordinates.lat, dest.coordinates.lng],
          ];

          const polyline = L.polyline(latlngs, {
            color: '#f59e0b',
            weight: 2,
            opacity: 0.5,
            dashArray: '5, 8',
          });

          polyline.bindTooltip(
            `<strong>Corridor:</strong> ${origin.city} ⇄ ${dest.city}<br/>` +
              `Distance: ${route.distanceKm} km (${route.transitType.replace(/_/g, ' ')})`,
            { sticky: true, className: 'evara-map-tooltip' }
          );

          routesLayerRef.current?.addLayer(polyline);
        });
      });
    }

    // 2. Draw Location Hub Landmark Markers
    locations.forEach((loc) => {
      const isSelected = selectedLocationId === loc.id;
      const local = getLocalTime(worldState.hour, worldState.minute, loc.timezoneOffset, loc.ianaTimezone);
      const stationedCount = characters.filter((c) => c.locationId === loc.id && c.status !== 'in_transit').length;

      const locIcon = L.divIcon({
        className: 'evara-hub-marker',
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 26px;
            height: 26px;
            border-radius: 50%;
            background: ${isSelected ? '#f59e0b' : '#1e293b'};
            border: 2px solid ${isSelected ? '#ffffff' : '#64748b'};
            box-shadow: 0 0 12px rgba(0,0,0,0.7);
            cursor: pointer;
            color: #ffffff;
            font-size: 12px;
          ">
            <span>📍</span>
            ${
              stationedCount > 0
                ? `<span style="
                    position: absolute;
                    top: -6px;
                    right: -6px;
                    background: #10b981;
                    color: #052e16;
                    font-size: 9px;
                    font-weight: 800;
                    border-radius: 9999px;
                    padding: 0 4px;
                    line-height: 14px;
                    border: 1px solid #ffffff;
                  ">${stationedCount}</span>`
                : ''
            }
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([loc.coordinates.lat, loc.coordinates.lng], { icon: locIcon });

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; color: #f1f5f9; min-width: 220px; padding: 2px;">
          <div style="font-size: 10px; font-family: monospace; text-transform: uppercase; color: #94a3b8;">
            ${loc.district} • ${loc.country}
          </div>
          <div style="font-weight: bold; font-size: 14px; margin-top: 2px; color: #f8fafc;">
            ${loc.name} (${loc.city})
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px; padding: 4px 6px; background: rgba(255,255,255,0.08); border-radius: 6px; font-family: monospace;">
            <span>🕒 Local Time:</span>
            <span style="font-weight: bold; color: #f59e0b;">${local.formatted} (${loc.timezoneName})</span>
          </div>
          <div style="font-size: 11px; color: #cbd5e1; margin-top: 6px; line-height: 1.4;">
            ${loc.description}
          </div>
          <div style="margin-top: 8px; font-size: 11px; color: #94a3b8; font-family: monospace;">
            🌐 <strong>Coordinates:</strong> ${loc.coordinates.lat.toFixed(4)}°, ${loc.coordinates.lng.toFixed(4)}°
          </div>
          <div style="margin-top: 3px; font-size: 11px; color: #94a3b8;">
            👥 <strong>Stationed:</strong> ${stationedCount} / ${loc.capacity} characters
          </div>
          <div style="margin-top: 10px; display: flex; gap: 6px;">
            <button id="btn-loc-focus-${loc.id}" style="width: 100%; padding: 6px 8px; font-size: 11px; font-weight: bold; background: #f59e0b; color: #000; border: none; border-radius: 6px; cursor: pointer;">
              ${isSelected ? 'Deselect Hub' : 'Focus Location Hub'}
            </button>
          </div>
        </div>
      `);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-loc-focus-${loc.id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectLocation(isSelected ? null : loc.id);
            marker.closePopup();
          };
        }
      });

      markersLayerRef.current?.addLayer(marker);
    });

    // 3. Draw Character Markers with real Earth Lat/Lng
    characters.forEach((char) => {
      const isInTransit = char.status === 'in_transit' && char.transit;
      const charLocal = getLocalTime(worldState.hour, worldState.minute, 0, char.ianaTimezone);

      const charIcon = L.divIcon({
        className: 'evara-char-marker',
        html: `
          <div style="
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
          ">
            <div style="
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background-color: ${char.avatarColor};
              border: 2px solid ${isInTransit ? '#f59e0b' : '#ffffff'};
              box-shadow: 0 2px 8px rgba(0,0,0,0.6);
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 13px;
              color: #0f172a;
              position: relative;
            ">
              ${char.name.charAt(0)}
              ${
                isInTransit
                  ? `<span style="
                      position: absolute;
                      bottom: -3px;
                      right: -3px;
                      background: #f59e0b;
                      color: #000;
                      border-radius: 50%;
                      font-size: 10px;
                      width: 14px;
                      height: 14px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      border: 1px solid #fff;
                    ">✈️</span>`
                  : char.status === 'quota_sleeping' || char.status === 'sleeping'
                  ? `<span style="
                      position: absolute;
                      bottom: -3px;
                      right: -3px;
                      background: #6366f1;
                      color: #fff;
                      border-radius: 50%;
                      font-size: 9px;
                      width: 14px;
                      height: 14px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      border: 1px solid #fff;
                    ">💤</span>`
                  : ''
              }
            </div>
            <div style="
              background: rgba(15, 23, 42, 0.92);
              color: #f8fafc;
              font-size: 10px;
              font-weight: 700;
              font-family: inherit;
              padding: 1px 5px;
              border-radius: 4px;
              margin-top: 3px;
              white-space: nowrap;
              border: 1px solid rgba(255,255,255,0.25);
              box-shadow: 0 1px 4px rgba(0,0,0,0.5);
            ">
              ${char.name.split(' ')[0]}
            </div>
          </div>
        `,
        iconSize: [36, 46],
        iconAnchor: [18, 23],
      });

      const marker = L.marker([char.latitude, char.longitude], {
        icon: charIcon,
        zIndexOffset: 100,
      });

      const popupHtml = `
        <div style="font-family: inherit; font-size: 12px; color: #f1f5f9; min-width: 230px; padding: 2px;">
          <div style="display: flex; align-items: center; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px;">
            <div style="width: 28px; height: 28px; border-radius: 50%; background: ${char.avatarColor}; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #000;">
              ${char.name.charAt(0)}
            </div>
            <div>
              <div style="font-weight: bold; font-size: 13px; color: #f8fafc;">${char.name}</div>
              <div style="font-size: 11px; color: #94a3b8;">${char.title}</div>
            </div>
          </div>

          <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 3px; font-family: monospace; font-size: 10px; color: #cbd5e1;">
            <div>📍 <strong>Location:</strong> ${char.city}, ${char.country}</div>
            <div>🌐 <strong>Coordinates:</strong> ${char.latitude.toFixed(4)}°, ${char.longitude.toFixed(4)}°</div>
            <div>🕒 <strong>Local Time:</strong> <span style="color: #f59e0b; font-weight: bold;">${charLocal.formatted}</span> (${char.ianaTimezone})</div>
            <div>⚡ <strong>Status:</strong> <span style="text-transform: capitalize;">${char.status.replace(/_/g, ' ')}</span></div>
          </div>

          <div style="margin-top: 8px; padding: 6px; background: rgba(255,255,255,0.06); border-radius: 6px; font-size: 11px; color: #cbd5e1;">
            <strong>Current Action:</strong> ${char.currentAction}
          </div>

          ${
            isInTransit
              ? `<div style="margin-top: 6px; padding: 4px 6px; background: rgba(245,158,11,0.15); border: 1px solid #f59e0b; border-radius: 4px; font-size: 10px; color: #fde68a;">
                  En route: ${char.transit!.originLocationName} ➔ ${char.transit!.destinationLocationName} (${char.transit!.distanceKm} km)
                 </div>`
              : ''
          }

          <div style="margin-top: 10px; display: flex; gap: 6px;">
            <button id="btn-char-inspect-${char.id}" style="flex: 1; padding: 5px 8px; font-size: 11px; font-weight: bold; background: #334155; color: #f8fafc; border: 1px solid #64748b; border-radius: 6px; cursor: pointer;">
              🔍 Profile
            </button>
            <button id="btn-char-travel-${char.id}" style="flex: 1; padding: 5px 8px; font-size: 11px; font-weight: bold; background: #f59e0b; color: #000; border: none; border-radius: 6px; cursor: pointer;">
              ✈️ Move
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const btnInspect = document.getElementById(`btn-char-inspect-${char.id}`);
        if (btnInspect) {
          btnInspect.onclick = () => {
            onInspectCharacter(char);
            marker.closePopup();
          };
        }
        const btnTravel = document.getElementById(`btn-char-travel-${char.id}`);
        if (btnTravel) {
          btnTravel.onclick = () => {
            setTravelModalChar(char);
            marker.closePopup();
          };
        }
      });

      markersLayerRef.current?.addLayer(marker);
    });
  }, [locations, characters, worldState, selectedLocationId, showRoutes]);

  // Zoom preset handlers
  const handleSetZoomLevel = (zoom: number) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setZoom(zoom);
  };

  const handleZoomIn = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.zoomOut();
  };

  const handleResetToWorld = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([25, 10], 2.5, { duration: 1.2 });
    onSelectLocation(null);
  };

  // Dispatch journey handler
  const handleDispatchTravel = () => {
    if (!travelModalChar || !selectedDestId || !onTravelCharacter) return;
    onTravelCharacter(travelModalChar.id, selectedDestId);
    const dest = locations.find((l) => l.id === selectedDestId);
    if (dest && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([dest.coordinates.lat, dest.coordinates.lng], 6, { duration: 1.5 });
    }
    setTravelModalChar(null);
    setSelectedDestId('');
  };

  return (
    <div
      className={`theme-surface border theme-border rounded-2xl flex flex-col transition-all duration-300 shadow-xl overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' : 'relative h-full min-h-[580px]'
      }`}
    >
      {/* Map Control Bar Header */}
      <div className="p-3 sm:px-4 border-b theme-border theme-header flex flex-wrap items-center justify-between gap-2.5 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg theme-accent-bg flex items-center justify-center font-bold shadow-md">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-stone-100 uppercase tracking-wide font-mono">
                Real-World Earth Map
              </h2>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono theme-badge border">
                OpenStreetMap & Leaflet
              </span>
            </div>
            <p className="text-[11px] text-stone-400">
              Living characters anchored to real latitude/longitude and IANA local timezones
            </p>
          </div>
        </div>

        {/* Toolbar & Fullscreen Controls */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          {/* Zoom Level Quick Jump Presets (world → country → city → street) */}
          <div className="flex items-center theme-inner border theme-border rounded-lg p-0.5">
            <button
              onClick={() => handleSetZoomLevel(2)}
              title="World Overview (Zoom 2)"
              className={`px-2 py-1 rounded text-[11px] transition-colors ${
                currentZoom <= 3 ? 'theme-accent-bg font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              World
            </button>
            <button
              onClick={() => handleSetZoomLevel(6)}
              title="Country / Regional View (Zoom 6)"
              className={`px-2 py-1 rounded text-[11px] transition-colors ${
                currentZoom >= 5 && currentZoom <= 8 ? 'theme-accent-bg font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Country
            </button>
            <button
              onClick={() => handleSetZoomLevel(12)}
              title="City / District View (Zoom 12)"
              className={`px-2 py-1 rounded text-[11px] transition-colors ${
                currentZoom >= 11 && currentZoom <= 14 ? 'theme-accent-bg font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              City
            </button>
            <button
              onClick={() => handleSetZoomLevel(16)}
              title="Street / Locality View (Zoom 16)"
              className={`px-2 py-1 rounded text-[11px] transition-colors ${
                currentZoom >= 15 ? 'theme-accent-bg font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Street
            </button>
          </div>

          {/* Tile Provider Switcher */}
          <div className="flex items-center theme-inner border theme-border rounded-lg p-0.5">
            <select
              value={tileProvider}
              onChange={(e) => setTileProvider(e.target.value as TileProvider)}
              className="bg-transparent text-stone-200 text-[11px] px-2 py-1 rounded focus:outline-none cursor-pointer"
              title="Switch OpenStreetMap Tile Layer Provider"
            >
              <option value="osm_standard" className="bg-stone-900 text-stone-200">
                OSM Standard
              </option>
              <option value="carto_dark" className="bg-stone-900 text-stone-200">
                Carto Dark Matter
              </option>
              <option value="carto_voyager" className="bg-stone-900 text-stone-200">
                Carto Voyager
              </option>
            </select>
          </div>

          {/* Toggle Physical Transit Corridors */}
          <button
            onClick={() => setShowRoutes(!showRoutes)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] transition-all ${
              showRoutes
                ? 'theme-inner theme-border theme-accent-text font-semibold'
                : 'theme-inner theme-border text-stone-500 hover:text-stone-300'
            }`}
            title="Toggle dashed transit paths on the map"
          >
            <Navigation className="w-3 h-3" />
            <span className="hidden sm:inline">Routes</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold text-xs transition-all shadow-sm ${
              isFullscreen
                ? 'theme-accent-bg'
                : 'theme-inner theme-border text-stone-200 hover:brightness-125'
            }`}
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen Map View'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Map Canvas Area */}
      <div className="relative flex-1 w-full h-full min-h-[480px]">
        {/* Leaflet DOM container */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating In-Map Overlays (HUD Controls) */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          {/* Zoom in / out buttons */}
          <div className="flex flex-col rounded-lg overflow-hidden theme-surface border theme-border shadow-lg">
            <button
              onClick={handleZoomIn}
              className="p-2 text-stone-300 hover:text-stone-100 hover:bg-white/10 transition-colors border-b theme-border"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 text-stone-300 hover:text-stone-100 hover:bg-white/10 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          {/* Reset World View Button */}
          <button
            onClick={handleResetToWorld}
            className="p-2 rounded-lg theme-surface border theme-border text-stone-300 hover:text-stone-100 hover:bg-white/10 shadow-lg transition-colors"
            title="Reset to Global World View"
          >
            <Compass className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Bottom Left Telemetry Badge */}
        <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
          <div className="theme-surface/90 backdrop-blur-md border theme-border rounded-xl p-2.5 text-xs font-mono shadow-xl space-y-1 pointer-events-auto">
            <div className="flex items-center justify-between gap-4 text-stone-400">
              <span className="flex items-center gap-1 font-semibold text-stone-200">
                <Clock className="w-3.5 h-3.5 theme-accent-text" />
                <span>Authoritative UTC:</span>
              </span>
              <span className="font-bold theme-accent-text text-sm">
                Day {worldState.day} • {String(worldState.hour).padStart(2, '0')}:{String(worldState.minute).padStart(2, '0')}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-[11px] text-stone-400 pt-1 border-t theme-border">
              <span>Zoom Level: {currentZoom}x</span>
              <span className="text-emerald-400 font-semibold">{characters.length} Inhabitants Tracked</span>
            </div>
          </div>
        </div>

        {/* Floating Quick Inhabitant Selector Carousel (Bottom Right) */}
        <div className="absolute bottom-4 right-4 z-10 max-w-sm hidden sm:block">
          <div className="theme-surface/95 backdrop-blur-md border theme-border rounded-xl p-2.5 shadow-2xl space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-stone-400">
              <span className="font-bold text-stone-200 flex items-center gap-1">
                <Users className="w-3 h-3 theme-accent-text" />
                <span>Characters on Earth</span>
              </span>
              <span>{characters.length} tracked</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-xs scrollbar-thin">
              {characters.map((char) => {
                const charLocal = getLocalTime(worldState.hour, worldState.minute, 0, char.ianaTimezone);
                return (
                  <div
                    key={char.id}
                    className="flex items-center gap-1 theme-inner border theme-border rounded-md px-1.5 py-1 shrink-0"
                  >
                    <button
                      onClick={() => {
                        if (mapInstanceRef.current) {
                          mapInstanceRef.current.flyTo([char.latitude, char.longitude], 12, { duration: 1.5 });
                        }
                        onInspectCharacter(char);
                      }}
                      className="flex items-center gap-1.5 hover:brightness-125 text-left transition-all"
                      title={`Jump to ${char.name} (${char.city}, ${char.country})`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: char.avatarColor }}
                      />
                      <div className="text-[10px]">
                        <span className="font-bold text-stone-200 block truncate max-w-[70px]">{char.name}</span>
                        <span className="text-stone-400 font-mono text-[9px]">{charLocal.formatted}</span>
                      </div>
                    </button>
                    {onTravelCharacter && (
                      <button
                        onClick={() => setTravelModalChar(char)}
                        className="p-1 text-stone-400 hover:theme-accent-text transition-colors"
                        title={`Dispatch travel journey for ${char.name}`}
                      >
                        <Send className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Dispatch Travel Journey Modal */}
      {travelModalChar && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="theme-surface border theme-border rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b theme-border pb-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: travelModalChar.avatarColor }}
                />
                <div>
                  <h3 className="text-sm font-bold text-stone-100">
                    Dispatch Physical Journey: {travelModalChar.name}
                  </h3>
                  <p className="text-[11px] text-stone-400 font-mono">
                    Currently in {travelModalChar.city}, {travelModalChar.country} ({travelModalChar.latitude.toFixed(4)}°, {travelModalChar.longitude.toFixed(4)}°)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTravelModalChar(null)}
                className="text-stone-400 hover:text-stone-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-mono text-stone-300">
                Select Real-World Geographic Destination:
              </label>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {locations
                  .filter((loc) => loc.id !== travelModalChar.locationId)
                  .map((dest) => {
                    const currentLoc = locations.find((l) => l.id === travelModalChar.locationId);
                    const route = currentLoc?.routes.find((r) => r.destinationId === dest.id);
                    const distanceKm = route ? route.distanceKm : 1800;
                    const transitType = route ? route.transitType : 'overland_trek';
                    const ticks = route ? route.travelTicks : 3;
                    const destLocal = getLocalTime(worldState.hour, worldState.minute, dest.timezoneOffset, dest.ianaTimezone);

                    return (
                      <div
                        key={dest.id}
                        onClick={() => setSelectedDestId(dest.id)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          selectedDestId === dest.id
                            ? 'theme-accent-bg border-white/40 shadow-md font-medium'
                            : 'theme-inner theme-border hover:brightness-125'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>{dest.name} ({dest.city}, {dest.country})</span>
                          <span className="font-mono text-[11px]">{destLocal.formatted}</span>
                        </div>
                        <div className="text-[11px] text-stone-300/80 mt-1 flex items-center justify-between font-mono">
                          <span>{distanceKm} km • {transitType.replace(/_/g, ' ')}</span>
                          <span>~{ticks * 10} min ({ticks} ticks)</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t theme-border">
              <button
                onClick={() => setTravelModalChar(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-mono text-stone-400 hover:text-stone-200"
              >
                Cancel
              </button>
              <button
                disabled={!selectedDestId}
                onClick={handleDispatchTravel}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold font-mono transition-all shadow-md ${
                  selectedDestId
                    ? 'theme-accent-bg'
                    : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Begin Journey</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
