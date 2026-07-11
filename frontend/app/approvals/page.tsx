"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/useAuth";
import Sidebar from "../components/Sidebar";

const TASK_STATUS_COLOR: Record<string, string> = {
  approved: "#16a34a", rejected: "#dc2626", pending: "#eab308",
};

export default function ApprovalsPage() {
  const { role } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [decidingTaskId, setDecidingTaskId] = useState<string | null>(null);

  async function load() {
    if (!role) return;
    setLoading(true);
    const data = await api.approvalsForRole(role);
    setItems(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [role]);

  async function handleDecideTask(employeeId: string, taskId: string, status: "approved" | "rejected") {
    setDecidingTaskId(taskId);
    try {
      await api.decideTask(employeeId, taskId, status);
      await load();
    } finally {
      setDecidingTaskId(null);
    }
  }

  return (
    <Sidebar>
      <main style={{ padding: 32, flex: 1, maxWidth: 800 }}>
        <h1>Approval Dashboard</h1>
        <p style={{ color: "#666", fontSize: 13 }}>
          Showing items for your role: <strong>{role}</strong> — approve or reject each task individually.
        </p>

        {loading && <p>Loading...</p>}
        {!loading && items.length === 0 && <p>Nothing pending for {role}.</p>}

        {!loading && items.map((item) => (
          <div key={`${item.employee_id}-${item.workflow_type}`} style={{ border: "1px solid #eee", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{item.employee_name}</div>
                <div style={{ fontSize: 13, color: "#666" }}>
                  {item.department} · {item.role || "Unclassified"}
                  {item.experience_level && ` · ${item.experience_level}`} · {item.workflow_type}
                </div>
              </div>
            </div>

            {/* Onboarding: per-task approve/reject */}
            {item.workflow_type === "onboarding" && item.tasks.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {item.tasks.map((t: any, idx: number) => (
                  <div key={idx} style={{ background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 6, padding: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        {t.task_name}
                        {!t.is_mandatory && <span style={{ fontSize: 11, color: "#999", marginLeft: 6 }}>(optional)</span>}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: TASK_STATUS_COLOR[t.status] }}>{t.status}</div>
                    </div>
                    {t.ai_recommendation && (
                      <div style={{ fontSize: 13, color: "#666", marginTop: 4, fontStyle: "italic" }}>
                        {t.is_ai_generated ? "🤖 " : ""}{t.ai_recommendation}
                      </div>
                    )}
                    {t.status === "pending" && (
                      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                        <button
                          onClick={() => handleDecideTask(item.employee_id, t.id, "approved")}
                          disabled={decidingTaskId === t.id}
                          style={{ fontSize: 12, padding: "3px 10px" }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleDecideTask(item.employee_id, t.id, "rejected")}
                          disabled={decidingTaskId === t.id}
                          style={{ fontSize: 12, padding: "3px 10px" }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Offboarding: unchanged track-level approval */}
            {item.workflow_type === "offboarding" && (
              <div style={{ marginTop: 8, fontSize: 13, color: "#666" }}>
                Offboarding approval status: <strong>{item.approval_status}</strong>
              </div>
            )}
          </div>
        ))}
      </main>
    </Sidebar>
  );
}
