import React, { useEffect, useState } from 'react'
import { auth, db } from './firebase'
import { signInAnonymously } from 'firebase/auth'
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api'

export default function App() {
  const [alerts, setAlerts] = useState([])
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('crime')
  const [location, setLocation] = useState(null)
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    signInAnonymously(auth).catch(console.error)

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn('Geolocation error', err),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }

    const q = query(collection(db, 'alerts'), orderBy('timestamp','desc'))
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setAlerts(docs)
    })
    return () => unsub()
  }, [])

  async function postAlert() {
    if (!description || !location) return
    setPosting(true)
    try {
      await addDoc(collection(db, 'alerts'), {
        description,
        category,
        location,
        timestamp: serverTimestamp()
      })
      setDescription('')
    } catch (e) {
      alert('Failed to post alert: ' + e.message)
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Guardian SA – Safety Alerts</h1>
      </header>

      <section className="composer">
        <select value={category} onChange={(e)=>setCategory(e.target.value)}>
          <option value="crime">Crime</option>
          <option value="traffic">Traffic</option>
          <option value="strike">Strike/Unrest</option>
          <option value="loadshedding">Load Shedding</option>
          <option value="other">Other</option>
        </select>
        <input
          placeholder="Describe the incident (what, where, when)"
          value={description}
          onChange={(e)=>setDescription(e.target.value)}
        />
        <button onClick={postAlert} disabled={!description || !location || posting}>
          {posting ? 'Posting…' : 'Post Alert'}
        </button>
      </section>

      <section className="map">
        {location && (
          <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={location}
              zoom={13}
              options={{ streetViewControl:false, mapTypeControl:false }}
            >
              {alerts.map(a => (
                a.location?.lat && a.location?.lng ?
                <Marker key={a.id} position={{lat: a.location.lat, lng: a.location.lng}} /> : null
              ))}
            </GoogleMap>
          </LoadScript>
        )}
      </section>

      <section className="feed">
        <h2>Recent Alerts</h2>
        <ul>
          {alerts.map(a => {
            const ts = a.timestamp?.seconds ? new Date(a.timestamp.seconds*1000) : new Date()
            return (
              <li key={a.id} className={`card ${a.category}`}>
                <div className="meta">
                  <span className={`badge ${a.category}`}>{a.category}</span>
                  <time>{ts.toLocaleString()}</time>
                </div>
                <p>{a.description}</p>
                {a.location?.lat && a.location?.lng && (
                  <small>({a.location.lat.toFixed(4)}, {a.location.lng.toFixed(4)})</small>
                )}
              </li>
            )
          })}
        </ul>
      </section>
      <footer className="footer">Built for South Africa • MVP v0.1</footer>
    </div>
  )
}