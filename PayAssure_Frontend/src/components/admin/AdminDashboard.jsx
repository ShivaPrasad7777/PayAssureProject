// src/components/insurers/InsurerDashboard.jsx
import React from 'react';

export default function InsurerDashboard({ user }) {
  return (
    <div>
      <h2>Insurer Dashboard</h2>
      <p>Welcome, {user?.name || "Insurer"}.</p>
      <p>Email: {user?.email}</p>
      <p>ID: {user?.id}</p>
      <p>Role: {user?.role}</p>
      {/* You can access any user field passed from backend */}
    </div>
  );
}
