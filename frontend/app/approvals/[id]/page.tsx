"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/useAuth";
import Sidebar from "../../components/Sidebar";

function initials(name: string) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

// --- Stage classification -------------------------------------------------
// Prefer an explicit t.stage / t.category field from the API if present.
// Falls back to keyword matching on task_name since the real field names
// weren't confirmed. Replace this once you tell me the actual key.
const HR_KEYWORDS = ["aadhaar", "pan card", "education", "offer letter", "employment", "passport", "government id", "relieving"];
const IT_KEYWORDS = ["laptop", "vpn", "jetbrains", "ide", "admin panel", "building access", "workstation", "license", "hardware", "software"];
const MANAGER_KEYWORDS = ["team assignment", "onboarding track", "buddy", "mentor", "manager"];

type StageKey = "hr" | "it" | "manager";

function classifyStage(t: any): StageKey {
  const explicit = (t.stage || t.category || "").toLowerCase();
  if (explicit.includes("hr") || explicit.includes("document")) return "hr";
  if (explicit.includes("it") || explicit.includes("provision")) return "it";
  if (explicit.includes("manager") || explicit.includes("team")) return "manager";

  const name = (t.task_name || "").toLowerCase();
  if (HR_KEYWORDS.some((k) => name.includes(k))) return "hr";
  if (IT_KEYWORDS.some((k) => name.includes(k))) return "it";
  if (MANAGER_KEYWORDS.some((k) => name.includes(k))) return "manager";
  return "hr"; // safe default
}

const STAGES: { key: StageKey; eyebrow: string; title: string }[] = [
  { key: "hr", eyebrow: "STAGE 1 · DOCUMENTATION", title: "HR Verification" },
  { key: "it", eyebrow: "STAGE 2 · PROVISIONING", title: "IT Provisioning" },
  { key: "manager", eyebrow: "STAGE 3 · TEAM ASSIGNMENT", title: "Manager Assignment" },
];

function docItemStyle(t: any) {
  const status = (t.status || "").toLowerCase();
  const flagged = t.flag || (t.status === "rejected" ? "issue" : null);
  if (status === "approved" || status === "verified") {
    return { bg: "bg-green-50 border-green-100", checked: true };
  }
  if (t.flag === "expired" || t.flag === "missing" || status === "rejected") {
    return { bg: "bg-red-50 border-red-100", checked: false };
  }
  return { bg: "bg-white border-gray-100", checked: false };
}

export default function EmployeeApprovalPage() {
  const { role } = useAuth();
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [decidingStage, setDecidingStage] = useState<StageKey | null>(null);

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

  const employeeItems = useMemo(
    () => items.filter((item: any) => item.employee_id === employeeId),
    [items, employeeId]
  );

  const header = employeeItems[0];

  // Flatten all onboarding tasks across workflow entries for this employee
  const allTasks = useMemo(() => {
    return employeeItems
      .filter((i: any) => i.workflow_type === "onboarding")
      .flatMap((i: any) => i.tasks || []);
  }, [employeeItems]);

  const tasksByStage = useMemo(() => {
    const grouped: Record<StageKey, any[]> = { hr: [], it: [], manager: [] };
    allTasks.forEach((t: any) => grouped[classifyStage(t)].push(t));
    return grouped;
  }, [allTasks]);

  function stageStatus(key: StageKey): "completed" | "pending" | "locked" {
    const tasks = tasksByStage[key];
    if (tasks.length === 0) return "completed"; // nothing required at this stage
    const allApproved = tasks.every((t) => t.status === "approved");
    if (allApproved) return "completed";

    const stageIndex = STAGES.findIndex((s) => s.key === key);
    const priorStagesDone = STAGES.slice(0, stageIndex).every(
      (s) => stageStatus(s.key) === "completed"
    );
    return priorStagesDone ? "pending" : "locked";
  }

  async function handleApproveStage(key: StageKey) {
    const pendingTasks = tasksByStage[key].filter((t) => t.status === "pending");
    if (pendingTasks.length === 0) return;
    setDecidingStage(key);
    try {
      for (const t of pendingTasks) {
        await api.decideTask(employeeId, t.id, "approved");
      }
      await load();
    } finally {
      setDecidingStage(null);
    }
  }

  const currentStageIndex = STAGES.findIndex((s) => stageStatus(s.key) === "pending");

  return (
    <Sidebar>
      <div className="bg-[#FAFAF9] min-h-screen w-full p-6 flex-1">
        {/* Top bar */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="uppercase tracking-[0.25em] text-xs text-[#D9A653] font-semibold">
              Employee Onboarding
            </p>
            <h1 className="mt-2 text-4xl font-bold text-[#14213D]">Approval Dashboard</h1>
            <p className="mt-2 text-gray-500">
              Review, validate and approve onboarding across HR, IT and Reporting Manager.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#14213D]">
              Logged in as {role}
            </div>
            <button
              onClick={() => router.push("/approvals")}
              className="rounded-xl bg-[#14213D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#243654] transition"
            >
              Back to Directory
            </button>
          </div>
        </div>

        {loading && <p className="text-gray-500">Loading...</p>}
        {!loading && !header && (
          <p className="text-gray-500">No pending approvals found for this employee.</p>
        )}

        {!loading && header && (
          <>
            {/* Employee header card */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 mb-6">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#14213D] text-white text-base font-bold shrink-0">
                  {initials(header.employee_name)}
                </div>
                <div className="mr-auto">
                  <div className="text-xl font-bold text-[#14213D]">{header.employee_name}</div>
                  <div className="text-sm text-gray-500">
                    {header.employee_id || employeeId}
                    {header.email ? ` · ${header.email}` : ""}
                  </div>
                </div>

                <div className="flex gap-8 flex-wrap">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">Department</div>
                    <div className="font-semibold text-[#14213D]">{header.department || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">Role</div>
                    <div className="font-semibold text-[#14213D]">{header.role || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">Location</div>
                    <div className="font-semibold text-[#14213D]">{header.location || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">Status</div>
                    <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      {header.status || "Onboarding"}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">Source</div>
                    <span className="inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                      {header.source || "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stepper */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 mb-6">
              <div className="flex items-center">
                {STAGES.map((s, idx) => {
                  const status = stageStatus(s.key);
                  const isLast = idx === STAGES.length - 1;
                  return (
                    <div key={s.key} className={`flex items-center ${isLast ? "" : "flex-1"}`}>
                      <div className="flex items-center gap-3 shrink-0">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shrink-0 ${
                            status === "completed"
                              ? "bg-green-600 text-white"
                              : status === "pending"
                              ? "bg-green-600 text-white"
                              : "bg-white border-2 border-gray-200 text-gray-400"
                          }`}
                        >
                          {status === "completed" ? "✓" : idx + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-[#14213D] text-sm whitespace-nowrap">
                            {s.title}
                          </div>
                          <div className="text-xs text-gray-400 whitespace-nowrap">
                            {status === "completed"
                              ? "Completed"
                              : status === "pending"
                              ? "In progress"
                              : `Waiting on ${STAGES[idx - 1]?.title.split(" ")[0] || "—"}`}
                          </div>
                        </div>
                      </div>
                      {!isLast && (
                        <div
                          className={`h-0.5 flex-1 mx-4 ${
                            status === "completed" ? "bg-green-600" : "bg-gray-200"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stage cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {STAGES.map((s, idx) => {
                const status = stageStatus(s.key);
                const tasks = tasksByStage[s.key];
                const locked = status === "locked";

                return (
                  <div
                    key={s.key}
                    className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col"
                  >
                    <p className="text-xs font-semibold tracking-wide text-[#D9A653] uppercase">
                      {s.eyebrow}
                    </p>
                    <div className="flex items-center justify-between mt-1 mb-4">
                      <h3 className="text-xl font-bold text-[#14213D]">{s.title}</h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                          locked
                            ? "bg-gray-100 text-gray-500"
                            : status === "completed"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {locked ? "Locked" : status === "completed" ? "Approved" : "Pending"}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 mb-4">
                      {idx > 0 && (
                        <button
                          disabled={locked}
                          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-[#14213D] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                        >
                          Modify
                        </button>
                      )}
                      <button
                        onClick={() => handleApproveStage(s.key)}
                        disabled={locked || status === "completed" || decidingStage === s.key}
                        className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                          idx === 0
                            ? "bg-[#14213D] text-white hover:bg-[#243654]"
                            : "bg-gray-300 text-white"
                        }`}
                      >
                        {decidingStage === s.key ? "Approving..." : "Approve"}
                      </button>
                    </div>

                    {/* HR: document checklist */}
                    {s.key === "hr" && (
                      <div className="space-y-2.5">
                        {tasks.length === 0 && (
                          <p className="text-sm text-gray-400">No documents listed.</p>
                        )}
                        {tasks.map((t: any, i: number) => {
                          const { bg, checked } = docItemStyle(t);
                          return (
                            <div key={i} className={`rounded-xl border p-3 ${bg}`}>
                              <div className="flex items-start gap-3">
                                <div
                                  className={`flex h-5 w-5 items-center justify-center rounded shrink-0 mt-0.5 ${
                                    checked ? "bg-green-600" : "border-2 border-gray-300 bg-white"
                                  }`}
                                >
                                  {checked && (
                                    <span className="text-white text-xs">✓</span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-sm font-semibold text-[#14213D]">
                                      {t.task_name}
                                    </div>
                                    {t.flag && (
                                      <span className="text-xs font-semibold text-red-600 whitespace-nowrap">
                                        {t.flag === "expired" ? "Expired" : "Missing"}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {t.detail || t.ai_recommendation || "—"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* IT / Manager: AI recommendation panel */}
                    {s.key !== "hr" && (
                      <div className="rounded-xl bg-[#F3F1FB] border border-[#E4DFF7] p-4">
                        <div className="text-xs font-semibold text-[#6D4FC7] uppercase tracking-wide mb-3">
                          ✦ {s.key === "it" ? "AI Recommended Access" : "AI Suggested Assignment"}
                        </div>
                        {tasks.length === 0 && (
                          <p className="text-sm text-gray-400">No recommendations yet.</p>
                        )}
                        <div className="space-y-3">
                          {tasks.map((t: any, i: number) => (
                            <div key={i} className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-[#14213D]">
                                  {t.task_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {t.detail || t.category || ""}
                                </div>
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold whitespace-nowrap ${
                                  t.status === "approved"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {t.status === "approved" ? "Assigned" : "Recommended"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Sidebar>
  );
}