import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

console.log('URL:', import.meta.env.VITE_SUPABASE_URL);


interface Claim {
  id: number;
  policy_number: string;
  first_name: string;
  last_name: string;
}

export function App() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from<Claim>('claims').select('*', {});
      if (error) console.error(error);
      else setClaims(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
      <h1>Harbor Lite Claims</h1>
      {loading ? (
        <p>Loading claims...</p>
      ) : (
        <table border={1} cellPadding={8} style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Policy Number</th>
              <th>First Name</th>
              <th>Last Name</th>
            </tr>
          </thead>
          <tbody>
            {claims.map(c => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.policy_number}</td>
                <td>{c.first_name}</td>
                <td>{c.last_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}