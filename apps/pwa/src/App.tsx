import { useEffect, useState } from 'react'
import type { AlertBundle } from '@ligtas/core'
import { evaluateBundle, type EvaluatedAlert } from './lib/evaluateBundle'
import { instructionFor, purokBitSet, severityLabel } from './lib/instructions'
import { usePersistedPurok } from './usePersistedPurok'

const OUTCOME_LABEL: Record<EvaluatedAlert['outcome'], string> = {
  accepted: 'Verified',
  rejected_signature: 'Rejected — bad signature',
  rejected_unknown_issuer: 'Rejected — unknown issuer',
  rejected_replay: 'Rejected — replay',
  duplicate: 'Duplicate (already seen)',
}

function App() {
  const { purok, setPurok, clearPurok } = usePersistedPurok()
  const [bundle, setBundle] = useState<AlertBundle | null>(null)
  const [alerts, setAlerts] = useState<EvaluatedAlert[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/alert-bundle.json')
      .then((r) => {
        if (!r.ok) throw new Error(`fetch failed: ${r.status}`)
        return r.json() as Promise<AlertBundle>
      })
      .then(async (b) => {
        const evaluated = await evaluateBundle(b)
        if (!cancelled) {
          setBundle(b)
          setAlerts(evaluated)
        }
      })
      .catch((e) => !cancelled && setError(String(e)))
    return () => {
      cancelled = true
    }
  }, [])

  if (purok === null) return <PurokPicker onSelect={setPurok} />

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">LIGTAS</h1>
        <button onClick={clearPurok} className="text-sm text-slate-400 underline">
          Purok {purok} · change
        </button>
      </header>

      {error && <p className="text-red-400">Failed to load alerts: {error}</p>}
      {!error && !alerts && <p className="text-slate-400">Loading alerts…</p>}

      {bundle?.source === 'captured' && (
        <p className="mb-4 rounded bg-amber-900/40 border border-amber-700 p-2 text-xs text-amber-200">
          Demo data, not a live hub. {bundle.captureNote}
        </p>
      )}

      {alerts && <AlertList alerts={alerts} purok={purok} />}
    </div>
  )
}

function PurokPicker({ onSelect }: { onSelect: (p: number) => void }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-bold mb-1">LIGTAS</h1>
        <p className="text-slate-400 mb-4 text-sm">Select your purok to see evacuation instructions for your area.</p>
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => onSelect(p)}
              className="aspect-square rounded bg-slate-800 hover:bg-slate-700 font-semibold"
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function AlertList({ alerts, purok }: { alerts: EvaluatedAlert[]; purok: number }) {
  const accepted = alerts.filter((a) => a.outcome === 'accepted' && a.body)
  const relevant = accepted.filter((a) => purokBitSet(a.body!.purokBitmap, purok))
  const latest = relevant.at(-1)

  return (
    <>
      {latest ? (
        <InstructionCard alert={latest} />
      ) : accepted.length > 0 ? (
        <div className="rounded bg-slate-900 border border-slate-800 p-4 mb-6">
          <p className="text-slate-300">Your purok is not affected by any current alert.</p>
        </div>
      ) : (
        <div className="rounded bg-slate-900 border border-slate-800 p-4 mb-6">
          <p className="text-slate-300">No alerts.</p>
        </div>
      )}

      <h2 className="text-sm font-semibold text-slate-400 mb-2">All alerts (verification log)</h2>
      <ul className="space-y-1">
        {alerts.map((a) => (
          <li
            key={a.index}
            className={`rounded border p-2 text-xs ${
              a.outcome === 'accepted' ? 'border-emerald-800 bg-emerald-950/40' : 'border-slate-800 bg-slate-900'
            }`}
          >
            <span className="font-mono">{OUTCOME_LABEL[a.outcome]}</span>
            {a.body && (
              <span className="text-slate-400">
                {' '}
                — {severityLabel(a.body.severity)}, puroks bitmap {a.body.purokBitmap.toString(2).padStart(8, '0')}
              </span>
            )}
            {a.demoLabel && <span className="text-slate-500"> ({a.demoLabel})</span>}
          </li>
        ))}
      </ul>
    </>
  )
}

function InstructionCard({ alert }: { alert: EvaluatedAlert }) {
  const body = alert.body!
  return (
    <div className="rounded-lg bg-red-900/60 border border-red-700 p-4 mb-6">
      <p className="text-xs uppercase tracking-wide text-red-300 mb-1">{severityLabel(body.severity)} alert</p>
      <p className="text-lg font-semibold">{instructionFor(body)}</p>
    </div>
  )
}

export default App
