"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/useAuth";

export default function DirectoryPage() {
  const { role, logout } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    setEmployees(await api.listEmployees());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSync() {
    setSyncing(true);
    try {
      await api.syncHrmsNewHires();
      await load();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <main style={{ padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Employee Directory</h1>
        <div>Logged in as {role} <button onClick={logout}>Log out</button></div>
      </div>

      <button onClick={handleSync} disabled={syncing}>
        {syncing ? "Syncing..." : "Sync from HRMS"}
      </button>
      <table style={{ marginTop: 16, borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th align="left">Name</th><th align="left">Department</th>
            <th align="left">Role</th><th align="left">Status</th><th align="left">Source</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((e) => (
            <tr key={e.id}>
              <td>{e.name}</td><td>{e.department}</td>
              <td>{e.role || "—"}</td><td>{e.status}</td><td>{e.sync_source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}