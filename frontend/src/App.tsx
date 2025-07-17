import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import './App.css';
import harborLogo from './assets/harbor-logo.svg';

console.log('URL:', import.meta.env.VITE_SUPABASE_URL);


interface Claim {
  id: number;
  policy_number: string;
  first_name: string;
  last_name: string;
  status?: boolean;
  date?: string;
}

export function App() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [input, setInput] = useState("");
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const audioBufferRef = useRef<ArrayBuffer[]>([]);
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('claims').select('*');
      if (error) console.error(error);
      else setClaims(data || []);
      setLoading(false);
    })();
  }, []);

  // Sort claims by date
  const sortedClaims = [...claims].sort((a, b) => {
    if (!a.date || !b.date) return 0;
    if (sortOrder === 'desc') {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    } else {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
  });

  // WebSocket handlers for text-to-speech chat
  const startSession = () => {
    console.log('Attempting to start WebSocket session...');
    const wsUrl = 'ws://localhost:8000/ws/voice-agent';
    console.log('WebSocket URL:', wsUrl);
    const socket = new window.WebSocket(wsUrl);
    setWs(socket);
    socket.binaryType = 'arraybuffer';
    socket.onopen = () => {
      console.log('WebSocket connection opened');
      setConnected(true);
    };
    socket.onclose = () => {
      console.log('WebSocket connection closed');
      setConnected(false);
    };
    socket.onerror = (e) => {
      console.error('WebSocket error', e);
      setConnected(false);
    };
    socket.onmessage = (event) => {
      console.log('Received message from backend', event);
      if (typeof event.data !== 'string') {
        setAgentSpeaking(true);
        audioBufferRef.current.push(event.data);
        // Reset the timeout each time a chunk arrives
        if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
        playTimeoutRef.current = setTimeout(() => {
          // Play the buffered audio as a single blob
          const audioBlob = new Blob(audioBufferRef.current, { type: 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audio.play();
          setAgentSpeaking(false);
          audioBufferRef.current = [];
        }, 300); // Wait 300ms after last chunk to play
      }
    };
  };

  const endSession = () => {
    ws?.close();
    setConnected(false);
  };

  const sendMessage = () => {
    if (ws && connected && input.trim()) {
      ws.send(input.trim());
      setInput("");
    }
  };

  return (
    <div className="app-bg">
      <header className="header">
        <img src={harborLogo} alt="Harbor Claims Management Logo" className="logo-img" />
        <span className="app-title">Harbor Claims Management</span>
      </header>
      <main className="card claims-card">
        {!connected ? (
          <button
            className="voice-agent-btn"
            onClick={startSession}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '0.7em 1.5em',
              fontSize: '1.1em',
              fontWeight: 600,
              marginBottom: '1.5rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16,24,40,0.10)',
              transition: 'background 0.2s',
            }}
          >
            Talk to Agent
          </button>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, width: '100%' }}>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                placeholder="Type your message..."
                style={{ flex: 1, padding: '0.7em', borderRadius: 8, border: '1px solid #334155', fontSize: '1.1em' }}
                disabled={!connected}
              />
              <button
                onClick={sendMessage}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0.7em 1.2em',
                  fontSize: '1.1em',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                disabled={!connected || !input.trim()}
              >
                Send
              </button>
              <button
                onClick={endSession}
                style={{
                  background: '#f59e42',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0.7em 1.2em',
                  fontSize: '1.1em',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                End
              </button>
            </div>
            {agentSpeaking && <div style={{ color: '#38bdf8', marginBottom: 12 }}>Agent is responding...</div>}
          </>
        )}
        <h2 className="claims-title">Claims Log</h2>
        {loading ? (
          <p className="loading">Loading claims...</p>
        ) : (
          <div className="table-container">
            <table className="claims-table">
              <thead>
                <tr>
                  <th style={{ whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Date
                      <button
                        className="sort-arrow-btn"
                        aria-label={sortOrder === 'desc' ? 'Sort by oldest' : 'Sort by most recent'}
                        onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          marginLeft: 4,
                          cursor: 'pointer',
                          color: '#e0e7ef',
                          fontSize: '1.1em',
                          lineHeight: 1,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {sortOrder === 'desc' ? (
                          <span style={{ display: 'inline-block', transform: 'translateY(1px)' }}>▼</span>
                        ) : (
                          <span style={{ display: 'inline-block', transform: 'translateY(-1px)' }}>▲</span>
                        )}
                      </button>
                    </span>
                  </th>
                  <th>Policy Number</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedClaims.map(c => (
                  <tr key={c.id}>
                    <td>{c.date ? new Date(c.date).toLocaleDateString() : ''}</td>
                    <td>{c.policy_number}</td>
                    <td>{c.first_name}</td>
                    <td>{c.last_name}</td>
                    <td>{
                      typeof c.status === 'boolean' ? (
                        <span className={`status-bubble ${c.status ? 'status-approved' : 'status-pending'}`}>
                          {c.status ? 'Approved' : 'Pending'}
                        </span>
                      ) : ''
                    }</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}