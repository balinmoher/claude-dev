import { useState, useEffect } from 'react'
import { getAISettings, saveAISettings } from '../ai'
import type { AISettings } from '../types'

const DEFAULTS: Record<string, { model: string; baseUrl: string }> = {
  anthropic: { model: 'claude-sonnet-4-5-20250929', baseUrl: 'https://api.anthropic.com' },
  openai: { model: 'gpt-4o-mini', baseUrl: 'https://api.openai.com' },
}

function SettingsPage() {
  const [provider, setProvider] = useState<'anthropic' | 'openai'>('anthropic')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(DEFAULTS.anthropic.model)
  const [baseUrl, setBaseUrl] = useState('')
  const [toast, setToast] = useState('')
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    const s = getAISettings()
    if (s) {
      setProvider(s.provider)
      setApiKey(s.apiKey)
      setModel(s.model)
      setBaseUrl(s.baseUrl || '')
    }
  }, [])

  const handleProviderChange = (p: 'anthropic' | 'openai') => {
    setProvider(p)
    setModel(DEFAULTS[p].model)
    setBaseUrl('')
  }

  const handleSave = () => {
    const settings: AISettings = {
      provider,
      apiKey,
      model: model || DEFAULTS[provider].model,
      baseUrl: baseUrl || undefined,
    }
    saveAISettings(settings)
    setToast('Settings saved!')
    setTimeout(() => setToast(''), 2000)
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const settings: AISettings = {
        provider,
        apiKey,
        model: model || DEFAULTS[provider].model,
        baseUrl: baseUrl || undefined,
      }
      saveAISettings(settings)

      // Make a minimal test call
      if (provider === 'anthropic') {
        const url = (settings.baseUrl || DEFAULTS.anthropic.baseUrl).replace(/\/$/, '')
        const res = await fetch(`${url}/v1/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: settings.model,
            max_tokens: 16,
            messages: [{ role: 'user', content: 'Say "ok"' }],
          }),
        })
        if (!res.ok) {
          const err = await res.text()
          throw new Error(`${res.status}: ${err}`)
        }
      } else {
        const url = (settings.baseUrl || DEFAULTS.openai.baseUrl).replace(/\/$/, '')
        const res = await fetch(`${url}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: settings.model,
            max_tokens: 16,
            messages: [{ role: 'user', content: 'Say "ok"' }],
          }),
        })
        if (!res.ok) {
          const err = await res.text()
          throw new Error(`${res.status}: ${err}`)
        }
      }

      setToast('Connection successful!')
    } catch (e) {
      setToast(`Failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally {
      setTesting(false)
      setTimeout(() => setToast(''), 4000)
    }
  }

  return (
    <div className="page">
      <h1>Settings</h1>

      <div className="card">
        <h2>AI Provider</h2>
        <div className="provider-tabs">
          <button
            className={`provider-tab ${provider === 'anthropic' ? 'active' : ''}`}
            onClick={() => handleProviderChange('anthropic')}
          >
            Anthropic
          </button>
          <button
            className={`provider-tab ${provider === 'openai' ? 'active' : ''}`}
            onClick={() => handleProviderChange('openai')}
          >
            OpenAI
          </button>
        </div>
      </div>

      <div className="card">
        <h2>API Key</h2>
        <input
          type="password"
          placeholder={provider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <p className="settings-hint">
          Your key is stored only on this device in localStorage. It never leaves your browser except to call the AI API directly.
        </p>
      </div>

      <div className="card">
        <h2>Model</h2>
        <input
          type="text"
          placeholder={DEFAULTS[provider].model}
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
      </div>

      <div className="card">
        <h2>Base URL (optional)</h2>
        <input
          type="text"
          placeholder={DEFAULTS[provider].baseUrl}
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
        />
        <p className="settings-hint">
          Override for custom endpoints (e.g. OpenRouter, local Ollama). Leave blank for default.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn-primary"
          onClick={handleSave}
          style={{ flex: 1, padding: 14, fontSize: '1rem' }}
        >
          Save
        </button>
        <button
          className="btn-secondary"
          onClick={handleTest}
          disabled={!apiKey || testing}
          style={{ flex: 1, padding: 14, fontSize: '1rem' }}
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
      </div>

      {toast && <div className={`toast ${toast.startsWith('Failed') ? 'toast-error' : ''}`}>{toast}</div>}
    </div>
  )
}

export default SettingsPage
