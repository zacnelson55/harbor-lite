import React, { useState, useEffect } from 'react';
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
}

export function App() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('claims').select('*');
      if (error) console.error(error);
      else setClaims(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="app-bg">
      <header className="header">
        <img src={harborLogo} alt="Harbor Claims Management Logo" className="logo-img" />
        <span className="app-title">Harbor Claims Management</span>
      </header>
      <main className="card claims-card">
        <h2 className="claims-title">Claims Log</h2>
        {loading ? (
          <p className="loading">Loading claims...</p>
        ) : (
          <div className="table-container">
            <table className="claims-table">
              <thead>
                <tr>
                  {/* <th>ID</th> */}
                  <th>Policy Number</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {claims.map(c => (
                  <tr key={c.id}>
                    {/* <td>{c.id}</td> */}
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