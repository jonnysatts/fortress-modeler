import React from 'react';

export default function SimpleAuthCallback() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Auth Callback Page</h1>
      <p>This is the OAuth callback page!</p>
      <p>URL: {window.location.href}</p>
      <p>Hash: {window.location.hash}</p>
    </div>
  );
}