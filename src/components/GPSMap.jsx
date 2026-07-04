// ─── GPSMap — Interactive Satellite Map Component ───
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Plus, Trash2, Save, Crosshair, Search, Camera, ChevronDown, ChevronUp } from 'lucide-react';
import html2canvas from 'html2canvas';
import {
  subscribeToMapConfig,
  updateMapConfig,
  updateWaypoints as saveWaypoints,
  DEFAULT_MAP_CONFIG,
  uploadMapScreenshot,
} from '../mapEngine';

// ─── Fix default Leaflet marker icon (broken chunk paths in bundlers) ───
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Inline Styles ───
const S = {
  wrapper: {
    position: 'relative',
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    background: 'rgba(13,20,38,0.55)',
    border: '1px solid rgba(41,182,246,0.15)',
    boxShadow: '0 4px 30px rgba(0,112,243,0.08)',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  mapContainer: {
    width: '100%',
    height: window.innerWidth < 768 ? 400 : 500,
    zIndex: 1,
  },
  searchBar: {
    display: 'flex',
    gap: 8,
    padding: '12px 14px',
    background: 'rgba(13,20,38,0.85)',
    borderBottom: '1px solid rgba(41,182,246,0.15)',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    padding: '9px 12px',
    fontSize: 13,
    color: '#ffffff',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(41,182,246,0.15)',
    borderRadius: 8,
    outline: 'none',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  searchBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 16px',
    fontSize: 13,
    fontWeight: 600,
    color: '#ffffff',
    background: '#0070f3',
    border: '1px solid #29b6f6',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: 'all 0.2s',
  },
  importActions: {
    padding: '10px 14px',
    background: 'rgba(225,29,72,0.1)',
    borderBottom: '1px solid rgba(225,29,72,0.25)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 12,
    color: '#ffffff',
    flexWrap: 'wrap',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    background: 'rgba(13,20,38,0.85)',
    borderBottom: '1px solid rgba(41,182,246,0.15)',
    overflowX: 'auto',
    flexWrap: 'wrap',
  },
  btn: (active) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 14px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    color: '#ffffff',
    background: active ? '#0070f3' : 'rgba(255,255,255,0.07)',
    border: active ? '1px solid #29b6f6' : '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all .2s',
    whiteSpace: 'nowrap',
  }),
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 600,
    color: '#29b6f6',
    background: 'rgba(41,182,246,0.1)',
    border: '1px solid rgba(41,182,246,0.2)',
    borderRadius: 6,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  panel: {
    background: 'rgba(13,20,38,0.92)',
    borderTop: '1px solid rgba(41,182,246,0.15)',
    padding: 14,
    maxHeight: 260,
    overflowY: 'auto',
  },
  wpRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    marginBottom: 6,
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.06)',
  },
  wpLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#ffffff',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  wpGame: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    color: 'rgba(255,255,255,0.45)',
    transition: 'color .2s',
  },
  modalOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(10,16,32,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalBox: {
    background: '#0d1426',
    border: '1px solid rgba(41,182,246,0.25)',
    borderRadius: 14,
    padding: 24,
    width: '90%',
    maxWidth: 340,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: 14,
    fontFamily: "'Outfit', sans-serif",
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    fontSize: 13,
    color: '#ffffff',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    outline: 'none',
    marginBottom: 10,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '9px 12px',
    fontSize: 13,
    color: '#ffffff',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    outline: 'none',
    marginBottom: 14,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    boxSizing: 'border-box',
  },
  distanceBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    background: 'rgba(13,20,38,0.88)',
    borderTop: '1px solid rgba(41,182,246,0.15)',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  navBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
    background: 'linear-gradient(135deg, #0070f3, #29b6f6)',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    marginLeft: 'auto',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  heading: {
    fontSize: 15,
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: 10,
    fontFamily: "'Outfit', sans-serif",
  },
};

// ─── Helpers ───
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function haversine(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function bearing(from, to) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(toRad(to.lat));
  const x =
    Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
    Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function makeCircleIcon(color, size = 18) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:2.5px solid #fff;
      box-shadow:0 0 8px ${color}88;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function makePulsingDot() {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:18px;height:18px;">
      <div style="
        position:absolute;inset:0;border-radius:50%;
        background:#29b6f6;border:2px solid #fff;
        box-shadow:0 0 10px #29b6f688;z-index:2;
      "></div>
      <div style="
        position:absolute;inset:-6px;border-radius:50%;
        background:rgba(41,182,246,0.25);
        animation:gpsPulse 2s ease-out infinite;z-index:1;
      "></div>
    </div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

// Inject pulse keyframes once
if (typeof document !== 'undefined' && !document.getElementById('gps-pulse-style')) {
  const style = document.createElement('style');
  style.id = 'gps-pulse-style';
  style.textContent = `@keyframes gpsPulse{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.2);opacity:0}}`;
  document.head.appendChild(style);
}

// ─── Available games list (for the waypoint form) ───
const GAME_OPTIONS = [
  'Football',
  'Basketball',
  'Volleyball',
  'Handball',
  'Swimming',
  'Track & Field',
  'Table Tennis',
  'Tug of War',
  'Obstacle Course',
  'Relay Race',
  'Warm-up Zone',
  'Rest Station',
  'Other',
];

// ─── Component ───
export default function GPSMap({
  eventCode,
  currentUser,
  campData,
  eventConfig,
  getTeamColorHex,
  currentTime,
  liveLocationStatus, // Passed in from App.jsx
}) {
  const isAdmin = currentUser?.role === 'admin';

  // ── State ──
  const [mapConfig, setMapConfig] = useState(null);
  const [waypoints, setWaypoints] = useState([]);
  const [addMode, setAddMode] = useState(false);
  const [pendingLatLng, setPendingLatLng] = useState(null);
  const [formLabel, setFormLabel] = useState('');
  const [formGame, setFormGame] = useState(GAME_OPTIONS[0]);
  const [userPos, setUserPos] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Route & Team Guidance State ──
  // Extract list of all subteams
  const activeTeamsList = useMemo(() => {
    if (!campData?.matchups) return [];
    const teams = new Set();
    campData.matchups.forEach(m => {
      if (m.teamA && m.teamA !== 'Servants') teams.add(m.teamA);
      if (m.teamB && m.teamB !== 'Servants') teams.add(m.teamB);
    });
    return Array.from(teams).sort();
  }, [campData]);

  const [highlightedTeam, setHighlightedTeam] = useState(currentUser?.teamCode || '');

  useEffect(() => {
    if (currentUser?.teamCode) {
      setHighlightedTeam(currentUser.teamCode);
    }
  }, [currentUser]);

  // Find if the highlighted team has an active matchup in the current slot
  const activeTargetLocation = useMemo(() => {
    if (!highlightedTeam || !liveLocationStatus) return null;
    
    for (const loc of liveLocationStatus) {
      const match = loc.activeMatchup;
      if (match && (match.teamA === highlightedTeam || match.teamB === highlightedTeam)) {
        return {
          locationName: loc.name,
          game: match.game,
          opponent: match.teamA === highlightedTeam ? match.teamB : match.teamA,
          time: match.time,
        };
      }
    }
    return null;
  }, [highlightedTeam, liveLocationStatus]);

  // Find the waypoint corresponding to the active location/game
  const activeTargetWaypoint = useMemo(() => {
    if (!activeTargetLocation || waypoints.length === 0) return null;
    
    const locName = activeTargetLocation.locationName.toLowerCase();
    const gameName = activeTargetLocation.game.toLowerCase();
    
    return waypoints.find(wp => {
      const label = (wp.label || '').toLowerCase();
      const game = (wp.game || '').toLowerCase();
      return label.includes(locName) || locName.includes(label) || game.includes(gameName) || gameName.includes(game);
    });
  }, [activeTargetLocation, waypoints]);

  // Calculate distance & bearing to the target waypoint
  const targetDistanceInfo = useMemo(() => {
    if (!userPos || !activeTargetWaypoint) return null;
    const dist = haversine(userPos, activeTargetWaypoint);
    const bearingDeg = bearing(userPos, activeTargetWaypoint);
    return { distance: dist, bearing: bearingDeg };
  }, [userPos, activeTargetWaypoint]);

  // ── Find nearest waypoint (fallback derived state) ──
  const nearest = useMemo(() => {
    if (!userPos || waypoints.length === 0) return null;
    let minDist = Infinity;
    let closest = null;
    waypoints.forEach((wp) => {
      const d = haversine(userPos, wp);
      if (d < minDist) {
        minDist = d;
        closest = { ...wp, distance: d };
      }
    });
    return closest;
  }, [userPos, waypoints]);

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [adminPanelExpanded, setAdminPanelExpanded] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Import Location Search State ──
  const [importInput, setImportInput] = useState('');
  const [importError, setImportError] = useState('');
  const [tempMarkerPos, setTempMarkerPos] = useState(null);

  // ── Refs ──
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const tileRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const geoWatchRef = useRef(null);

  const addModeRef = useRef(addMode);
  const isAdminRef = useRef(isAdmin);

  useEffect(() => {
    addModeRef.current = addMode;
  }, [addMode]);

  useEffect(() => {
    isAdminRef.current = isAdmin;
  }, [isAdmin]);

  // ── Subscribe to Firestore config ──
  useEffect(() => {
    if (!eventCode) return;
    const unsub = subscribeToMapConfig(eventCode, (cfg) => {
      setMapConfig(cfg);
      setWaypoints(cfg.waypoints || []);
    });
    return () => unsub();
  }, [eventCode]);

  // ── Initialise Leaflet map ──
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;

    const cfg = mapConfig || DEFAULT_MAP_CONFIG;

    const map = L.map(mapElRef.current, {
      center: [cfg.center.lat, cfg.center.lng],
      zoom: cfg.zoom,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    tileRef.current = L.tileLayer(
      cfg.satelliteUrl || DEFAULT_MAP_CONFIG.satelliteUrl,
      { attribution: 'Tiles &copy; Esri', maxZoom: 22, crossOrigin: 'anonymous' }
    ).addTo(map);

    // Admin: click to add waypoint (safely registered via refs)
    map.on('click', (e) => {
      if (!isAdminRef.current) return;
      if (!addModeRef.current) return;
      setPendingLatLng({ lat: e.latlng.lat, lng: e.latlng.lng });
      setFormLabel('');
      setFormGame(GAME_OPTIONS[0]);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapConfig]);

  const routingPolylineRef = useRef(null);

  // ── Render waypoint markers & active target routes ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    // Clear old polyline
    if (routingPolylineRef.current) {
      map.removeLayer(routingPolylineRef.current);
      routingPolylineRef.current = null;
    }

    waypoints.forEach((wp, idx) => {
      // Determine color — match team currently at this station
      let color = '#6b7280'; // gray default
      if (wp.color) {
        color = wp.color;
      }
      if (getTeamColorHex && wp.game && currentTime) {
        // Check if a team is currently assigned to this station
        try {
          const teamColor = resolveStationTeamColor(wp, campData, eventConfig, getTeamColorHex, currentTime);
          if (teamColor) color = teamColor;
        } catch {
          /* keep default */
        }
      }

      // Check if this waypoint is the active target station for the selected team
      const isActiveTarget = activeTargetWaypoint && activeTargetWaypoint.id === wp.id;

      const marker = L.marker([wp.lat, wp.lng], {
        icon: isActiveTarget 
          ? L.divIcon({
              className: '',
              html: `<div style="position:relative;width:24px;height:24px;">
                <div style="
                  position:absolute;inset:2px;border-radius:50%;
                  background:${color};border:2.5px solid #ffffff;
                  box-shadow:0 0 12px ${color};z-index:2;
                "></div>
                <div style="
                  position:absolute;inset:-6px;border-radius:50%;
                  background:${color}33;
                  animation:gpsPulse 1.2s ease-out infinite;z-index:1;
                "></div>
              </div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            })
          : makeCircleIcon(color, 20),
        draggable: isAdmin,
      }).addTo(map);

      marker.bindTooltip(isActiveTarget ? `🎯 CURRENT STATION: ${wp.label || wp.game}` : (wp.label || wp.game || `Station ${idx + 1}`), {
        permanent: isActiveTarget, // Always visible for active station
        direction: 'top',
        className: isActiveTarget ? 'active-target-tooltip' : '',
        offset: [0, -12],
      });

      if (isAdmin) {
        marker.on('dragend', (e) => {
          const pos = e.target.getLatLng();
          setWaypoints((prev) => {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], lat: pos.lat, lng: pos.lng };
            return copy;
          });
          setDirty(true);
        });
      }

      markersRef.current.push(marker);
    });

    // Draw active target path from user to target waypoint
    if (userPos && activeTargetWaypoint) {
      let teamColor = '#ffb300';
      if (getTeamColorHex && highlightedTeam) {
        teamColor = getTeamColorHex(highlightedTeam) || '#ffb300';
      }
      
      const polyline = L.polyline([[userPos.lat, userPos.lng], [activeTargetWaypoint.lat, activeTargetWaypoint.lng]], {
        color: teamColor,
        dashArray: '8, 8',
        weight: 4.5,
        opacity: 0.85,
        lineJoin: 'round',
      }).addTo(map);

      routingPolylineRef.current = polyline;
    }

    // Render temporary search/import marker if it exists
    if (tempMarkerPos) {
      const tempMarker = L.marker([tempMarkerPos.lat, tempMarkerPos.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="position:relative;width:24px;height:24px;">
            <div style="
              position:absolute;inset:0;border-radius:50%;
              background:#e11d48;border:2.5px solid #fff;
              box-shadow:0 0 12px #e11d48;z-index:2;
            "></div>
            <div style="
              position:absolute;inset:-8px;border-radius:50%;
              background:rgba(225,29,72,0.3);
              animation:gpsPulse 1.5s ease-out infinite;z-index:1;
            "></div>
          </div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        })
      }).addTo(map);
      tempMarker.bindTooltip('Imported Location', { permanent: true, direction: 'top', offset: [0, -14] });
      markersRef.current.push(tempMarker);
    }
  }, [waypoints, isAdmin, getTeamColorHex, currentTime, campData, eventConfig, tempMarkerPos, userPos, activeTargetWaypoint, highlightedTeam]);

  // ── GPS tracking ──
  useEffect(() => {
    if (!navigator.geolocation) return;

    geoWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(coords);
      },
      (err) => console.warn('[GPSMap] geolocation error:', err.message),
      { enableHighAccuracy: false, maximumAge: 10000, timeout: 10000 }
    );

    return () => {
      if (geoWatchRef.current != null) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
      }
    };
  }, []);

  // ── User position marker updates ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userPos) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userPos.lat, userPos.lng]);
    } else {
      userMarkerRef.current = L.marker([userPos.lat, userPos.lng], {
        icon: makePulsingDot(),
        zIndexOffset: 1000,
      }).addTo(map);
      userMarkerRef.current.bindTooltip('You', { permanent: false, direction: 'top', offset: [0, -12] });
    }
  }, [userPos]);

  // ── Actions ──
  const handleSetCenter = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    const z = map.getZoom();
    updateMapConfig(eventCode, { center: { lat: c.lat, lng: c.lng }, zoom: z });
  }, [eventCode]);

  const handleAddWaypoint = useCallback(() => {
    if (!pendingLatLng || !formLabel.trim()) return;
    const wp = {
      id: uid(),
      label: formLabel.trim(),
      lat: pendingLatLng.lat,
      lng: pendingLatLng.lng,
      game: formGame,
      color: '#6b7280',
    };
    setWaypoints((prev) => [...prev, wp]);
    setPendingLatLng(null);
    setFormLabel('');
    setDirty(true);
  }, [pendingLatLng, formLabel, formGame]);

  const handleDeleteWaypoint = useCallback((id) => {
    if (!window.confirm("Are you sure you want to delete this waypoint?")) return;
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveWaypoints(eventCode, waypoints);
      setDirty(false);
    } catch (e) {
      console.error('[GPSMap] save error:', e);
    } finally {
      setSaving(false);
    }
  }, [eventCode, waypoints]);

  const [capturing, setCapturing] = useState(false);

  const handleCaptureScreenshot = useCallback(async () => {
    if (!mapElRef.current) return;
    setCapturing(true);
    try {
      // Small delay to let animations settle
      await new Promise((r) => setTimeout(r, 300));
      
      const canvas = await html2canvas(mapElRef.current, {
        useCORS: true,
        allowTaint: false,
        logging: false,
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert('Failed to generate image from map canvas.');
          setCapturing(false);
          return;
        }
        
        try {
          const downloadUrl = await uploadMapScreenshot(eventCode, blob);
          await updateMapConfig(eventCode, { customMapUrl: downloadUrl });
          alert('Map screenshot captured and synced to Map Key successfully!');
        } catch (err) {
          console.error('[GPSMap] upload screenshot error:', err);
          alert('Failed to upload map screenshot to Firebase: ' + err.message);
        } finally {
          setCapturing(false);
        }
      }, 'image/png');
      
    } catch (e) {
      console.error('[GPSMap] capture error:', e);
      alert('Failed to capture map screenshot: ' + e.message);
      setCapturing(false);
    }
  }, [eventCode]);

  const handleNavigate = useCallback(() => {
    if (!nearest) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${nearest.lat},${nearest.lng}&travelmode=walking`;
    window.open(url, '_blank');
  }, [nearest]);

  // ── Google Maps Import Parser ──
  const handleImportLocation = useCallback(() => {
    setImportError('');
    const input = importInput.trim();
    if (!input) {
      setImportError('Please enter coordinates or a Google Maps URL.');
      return;
    }

    // 1. Simple coordinates: e.g. "30.0444, 31.2357" or "30.0444 31.2357"
    const coordsRegex = /^(-?\d+(?:\.\d+)?)\s*[,/|\s]\s*(-?\d+(?:\.\d+)?)$/;
    const coordsMatch = input.match(coordsRegex);
    let lat = null, lng = null;

    if (coordsMatch) {
      lat = parseFloat(coordsMatch[1]);
      lng = parseFloat(coordsMatch[2]);
    } else {
      // 2. Check for @lat,lng in URL (e.g., /maps/@30.0444,31.2357,17z)
      const urlAtRegex = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/;
      const urlAtMatch = input.match(urlAtRegex);
      if (urlAtMatch) {
        lat = parseFloat(urlAtMatch[1]);
        lng = parseFloat(urlAtMatch[2]);
      } else {
        // 3. Check for q=lat,lng or daddr=lat,lng or query=lat,lng in URL query parameters
        const queryRegex = /[?&](?:q|daddr|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/;
        const queryMatch = input.match(queryRegex);
        if (queryMatch) {
          lat = parseFloat(queryMatch[1]);
          lng = parseFloat(queryMatch[2]);
        }
      }
    }

    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        setImportError('Coordinates out of range (Lat: -90 to 90, Lng: -180 to 180).');
        return;
      }

      const coords = { lat, lng };
      setTempMarkerPos(coords);
      
      const map = mapRef.current;
      if (map) {
        map.setView([lat, lng], 19);
      }
    } else {
      setImportError('Could not parse coordinates. Make sure you enter raw coordinates (e.g. 30.0444, 31.2357) or a Google Maps URL containing coordinates.');
    }
  }, [importInput]);

  // ── Render ──
  if (!mapConfig && !eventCode) {
    return (
      <div style={{ ...S.wrapper, padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
          No event selected for the map.
        </p>
      </div>
    );
  }

  return (
    <div style={S.wrapper}>
      {/* ── Active Team Route Guidance Selector ── */}
      {activeTeamsList.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          background: 'rgba(20, 27, 47, 0.95)',
          borderBottom: '1px solid rgba(41, 182, 246, 0.15)',
          fontSize: 13,
          color: '#ffffff',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          flexWrap: 'wrap'
        }}>
          <span style={{ fontWeight: '700', color: 'rgba(255,255,255,0.7)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            🧭 Route Guidance:
          </span>
          <select
            value={highlightedTeam}
            onChange={(e) => setHighlightedTeam(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(41,182,246,0.25)',
              color: '#ffffff',
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            <option value="">-- View All Stations --</option>
            {activeTeamsList.map((t) => (
              <option key={t} value={t}>
                {t} (Highlight Active Game)
              </option>
            ))}
          </select>
          {activeTargetLocation ? (
            <span style={{ 
              fontSize: '0.75rem', 
              color: '#ffb300', 
              marginLeft: 'auto', 
              fontWeight: '700',
              background: 'rgba(255, 179, 0, 0.12)',
              border: '1px solid rgba(255, 179, 0, 0.2)',
              padding: '3px 8px',
              borderRadius: '12px'
            }}>
              🎯 Active: {activeTargetLocation.game}
            </span>
          ) : highlightedTeam ? (
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' }}>
              No active game scheduled right now
            </span>
          ) : null}
        </div>
      )}

      {/* ── Google Maps Location Import Search Bar ── */}
      <div style={S.searchBar}>
        <input
          style={S.searchInput}
          placeholder="Paste Google Maps link or raw coordinates (e.g. 30.044, 31.235)"
          value={importInput}
          onChange={(e) => {
            setImportInput(e.target.value);
            if (importError) setImportError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleImportLocation();
          }}
        />
        <button style={S.searchBtn} onClick={handleImportLocation}>
          <Search size={14} /> Locate
        </button>
      </div>

      {/* ── Import Errors ── */}
      {importError && (
        <div style={{ padding: '8px 14px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: 12, borderBottom: '1px solid rgba(239, 68, 68, 0.25)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          ⚠️ {importError}
        </div>
      )}

      {/* ── Import Actions Panel ── */}
      {tempMarkerPos && (
        <div style={S.importActions}>
          <span style={{ fontWeight: '700', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            📍 Location Found: {tempMarkerPos.lat.toFixed(5)}, {tempMarkerPos.lng.toFixed(5)}
          </span>
          {isAdmin && (
            <>
              <button
                style={{ ...S.btn(false), padding: '5px 10px', fontSize: 11, background: '#0070f3', border: '1px solid #29b6f6' }}
                onClick={() => {
                  setPendingLatLng(tempMarkerPos);
                  setFormLabel('');
                  setFormGame(GAME_OPTIONS[0]);
                }}
              >
                <Plus size={11} /> Add Waypoint here
              </button>
              <button
                style={{ ...S.btn(false), padding: '5px 10px', fontSize: 11, background: 'rgba(255,255,255,0.08)' }}
                onClick={() => {
                  updateMapConfig(eventCode, { center: tempMarkerPos, zoom: mapRef.current?.getZoom() || 18 });
                  alert('Venue center updated to this location!');
                }}
              >
                <Crosshair size={11} /> Set Venue Center
              </button>
            </>
          )}
          <button
            style={{ ...S.btn(false), padding: '5px 10px', fontSize: 11, background: 'rgba(255,255,255,0.08)', marginLeft: 'auto' }}
            onClick={() => {
              setTempMarkerPos(null);
              setImportInput('');
            }}
          >
            Clear Highlight
          </button>
        </div>
      )}

      {/* ── Admin Toolbar (Collapsible Toggle) ── */}
      {isAdmin && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            background: 'rgba(20, 27, 47, 0.95)',
            borderBottom: '1px solid rgba(41, 182, 246, 0.15)',
            cursor: 'pointer',
            userSelect: 'none',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            transition: 'background 0.2s ease',
          }}
          onClick={() => setAdminPanelExpanded(!adminPanelExpanded)}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: '#29b6f6', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={16} /> Admin Settings & Waypoints
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
            {adminPanelExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      )}

      {isAdmin && adminPanelExpanded && (
        <div style={S.toolbar}>
          <button
            style={S.btn(false)}
            onClick={handleSetCenter}
            title="Set current map view as venue center"
          >
            <Crosshair size={14} /> Set Venue Center
          </button>

          <button
            style={S.btn(addMode)}
            onClick={() => {
              setAddMode((v) => !v);
              setPendingLatLng(null);
            }}
          >
            <Plus size={14} /> {addMode ? 'Cancel Add' : 'Add Waypoint'}
          </button>

          {dirty && (
            <button style={S.btn(false)} onClick={handleSave} disabled={saving}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save Waypoints'}
            </button>
          )}

          <button
            style={S.btn(capturing)}
            onClick={handleCaptureScreenshot}
            disabled={capturing}
            title="Take a screenshot of this setup and use it as the Map Key layout image"
          >
            <Camera size={14} /> {capturing ? 'Syncing...' : 'Sync Screenshot to Map Key'}
          </button>

          <span style={S.badge}>
            <MapPin size={12} /> {waypoints.length} station{waypoints.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ── Map ── */}
      <div ref={mapElRef} style={{ ...S.mapContainer, height: isMobile ? 350 : 500 }} />

      {/* ── Add Waypoint Modal ── */}
      {isAdmin && pendingLatLng && (
        <div style={S.modalOverlay}>
          <div style={S.modalBox}>
            <div style={S.modalTitle}>New Waypoint</div>

            <input
              style={S.input}
              placeholder="Station name…"
              value={formLabel}
              onChange={(e) => setFormLabel(e.target.value)}
              autoFocus
            />

            <select
              style={S.select}
              value={formGame}
              onChange={(e) => setFormGame(e.target.value)}
            >
              {GAME_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                style={{ ...S.btn(true), flex: 1, justifyContent: 'center' }}
                onClick={handleAddWaypoint}
                disabled={!formLabel.trim()}
              >
                <Plus size={14} /> Add
              </button>
              <button
                style={{ ...S.btn(false), flex: 1, justifyContent: 'center' }}
                onClick={() => setPendingLatLng(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Distance Banner / Nav ── */}
      {userPos && (activeTargetWaypoint || nearest) && (
        <div style={{
          ...S.distanceBanner,
          borderTop: activeTargetWaypoint ? '1px solid rgba(255, 179, 0, 0.3)' : S.distanceBanner.borderTop,
          background: activeTargetWaypoint ? 'rgba(20, 27, 47, 0.93)' : S.distanceBanner.background
        }}>
          <Navigation
            size={16}
            style={{
              color: activeTargetWaypoint ? '#ffb300' : '#29b6f6',
              transform: `rotate(${bearing(userPos, activeTargetWaypoint || nearest)}deg)`,
              transition: 'transform 0.4s ease',
            }}
          />
          {activeTargetWaypoint ? (
            <span>
              🎯 Head to <strong style={{ color: '#ffffff' }}>{activeTargetLocation.game}</strong> ({activeTargetLocation.locationName})
              {' — '}
              <strong style={{ color: '#ffb300' }}>
                {targetDistanceInfo?.distance < 1000
                  ? `${Math.round(targetDistanceInfo.distance)} m away`
                  : `${(targetDistanceInfo.distance / 1000).toFixed(1)} km away`}
              </strong>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>
                (Matchup: {highlightedTeam} vs {activeTargetLocation.opponent})
              </span>
            </span>
          ) : (
            <span>
              <strong style={{ color: '#ffffff' }}>{nearest.label || nearest.game}</strong>
              {' — '}
              {nearest.distance < 1000
                ? `${Math.round(nearest.distance)} m away`
                : `${(nearest.distance / 1000).toFixed(1)} km away`}
            </span>
          )}

          <button 
            style={{
              ...S.navBtn,
              background: activeTargetWaypoint ? 'linear-gradient(135deg, #ffb300, #ffa000)' : S.navBtn.background,
              color: activeTargetWaypoint ? '#070a13' : '#ffffff'
            }} 
            onClick={() => {
              const dest = activeTargetWaypoint || nearest;
              const url = `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=walking`;
              window.open(url, '_blank');
            }}
          >
            <Navigation size={14} /> Guide Me
          </button>
        </div>
      )}

      {/* ── Admin Waypoint List ── */}
      {isAdmin && adminPanelExpanded && waypoints.length > 0 && (
        <div style={S.panel}>
          <div style={S.heading}>Stations</div>
          {waypoints.map((wp) => (
            <div key={wp.id} style={S.wpRow}>
              <div>
                <div style={S.wpLabel}>
                  <span
                     style={{
                       display: 'inline-block',
                       width: 10,
                       height: 10,
                       borderRadius: '50%',
                       background: wp.color || '#6b7280',
                       marginRight: 8,
                       verticalAlign: 'middle',
                     }}
                  />
                  {wp.label}
                </div>
                <div style={S.wpGame}>{wp.game}</div>
              </div>
              <button
                style={S.iconBtn}
                onClick={() => handleDeleteWaypoint(wp.id)}
                title="Delete waypoint"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Station → Team Color Resolution ───
function resolveStationTeamColor(station, campData, eventConfig, getTeamColorHex, currentTime) {
  if (!campData || !eventConfig || !currentTime || !getTeamColorHex) return null;

  const schedule = eventConfig.schedule || campData?.schedule;
  if (!schedule || !Array.isArray(schedule)) return null;

  const now = typeof currentTime === 'number' ? currentTime : Date.now();

  for (const slot of schedule) {
    const start = slot.startTime || slot.start;
    const end = slot.endTime || slot.end;

    if (start && end && now >= start && now < end) {
      const assignments = slot.assignments || slot.teams;
      if (assignments && typeof assignments === 'object') {
        for (const [key, value] of Object.entries(assignments)) {
          if (value === station.game || value === station.label || key === station.game || key === station.label) {
            const teamId = value === station.game || value === station.label ? key : value;
            const hex = getTeamColorHex(teamId);
            if (hex) return hex;
          }
        }
      }
    }
  }

  return null;
}
