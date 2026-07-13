"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/useAuth";
import Sidebar from "../../components/Sidebar";

const STATUS_COLOR: Record<string, string> = {
  completed: "#16a34a", running: "#eab308", waiting: "#9ca3af", failed: "#dc2626", blocked: "#f97316",
};
const TRACK_STATUS_COLOR: Record<string, string> = {
  completed: "#16a34a", in_progress: "#eab308", blocked: "#dc2626", not_started: "#9ca3af",
};
const TASK_ICON: Record<string, string> = { approved: "✅", rejected: "❌", pending: "⬜" };

export default function ProfilePage() {
  useAuth();
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (id) api.getProfile(id).then(setProfile);
  }, [id]);

  if (!profile) return <Sidebar><main style={{ padding: 32 }}>Loading...</main></Sidebar>;

  const { personal_information: p, employment_details: e } = profile;
  const tracks = Object.keys(profile.onboarding_tasks || {});

  return (
    <Sidebar>
      <main style={{ padding: 32, flex: 1, maxWidth: 900 }}>
        <h1>
          {p.name}
          {e.experience_level && (
            <span style={{
              fontSize: 12, marginLeft: 10, padding: "3px 10px", borderRadius: 10, verticalAlign: "middle",
              background: e.experience_level === "fresher" ? "#e0f2fe" : "#ede9fe",
              color: e.experience_level === "fresher" ? "#0369a1" : "#6d28d9",
            }}>
              {e.experience_level}
            </span>
          )}
        </h1>
        <p style={{ color: "#666" }}>{p.employee_id} · {e.department} · {e.role || "Unclassified"}</p>

        <div style={{ display: "flex", gap: 24, margin: "16px 0" }}>
          <div style={{ flex: 1, border: "1px solid #eee", borderRadius: 8, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Personal Information</h3>
            <p>Email: {p.email}</p>
            <p>Office: {p.office}</p>
          </div>
          <div style={{ flex: 1, border: "1px solid #eee", borderRadius: 8, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Employment Details</h3>
            <p>Title: {e.title}</p>
            <p>Manager: {e.manager}</p>
            <p>Joining Date: {e.joining_date}</p>
            <p>Status: {e.status} ({e.sync_source})</p>
          </div>
        </div>

        <div style={{ margin: "16px 0" }}>
          <h3>Profile Completion</h3>
          <div style={{ background: "#eee", borderRadius: 6, height: 10, width: "100%" }}>
            <div style={{ background: "#6366f1", height: 10, borderRadius: 6, width: `${profile.profile_completion_pct}%` }} />
          </div>
          <p style={{ fontSize: 13, color: "#666" }}>{profile.profile_completion_pct}% complete</p>
        </div>

        <div style={{ display: "flex", gap: 24, margin: "16px 0" }}>
          <div style={{ flex: 1 }}>
            <h3>Applications</h3>
            <ul>{profile.applications.map((a: string) => <li key={a}>{a}</li>)}</ul>
          </div>
          <div style={{ flex: 1 }}>
            <h3>Security Groups</h3>
            <ul>{profile.security_groups.map((g: string) => <li key={g}>{g}</li>)}</ul>
          </div>
          <div style={{ flex: 1 }}>
            <h3>Assets</h3>
            <ul>{profile.assets.map((a: string) => <li key={a}>{a}</li>)}</ul>
          </div>
        </div>

        <div style={{ margin: "16px 0" }}>
          <h3>Compliance</h3>
          {profile.compliance_tasks.map((t: any) => (
            <div key={t.task_name} style={{ fontSize: 14 }}>
              {t.status === "approved" ? "✅" : t.status === "rejected" ? "❌" : "⬜"} {t.task_name}
            </div>
          ))}
        </div>

        {tracks.length > 0 && (
          <div style={{ margin: "16px 0" }}>
            <h3>Onboarding Tasks by Track</h3>
            {tracks.map((track) => {
              const tasks = profile.onboarding_tasks[track] || [];
              const status = profile.onboarding_track_status?.[track];
              if (tasks.length === 0) return null;
              return (
                <div key={track} style={{ marginBottom: 12, border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, marginBottom: 6 }}>
                    <span>{track}</span>
                    {status && <span style={{ fontSize: 12, color: TRACK_STATUS_COLOR[status] }}>{status.replace("_", " ")}</span>}
                  </div>
                  {tasks.map((t: any, idx: number) => (
                    <div key={idx} style={{ fontSize: 13, marginBottom: 4 }}>
                      {TASK_ICON[t.status]} {t.task_name}
                      {!t.is_mandatory && <span style={{ fontSize: 11, color: "#999", marginLeft: 6 }}>(optional)</span>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {profile.offboarding_approvals.length > 0 && (
          <div style={{ margin: "16px 0" }}>
            <h3>Offboarding Approvals</h3>
            {profile.offboarding_approvals.map((a: any) => (
              <div key={a.approver_role} style={{ fontSize: 14 }}>
                {a.approver_role}: <strong style={{ color: a.status === "approved" ? "#16a34a" : a.status === "rejected" ? "#dc2626" : "#666" }}>{a.status}</strong>
              </div>
            ))}
          </div>
        )}

        <div style={{ margin: "16px 0" }}>
          <h3>Employee Timeline</h3>
          {profile.timeline.map((t: any, i: number) => (
            <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, marginBottom: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: STATUS_COLOR[t.status], marginTop: 4 }} />
              <span>{t.flow === "onboarding" ? "🟢" : "🔴"} {t.step} — {t.status}</span>
            </div>
          ))}
        </div>

        <div style={{ margin: "16px 0" }}>
          <h3>Recent Activity</h3>
          {profile.recent_activity.map((a: any, i: number) => (
            <div key={i} style={{ fontSize: 13, marginBottom: 6 }}>
              <strong>{a.agent}</strong> — {a.action}
            </div>
          ))}
        </div>
      </main>
    </Sidebar>
  );
}
