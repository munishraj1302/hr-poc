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

const CATEGORY_COLOR: Record<string, string> = {
  onboarding_delay: "#EF4444",
  department_duration: "#3B82F6",
  compliance_incomplete: "#F59E0B",
  overdue_assets: "#8B5CF6",
  high_risk_access: "#DC2626",
};

const CATEGORY_BG: Record<string, string> = {
  onboarding_delay: "#FEE2E2",
  department_duration: "#DBEAFE",
  compliance_incomplete: "#FEF3C7",
  overdue_assets: "#EDE9FE",
  high_risk_access: "#FECACA",
};

const CATEGORY_TITLE: Record<string, string> = {
  onboarding_delay: "Onboarding Delay",
  department_duration: "Department Duration",
  compliance_incomplete: "Compliance",
  overdue_assets: "Assets",
  high_risk_access: "High Risk Access",
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
      <main
        style={{
          flex: 1,
          background: "#F8FAFC",
          minHeight: "100vh",
          padding: "40px",
        }}
      >
        {/* Heading */}

        <div style={{ marginBottom: 30 }}>
          <h1
            style={{
              fontSize: 46,
              fontWeight: 700,
              color: "#172554",
              marginBottom: 10,
            }}
          >
            AI Insights Dashboard
          </h1>

          <p
            style={{
              color: "#64748B",
              fontSize: 18,
              maxWidth: 800,
              lineHeight: 1.6,
            }}
          >
            Figures below are computed directly from platform data. AI is only
            used to phrase the insights and does not generate the underlying
            numbers.
          </p>
        </div>

        {/* Loading */}

        {loading && (
          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              padding: 30,
              textAlign: "center",
              color: "#64748B",
              boxShadow: "0 3px 10px rgba(0,0,0,.08)",
            }}
          >
            Loading AI Insights...
          </div>
        )}

        {/* Empty */}

        {!loading && insights.length === 0 && (
          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              padding: 40,
              textAlign: "center",
              boxShadow: "0 3px 10px rgba(0,0,0,.08)",
            }}
          >
            <div
              style={{
                fontSize: 48,
                marginBottom: 15,
              }}
            >
              🎉
            </div>

            <h2
              style={{
                color: "#172554",
                marginBottom: 10,
              }}
            >
              Everything Looks Good
            </h2>

            <p
              style={{
                color: "#64748B",
              }}
            >
              No delays, overdue assets, compliance issues or high-risk access
              found.
            </p>
          </div>
        )}

        {/* Cards */}

        {!loading &&
          insights.map((insight, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#fff",
                borderRadius: 22,
                marginBottom: 22,
                overflow: "hidden",
                boxShadow: "0 4px 15px rgba(15,23,42,.08)",
                border: "1px solid #E5E7EB",
              }}
            >
              {/* Left Color Bar */}

              <div
                style={{
                  width: 8,
                  alignSelf: "stretch",
                  background:
                    CATEGORY_COLOR[insight.category] || "#3B82F6",
                }}
              />

              {/* Left */}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 22,
                  padding: 28,
                  flex: 1,
                }}
              >
                {/* Icon */}

                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background:
                      CATEGORY_BG[insight.category] || "#DBEAFE",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                  }}
                >
                  {CATEGORY_ICON[insight.category]}
                </div>

                {/* Text */}

                <div>
                  <div
                    style={{
                      display: "inline-block",
                      background:
                        CATEGORY_BG[insight.category] || "#DBEAFE",
                      color:
                        CATEGORY_COLOR[insight.category] || "#2563EB",
                      padding: "4px 12px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 700,
                      marginBottom: 10,
                      letterSpacing: ".5px",
                    }}
                  >
                    {CATEGORY_TITLE[insight.category] || "Insight"}
                  </div>

                  <h3
                    style={{
                      margin: 0,
                      fontSize: 24,
                      color: "#172554",
                      fontWeight: 700,
                      lineHeight: 1.4,
                    }}
                  >
                    {insight.text}
                  </h3>

                  <p
                    style={{
                      marginTop: 8,
                      color: "#94A3B8",
                      fontSize: 15,
                    }}
                  >
                    Generated from live platform data
                  </p>
                </div>
              </div>

              {/* Button */}

              <div
                style={{
                  paddingRight: 30,
                }}
              >
                <button
                  style={{
                    border: "none",
                    background:
                      CATEGORY_BG[insight.category] || "#DBEAFE",
                    color:
                      CATEGORY_COLOR[insight.category] || "#2563EB",
                    padding: "13px 24px",
                    borderRadius: 40,
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: "pointer",
                    transition: ".2s",
                  }}
                >
                  Review →
                </button>
              </div>
            </div>
          ))}
      </main>
    </Sidebar>
  );
}