/**
 * ApiKeysPanel — Phase 4
 * Lets the user store API keys for cloud AI services.
 * Keys are saved in electron-store (local, encrypted-at-rest by OS keychain-like storage).
 * Services supported: OpenAI (Whisper API + GPT), Anthropic (Claude), Google (Gemini)
 */
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';

interface ApiKey {
  id: 'openai' | 'anthropic' | 'google';
  label: string;
  placeholder: string;
  hint: string;
  docsUrl: string;
  color: string;
}

const SERVICES: ApiKey[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    placeholder: 'sk-…',
    hint: 'Used for faster Whisper transcription (cloud) and GPT analysis',
    docsUrl: 'https://platform.openai.com/api-keys',
    color: '#10b981',
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    placeholder: 'sk-ant-…',
    hint: 'Used for smart clip descriptions and content analysis',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    color: '#f59e0b',
  },
  {
    id: 'google',
    label: 'Google (Gemini)',
    placeholder: 'AIza…',
    hint: 'Used for multimodal video understanding',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    color: '#4285f4',
  },
];

function useApiKeys() {
  const load = useCallback(async (id: string) => (await window.electron.getApiKey(id)) ?? '', []);
  const save = useCallback(async (id: string, val: string) => { await window.electron.setApiKey(id, val.trim()); }, []);
  return { load, save };
}

export default function ApiKeysPanel() {
  const { load, save } = useApiKeys();
  const [values, setValues] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadAll() {
      const initial: Record<string, string> = {};
      await Promise.all(SERVICES.map(async (s) => { initial[s.id] = await load(s.id); }));
      setValues(initial);
    }
    loadAll();
  }, [load]);

  const handleChange = useCallback((id: string, val: string) => {
    setValues((prev) => ({ ...prev, [id]: val }));
    setSaved((prev) => ({ ...prev, [id]: false }));
  }, []);

  const handleSave = useCallback(async (id: string) => {
    await save(id, values[id] ?? '');
    setSaved((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => setSaved((prev) => ({ ...prev, [id]: false })), 2000);
  }, [values, save]);

  const handleClear = useCallback(async (id: string) => {
    await save(id, '');
    setValues((prev) => ({ ...prev, [id]: '' }));
  }, [save]);

  const openUrl = useCallback((url: string) => {
    window.require('electron').shell.openExternal(url);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px' }}
    >
      {/* Header */}
      <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
        🔑 API Keys
      </div>
      <div style={{ fontSize: 11, color: 'rgba(100,116,139,0.8)', lineHeight: 1.6, marginBottom: 4 }}>
        Optional — local AI tools work without keys. Keys unlock faster cloud transcription and smarter analysis.
      </div>

      {SERVICES.map((svc) => {
        const val = values[svc.id] ?? '';
        const show = visible[svc.id] ?? false;
        const isSaved = saved[svc.id] ?? false;
        const hasKey = val.length > 4;

        return (
          <div key={svc.id} style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${hasKey ? `${svc.color}33` : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 8,
            transition: 'border-color 0.2s',
          }}>
            {/* Service header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: hasKey ? svc.color : 'rgba(100,116,139,0.4)',
                boxShadow: hasKey ? `0 0 6px ${svc.color}80` : 'none',
                transition: 'background 0.2s, box-shadow 0.2s',
              }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', flex: 1 }}>{svc.label}</span>
              <button
                type="button"
                onClick={() => openUrl(svc.docsUrl)}
                style={{ background: 'none', border: 'none', fontSize: 10.5, color: `${svc.color}cc`, cursor: 'pointer', padding: 0 }}
              >
                Get key ↗
              </button>
            </div>

            {/* Key input */}
            <div style={{
              display: 'flex', gap: 5, alignItems: 'center',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '5px 8px',
            }}>
              <input
                type={show ? 'text' : 'password'}
                value={val}
                onChange={(e) => handleChange(svc.id, e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(svc.id); }}
                placeholder={svc.placeholder}
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 12, caretColor: svc.color, fontFamily: 'monospace' }}
              />
              <button
                type="button"
                onClick={() => setVisible((v) => ({ ...v, [svc.id]: !v[svc.id] }))}
                style={{ background: 'none', border: 'none', fontSize: 12, cursor: 'pointer', color: 'rgba(148,163,184,0.5)', padding: '0 2px' }}
              >
                {show ? '🙈' : '👁'}
              </button>
            </div>

            {/* Hint */}
            <div style={{ fontSize: 10.5, color: 'rgba(100,116,139,0.7)', lineHeight: 1.4 }}>{svc.hint}</div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => void handleSave(svc.id)}
                style={{
                  flex: 1, padding: '5px 0', borderRadius: 7,
                  background: isSaved ? `${svc.color}22` : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${isSaved ? `${svc.color}60` : 'rgba(255,255,255,0.1)'}`,
                  color: isSaved ? svc.color : 'rgba(148,163,184,0.8)',
                  fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {isSaved ? '✓ Saved' : 'Save'}
              </button>
              {hasKey && (
                <button
                  type="button"
                  onClick={() => void handleClear(svc.id)}
                  style={{
                    padding: '5px 10px', borderRadius: 7,
                    background: 'none', border: '1px solid rgba(248,113,113,0.2)',
                    color: 'rgba(248,113,113,0.6)', fontSize: 11, cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Privacy note */}
      <div style={{ fontSize: 10, color: 'rgba(100,116,139,0.55)', lineHeight: 1.5, marginTop: 4 }}>
        🔒 Keys are stored locally on your machine and never sent to our servers.
        They are only used when you explicitly trigger a cloud operation.
      </div>
    </motion.div>
  );
}
