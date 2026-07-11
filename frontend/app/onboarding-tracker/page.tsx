"use client";
import { useEffect, useState, useRef } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/useAuth";
import Sidebar from "../components/Sidebar";

const STATUS_COLOR: Record<string, string> = {
  completed: "#16a34a", running: "#eab308", waiting: "#9ca3af",
  failed: "#dc2626", blocked: "#f97316",
};
const STATUS_LABEL: Record<string, string> = {
  completed: "Completed", running: "Running", waiting: "Waiting",
  failed: "Failed", blocked: "Blocked — awaiting employee documents",
};
const TASK_STATUS_ICON: Record<string, string> = {
  approved: "✅", rejected: "❌", pending: "⬜",
};
const TRACK_STATUS_COLOR: Record<string, string> = {
  completed: "#16a34a", in_progress: "#eab308", blocked: "#dc2626", not_started: "#9ca3af",
};

const TRACK_STEPS = ["HR Track", "IT Track", "Security Track", "Manager Track"];
const STEP_TO_TRACK: Record<string, string> = {
  "HR Track": "HR", "IT Track": "IT", "Security Track": "Security", "Manager Track": "Manager",
};

const POLL_INTERVAL_MS = 3000;

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString();
}

export default function OnboardingTrackerPage() {
  useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [rawSteps, setRawSteps] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [documentInfo, setDocumentInfo] = useState<any>(null);
  const [tasksByTrack, setTasksByTrack] = useState<any>({});
  const [trackStatus, setTrackStatus] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [resuming, setResuming] = useState(false);
  const pollRef = useRef<any>(null);

  useEffect(() => {
    loadEmployees();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function loadEmployees() {
    const all = await api.listEmployees();
    const relevant = all.filter((e: any) =>
      e.status === "onboarding" || e.status === "active" || e.status === "documents_pending"
    );
    setEmployees(relevant);
    if (relevant.length && !selectedId) setSelectedId(relevant[0].id);
  }

  useEffect(() => {
    if (!selectedId) return;
    loadTrackerData(true);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => loadTrackerData(false), POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedId]);

  async function loadTrackerData(showLoading: boolean) {
    if (showLoading) { setLoading(true); setExpandedStep(null); }
    const [steps, audit, docs, taskData] = await Promise.all([
      api.onboardingStatus(selectedId),
      api.auditTrail(selectedId),
      api.onboardingDocuments(selectedId),
      api.onboardingTasks(selectedId),
    ]);
    setRawSteps(steps);
    setAuditLog(audit);
    setDocumentInfo(docs);
    setTasksByTrack(taskData.tasks || {});
    setTrackStatus(taskData.track_status || {});
    if (showLoading) setLoading(false);
  }

  async function handleMarkReceived() {
    setResuming(true);
    try {
      await api.markDocumentsReceived(selectedId);
      await loadTrackerData(true);
      await loadEmployees();
    } finally {
      setResuming(false);
    }
  }

  const latestByStep = new Map<string, any>();
  rawSteps.forEach((s) => latestByStep.set(s.step, s));
  const orderedSteps = Array.from(new Set(rawSteps.map((s) => s.step))).map((step) => latestByStep.get(step));

  function getStepHistory(step: string) {
    return rawSteps.filter((s) => s.step === step);
  }

  const pendingDocs = documentInfo?.documents?.filter((d: any) => d.status === "pending") || [];
  const isBlocked = orderedSteps.some((s) => s.step === "Validation" && s.status === "blocked");

  return (
    <Sidebar>
      <main style={{ padding: 32, flex: 1, maxWidth: 750 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1>Onboarding Tracker</h1>
          <span style={{ fontSize: 12, color: "#999" }}>● live (read-only) — updates every {POLL_INTERVAL_MS / 1000}s</span>
        </div>
        <p style={{ fontSize: 12, color: "#999", marginTop: -8 }}>
          Task approvals happen in the Approval Dashboard — this screen only displays progress.
        </p>

        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={{ padding: 8, fontSize: 14, marginBottom: 24 }}>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.name} — {e.department} ({e.status})</option>
          ))}
        </select>

        {loading && <p>Loading...</p>}

        {!loading && isBlocked && (
          <div style={{ border: "1px solid #fdba74", background: "#fff7ed", borderRadius: 8, padding: 16, marginBottom: 24 }}>
            <div style={{ fontWeight: 600, color: "#c2410c", marginBottom: 8 }}>
              ⏸ Onboarding paused — missing documents
            </div>
            <div style={{ fontSize: 13, marginBottom: 12 }}>
              Waiting on: {pendingDocs.map((d: any) => d.document_name).join(", ")}
            </div>
            <button onClick={handleMarkReceived} disabled={resuming}>
              {resuming ? "Resuming..." : "Mark Documents Received & Resume"}
            </button>
          </div>
        )}

        {!loading && orderedSteps.length > 0 && (
          <div>
            {orderedSteps.map((s, i) => {
              const isExpanded = expandedStep === s.step;
              const history = getStepHistory(s.step);
              const isTrackStep = TRACK_STEPS.includes(s.step);
              const trackName = STEP_TO_TRACK[s.step];
              const trackTasks = isTrackStep ? (tasksByTrack[trackName] || []) : [];
              const liveTrackStatus = isTrackStep ? trackStatus[trackName] : null;
              const validationAuditEntries = s.step === "Validation"
                ? auditLog.filter((a: any) => a.agent === "Validation Agent")
                : [];

              return (
                <div key={s.step}>
                  <div
                    onClick={() => setExpandedStep(isExpanded ? null : s.step)}
                    style={{ display: "flex", alignItems: "flex-start", marginBottom: 4, cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginRight: 12 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 8, background: STATUS_COLOR[s.status] || "#ccc", flexShrink: 0 }} />
                      {i < orderedSteps.length - 1 && <div style={{ width: 2, flex: 1, background: "#ddd", minHeight: isExpanded ? 8 : 28 }} />}
                    </div>
                    <div style={{ paddingBottom: 8 }}>
                      <div style={{ fontWeight: 500 }}>
                        {s.step} <span style={{ fontSize: 11, color: "#999" }}>{isExpanded ? "▲" : "▼"}</span>
                        {isTrackStep && liveTrackStatus && (
                          <span style={{ fontSize: 11, marginLeft: 6, color: TRACK_STATUS_COLOR[liveTrackStatus] }}>
                            ({liveTrackStatus.replace("_", " ")})
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: STATUS_COLOR[s.status] }}>{STATUS_LABEL[s.status] || s.status}</div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ marginLeft: 28, marginBottom: 20, padding: "8px 12px", background: "#fafafa", border: "1px solid #eee", borderRadius: 6, fontSize: 13 }}>
                      <div style={{ fontWeight: 500, marginBottom: 6 }}>Timeline</div>
                      {history.map((h, idx) => (
                        <div key={idx} style={{ color: "#555" }}>{STATUS_LABEL[h.status]} at {formatTime(h.timestamp)}</div>
                      ))}

                      {s.step === "Validation" && documentInfo?.documents?.length > 0 && (
                        <>
                          <div style={{ fontWeight: 500, marginTop: 10, marginBottom: 6 }}>Documents</div>
                          {documentInfo.documents.map((d: any, idx: number) => (
                            <div key={idx} style={{ color: d.status === "received" ? "#16a34a" : "#c2410c" }}>
                              {d.status === "received" ? "✅" : "⏳"} {d.document_name} — {d.status}
                            </div>
                          ))}
                        </>
                      )}

                      {s.step === "Validation" && validationAuditEntries.length > 0 && (
                        <>
                          <div style={{ fontWeight: 500, marginTop: 10, marginBottom: 6 }}>AI Reasoning</div>
                          {validationAuditEntries.map((a: any, idx: number) => (
                            <div key={idx} style={{ color: "#555", marginBottom: 4 }}><strong>{a.action}</strong> — {a.detail}</div>
                          ))}
                        </>
                      )}

                      {isTrackStep && (
                        <>
                          <div style={{ fontWeight: 500, marginTop: 10, marginBottom: 6 }}>{trackName} Tasks (read-only)</div>
                          {trackTasks.length === 0 && <div style={{ color: "#999", fontStyle: "italic" }}>No tasks yet.</div>}
                          {trackTasks.map((t: any, idx: number) => (
                            <div key={idx} style={{ marginBottom: 10, paddingBottom: 8, borderBottom: idx < trackTasks.length - 1 ? "1px solid #eee" : "none" }}>
                              <div>
                                {TASK_STATUS_ICON[t.status]} {t.task_name}
                                {!t.is_mandatory && <span style={{ fontSize: 11, color: "#999", marginLeft: 6 }}>(optional)</span>}
                              </div>
                              {t.ai_recommendation && (
                                <div style={{ color: "#666", marginTop: 2, fontStyle: "italic" }}>
                                  {t.is_ai_generated ? "🤖 " : ""}{t.ai_recommendation}
                                </div>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && orderedSteps.length === 0 && <p>No onboarding activity for this employee yet.</p>}
      </main>
    </Sidebar>
  );
}
