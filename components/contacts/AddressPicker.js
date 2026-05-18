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
  const [query, setQuery]         = useState(value.address || '')
  const [results, setResults]     = useState([])
  const [loading, setLoading]     = useState(false)
  const [showMap, setShowMap]     = useState(false)
  const [coords, setCoords]       = useState(
    value.lat && value.lng ? { lat: value.lat, lng: value.lng } : null
  )
  const mapRef      = useRef(null)   // DOM node
  const leafletMap  = useRef(null)   // Leaflet map instance
  const markerRef   = useRef(null)   // Leaflet marker instance
  const debounceRef = useRef(null)

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
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(v), 350)
  }

  // ── Select a Nominatim result ─────────────────────────────────────────────
  const selectResult = (r) => {
    const a = r.address || {}
    const address  = [a.road, a.house_number].filter(Boolean).join(' ')
    const city     = a.city || a.town || a.village || a.municipality || ''
    const state    = a.state || a.region || ''
    const country  = a.country || ''
    const postalCode = a.postcode || ''
    const lat = parseFloat(r.lat)
    const lng = parseFloat(r.lon)

    setQuery(r.display_name)
    setResults([])
    setCoords({ lat, lng })
    onChange?.({ address, city, state, country, postalCode, lat, lng })

    // If map is open, pan to new coords
    if (leafletMap.current) {
      leafletMap.current.setView([lat, lng], 16)
      markerRef.current?.setLatLng([lat, lng])
    }
  }

  // ── Leaflet map init ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!showMap || !mapRef.current) return
    if (leafletMap.current) return // already initialised

    const L = window.L
    if (!L) { console.error('Leaflet not loaded'); return }

    const center = coords ? [coords.lat, coords.lng] : [23.6345, -102.5528] // Mexico center
    const zoom   = coords ? 16 : 5

    const map = L.map(mapRef.current, { zoomControl: true }).setView(center, zoom)
    leafletMap.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    // Custom pin icon using emoji (no image files needed)
    const icon = L.divIcon({
      html: '<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.4))">📍</div>',
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    })

    const marker = coords
      ? L.marker([coords.lat, coords.lng], { icon, draggable: true }).addTo(map)
      : null

    if (marker) {
      markerRef.current = marker
      marker.on('dragend', async () => {
        const { lat, lng } = marker.getLatLng()
        setCoords({ lat, lng })
        // Reverse geocode
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lng}`,
            { headers: { 'Accept-Language': 'es' } }
          )
          const data = await r.json()
          const a = data.address || {}
          const address  = [a.road, a.house_number].filter(Boolean).join(' ')
          const city     = a.city || a.town || a.village || a.municipality || ''
          const state    = a.state || a.region || ''
          const country  = a.country || ''
          const postalCode = a.postcode || ''
          setQuery(data.display_name || '')
          onChange?.({ address, city, state, country, postalCode, lat, lng })
        } catch (e) {
          onChange?.({ ...value, lat, lng })
        }
      })
    }

    // Click on map to place/move marker
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng
      setCoords({ lat, lng })
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(map)
        markerRef.current.on('dragend', async () => {
          const pos = markerRef.current.getLatLng()
          await reverseGeocode(pos.lat, pos.lng)
        })
      }
      // Reverse geocode the clicked point
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lng}`,
          { headers: { 'Accept-Language': 'es' } }
        )
        const data = await r.json()
        const a = data.address || {}
        const address  = [a.road, a.house_number].filter(Boolean).join(' ')
        const city     = a.city || a.town || a.village || a.municipality || ''
        const state    = a.state || a.region || ''
        const country  = a.country || ''
        const postalCode = a.postcode || ''
        setQuery(data.display_name || '')
        onChange?.({ address, city, state, country, postalCode, lat, lng })
      } catch (e) {
        onChange?.({ ...value, lat, lng })
      }
    })

    return () => {
      map.remove()
      leafletMap.current = null
      markerRef.current  = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMap])

  // Sync external coords change into map
  useEffect(() => {
    if (!leafletMap.current || !coords) return
    leafletMap.current.setView([coords.lat, coords.lng], 16)
    markerRef.current?.setLatLng([coords.lat, coords.lng])
  }, [coords])

  const hasCoords = coords?.lat && coords?.lng

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
              onClick={() => { setQuery(''); setResults([]); setCoords(null); onChange?.({}) }}
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

      {/* Leaflet map — lazy-loaded */}
      {showMap && (
        <>
          {/* Load Leaflet CSS + JS from CDN once */}
          <LeafletLoader />
          <div
            ref={mapRef}
            className="w-full rounded-xl border border-gray-200 overflow-hidden"
            style={{ height: 260 }}
          />
          <p className="text-xs text-gray-400">{t('contacts.mapHint')}</p>
        </>
      )}
    </div>
  )
}

// Load Leaflet CSS+JS from CDN once per page
function LeafletLoader() {
  useEffect(() => {
    if (document.getElementById('leaflet-css')) return
    const link = document.createElement('link')
    link.id   = 'leaflet-css'
    link.rel  = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.id  = 'leaflet-js'
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    document.head.appendChild(script)
  }, [])
  return null
}
