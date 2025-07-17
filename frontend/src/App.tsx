import React, { useState, useEffect, useRef } from 'react';
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
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

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

  // Audio recording handlers
  const startRecording = async () => {
    setAudioUrl(null);
    audioChunks.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new window.MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
        // TODO: send blob to Eleven Labs
      };
      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      alert('Could not start audio recording.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="app-bg">
      <header className="header">
        <img src={harborLogo} alt="Harbor Claims Management Logo" className="logo-img" />
        <span className="app-title">Harbor Claims Management</span>
      </header>
      <main className="card claims-card">
        <button
          className="voice-agent-btn"
          onClick={recording ? stopRecording : startRecording}
          style={{
            background: recording ? '#f59e42' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '0.7em 1.5em',
            fontSize: '1.1em',
            fontWeight: 600,
            marginBottom: '1.5rem',
            cursor: 'pointer',
            boxShadow: recording ? '0 0 0 2px #fbbf24' : '0 2px 8px rgba(16,24,40,0.10)',
            transition: 'background 0.2s',
          }}
        >
          {recording ? 'Stop Recording' : 'Talk to Agent'}
        </button>
        {recording && <div style={{ color: '#fbbf24', marginBottom: 12 }}>Recording... Please describe your accident.</div>}
        {audioUrl && (
          <audio controls src={audioUrl} style={{ marginBottom: 16, width: '100%' }} />
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