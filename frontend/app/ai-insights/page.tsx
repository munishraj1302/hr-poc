"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/useAuth";
import Sidebar from "../components/Sidebar";

const CATEGORY_ICON: Record<string, string> = {
  onboarding_delay: "⏱️",
  department_duration: "📊",
  compliance_incomplete: "📋",
  overdue_assets: "📦",
  high_risk_access: "⚠️",
};

export default function AiInsightsPage() {
  useAuth();
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.insightsSummary().then((data) => {
      setInsights(data.insights);
      setLoading(false);
    });
  }, []);

  return (
    <Sidebar>
      <main style={{ padding: 32, flex: 1, maxWidth: 700 }}>
        <h1>AI Insights Dashboard</h1>
        <p style={{ color: "#666", fontSize: 13 }}>
          Figures below are computed directly from platform data — AI is not used to generate the numbers, only (where applicable) to phrase them.
        </p>

        {loading && <p>Loading...</p>}
        {!loading && insights.length === 0 && <p>No notable insights right now — nothing is delayed, overdue, or high risk.</p>}

        {!loading && insights.map((insight, idx) => (
          <div key={idx} style={{ display: "flex", gap: 12, alignItems: "flex-start", border: "1px solid #eee", borderRadius: 8, padding: 14, marginBottom: 10 }}>
            <div style={{ fontSize: 20 }}>{CATEGORY_ICON[insight.category] || "•"}</div>
            <div style={{ fontSize: 14 }}>{insight.text}</div>
          </div>
        ))}
      </main>
    </Sidebar>
  );
}
