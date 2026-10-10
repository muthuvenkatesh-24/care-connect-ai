import { useEffect, useState } from 'react'

type HealthResponse = { status: string }

export default function App() {
  const [health, setHealth] = useState('Checking...')

  useEffect(() => {
    fetch('/api/health')
      .then((response) => {
        if (!response.ok) throw new Error('Health request failed')
        return response.json() as Promise<HealthResponse>
      })
      .then((result) => setHealth(result.status))
      .catch(() => setHealth('Unavailable'))
  }, [])

  return (
    <main>
      <h1>Care Connect AI</h1>
      <p>Frontend is connected to the API.</p>
      <p>API health: <strong>{health}</strong></p>
    </main>
  )
}
