import { useState, useEffect, useRef, useCallback } from 'react'
import Icons from '../ui/Icons'
import { useI18n } from '../../lib/i18n'

/**
 * AddressPicker
 * - Nominatim autocomplete (OpenStreetMap, no API key)
 * - Leaflet map with draggable pin
 * - Emits: onChange({ address, city, state, country, postalCode, lat, lng })
 */
export default function AddressPicker({ value = {}, onChange, className = '' }) {
  const { t } = useI18n()

  // Track whether this is the initial mount so we don't override user edits
  const initialised = useRef(false)

  const [query, setQuery]     = useState(value.address || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [coords, setCoords]   = useState(
    value.lat && value.lng ? { lat: value.lat, lng: value.lng } : null
  )
  // Auto-open map when editing a contact that already has coordinates
  const [showMap, setShowMap] = useState(!!(value.lat && value.lng))

  const mapRef     = useRef(null)  // DOM node
  const leafletMap = useRef(null)  // Leaflet map instance
  const markerRef  = useRef(null)  // Leaflet marker
  const debounce   = useRef(null)
  const leafletReady = useRef(!!window?.L) // true if already loaded

  // Sync when value prop changes (e.g. editing contact — data arrives after first render)
  useEffect(() => {
    if (initialised.current) return // only sync on prop change, not after user interaction
    if (value.address && value.address !== query) {
      setQuery(value.address)
    }
    if (value.lat && value.lng) {
      setCoords({ lat: value.lat, lng: value.lng })
      setShowMap(true)
    }
    if (value.address || value.lat) {
      initialised.current = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.address, value.lat, value.lng])

  // ── Nominatim search ──────────────────────────────────────────────────────
  const search = useCallback(async (q) => {
    if (!q || q.length < 3) { setResults([]); return }
    setLoading(true)
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`
      const r = await fetch(url, { headers: { 'Accept-Language': 'es' } })
      const data = await r.json()
      setResults(data)
    } catch (e) {
      console.error('Nominatim search:', e)
    }
    setLoading(false)
  }, [])

  const handleInput = (e) => {
    const v = e.target.value
    setQuery(v)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => search(v), 350)
  }

  // ── Select a Nominatim result ─────────────────────────────────────────────
  const selectResult = (r) => {
    const a = r.address || {}
    const streetPart = [a.road, a.house_number].filter(Boolean).join(' ')
    const address    = streetPart || r.display_name || ''
    const city       = a.city || a.town || a.village || a.municipality || ''
    const state      = a.state || a.region || ''
    const country    = a.country || ''
    const postalCode = a.postcode || ''
    const lat = parseFloat(r.lat)
    const lng = parseFloat(r.lon)

    initialised.current = true // stop prop sync after user picks
    setQuery(r.display_name)
    setResults([])
    setCoords({ lat, lng })
    onChange?.({ address, city, state, country, postalCode, lat, lng })

    if (leafletMap.current) {
      leafletMap.current.setView([lat, lng], 16)
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        placeMarker(leafletMap.current, lat, lng)
      }
    }
  }

  // ── Reverse geocode helper ────────────────────────────────────────────────
  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lng}`,
        { headers: { 'Accept-Language': 'es' } }
      )
      const data = await r.json()
      const a = data.address || {}
      // Use road+number if available, otherwise fall back to full display_name
      const streetPart = [a.road, a.house_number].filter(Boolean).join(' ')
      const address    = streetPart || data.display_name || ''
      const city       = a.city || a.town || a.village || a.municipality || ''
      const state      = a.state || a.region || ''
      const country    = a.country || ''
      const postalCode = a.postcode || ''
      setQuery(data.display_name || '')
      setCoords({ lat, lng })
      onChange?.({ address, city, state, country, postalCode, lat, lng })
    } catch (e) {
      setCoords({ lat, lng })
      onChange?.({ ...value, lat, lng })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChange])

  // ── Leaflet marker placement ──────────────────────────────────────────────
  const placeMarker = useCallback((map, lat, lng) => {
    const L = window.L
    if (!L || !map) return
    const icon = L.divIcon({
      html: '<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,.4))">📍</div>',
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    })
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else {
      const m = L.marker([lat, lng], { icon, draggable: true }).addTo(map)
      m.on('dragend', () => {
        const pos = m.getLatLng()
        initialised.current = true
        reverseGeocode(pos.lat, pos.lng)
      })
      markerRef.current = m
    }
  }, [reverseGeocode])

  // ── Leaflet map init ──────────────────────────────────────────────────────
  const initMap = useCallback(() => {
    const L = window.L
    if (!L || !mapRef.current || leafletMap.current) return

    const center = coords ? [coords.lat, coords.lng] : [23.6345, -102.5528]
    const zoom   = coords ? 16 : 5

    const map = L.map(mapRef.current, { zoomControl: true }).setView(center, zoom)
    leafletMap.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    if (coords) placeMarker(map, coords.lat, coords.lng)

    map.on('click', (e) => {
      const { lat, lng } = e.latlng
      initialised.current = true
      placeMarker(map, lat, lng)
      reverseGeocode(lat, lng)
    })
  }, [coords, placeMarker, reverseGeocode])

  // Run initMap when showMap becomes true — handles both first open and re-open
  useEffect(() => {
    if (!showMap) return

    // If Leaflet is already available, init immediately
    if (window.L) {
      // Small rAF to ensure the DOM node is rendered
      requestAnimationFrame(initMap)
      return
    }

    // Otherwise wait for the script onload event
    const script = document.getElementById('leaflet-js')
    if (script) {
      const onLoad = () => requestAnimationFrame(initMap)
      script.addEventListener('load', onLoad)
      return () => script.removeEventListener('load', onLoad)
    }
  }, [showMap, initMap])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leafletMap.current?.remove()
      leafletMap.current = null
      markerRef.current  = null
    }
  }, [])

  // Sync external coord updates into map (e.g. prop re-sync)
  useEffect(() => {
    if (!leafletMap.current || !coords) return
    leafletMap.current.setView([coords.lat, coords.lng], 16)
    placeMarker(leafletMap.current, coords.lat, coords.lng)
  }, [coords, placeMarker])

  const hasCoords = !!(coords?.lat && coords?.lng)

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Search input */}
      <div className="relative">
        <div className="relative">
          <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={handleInput}
            placeholder={t('contacts.addressSearch')}
            className="input pl-9 pr-9"
            autoComplete="off"
          />
          {loading && (
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          )}
          {query && !loading && (
            <button
              type="button"
              onClick={() => {
                initialised.current = true
                setQuery('')
                setResults([])
                setCoords(null)
                onChange?.({})
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <Icons.close className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Autocomplete dropdown */}
        {results.length > 0 && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto divide-y divide-gray-50">
            {results.map((r) => (
              <button
                key={r.place_id}
                type="button"
                onClick={() => selectResult(r)}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-800 line-clamp-1">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Coordinates + map toggle */}
      <div className="flex items-center gap-2">
        {hasCoords && (
          <span className="text-xs text-gray-400 font-mono">
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </span>
        )}
        <button
          type="button"
          onClick={() => setShowMap(v => !v)}
          className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium ml-auto"
        >
          <span>🗺️</span>
          {showMap ? t('contacts.hideMap') : t('contacts.showMap')}
        </button>
      </div>

      {/* Leaflet map */}
      {showMap && (
        <>
          <LeafletLoader onReady={initMap} />
          <div
            ref={mapRef}
            className="w-full rounded-xl border border-gray-200 overflow-hidden"
            style={{ height: 260, isolation: 'isolate', position: 'relative', zIndex: 0 }}
          />
          <p className="text-xs text-gray-400">{t('contacts.mapHint')}</p>
        </>
      )}
    </div>
  )
}

// Load Leaflet CSS+JS from CDN once; calls onReady when JS is loaded
function LeafletLoader({ onReady }) {
  useEffect(() => {
    // CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id   = 'leaflet-css'
      link.rel  = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    // JS — if already loaded, fire onReady immediately
    if (window.L) {
      onReady?.()
      return
    }

    let script = document.getElementById('leaflet-js')
    if (!script) {
      script = document.createElement('script')
      script.id  = 'leaflet-js'
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      document.head.appendChild(script)
    }

    const handler = () => onReady?.()
    script.addEventListener('load', handler)
    return () => script.removeEventListener('load', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
