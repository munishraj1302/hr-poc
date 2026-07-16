"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/useAuth";


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
// Falls back to keyword matching on task_name ONLY if the backend doesn't
// send an explicit stage.
//
// IMPORTANT: we match ONLY against task_name, never against t.options.
// A task's own sub-options (e.g. an "Asset Allocation" task offering a
// "Security Token" checkbox) must not change which team owns the task —
// otherwise an IT task gets mis-filed under a different team just because
// one of its options happens to contain an unrelated keyword. Ownership of
// a task is a property of the task itself, not of what the reviewer can
// pick inside it.
const HR_KEYWORDS = [
  "aadhaar",
  "pan card",
  "education",
  "offer letter",
  "employment",
  "passport",
  "government id",
  "relieving",
  "hr portal",
  "hr document",
  // security/compliance-adjacent tasks route to HR since the dedicated
  // Security stage was removed — HR already owns documentation/compliance.
  "background check",
  "security clearance",
  "nda",
  "confidentiality",
  "access badge",
  "security training",
  "police verification",
  "reference check",
  "security token",
  "clearance",
];
const IT_KEYWORDS = [
  "laptop",
  "vpn",
  "jetbrains",
  "ide",
  "admin panel",
  "building access",
  "workstation",
  "license",
  "hardware",
  "software",
  "asset allocation",
  "asset",
  "assign application",
  "application access",
  "app access",
  "email",
  "outlook",
  "teams",
  "sharepoint",
  "onedrive",
  "monitor",
  "dock",
  "headset",
  "mobile device",
  "provision",
  "system access",
  "erp",
  "time entry",
  "billing system",
  // added: previously unmatched IT tasks were silently defaulting to HR,
  // which kept the HR stage permanently "not fully decided" and made the
  // IT stage compute as locked for everyone, including IT reviewers.
  "create user account",
  "user account",
  "account creation",
  "user id",
];
const DELIVERY_KEYWORDS = [
  "team assignment",
  "onboarding track",
  "buddy",
  "mentor",
  "manager",
  "delivery team",
  "project allocation",
];

type StageKey = "hr" | "it" | "delivery";
type WorkflowType = "onboarding" | "offboarding";

// Checks a task name against a keyword list.
function matchesAny(name: string, keywords: string[]) {
  return keywords.some((k) => name.includes(k));
}

function classifyStage(t: any): StageKey {
  // 1) Trust an explicit backend field first — this should always win once
  //    your API sends it, since keyword guessing is inherently fragile.
  const explicit = (t.stage || t.category || "").toLowerCase();
  if (explicit) {
    if (
      explicit.includes("hr") ||
      explicit.includes("document") ||
      explicit.includes("security") ||
      explicit.includes("clearance")
    )
      return "hr";
    if (explicit.includes("it") || explicit.includes("provision")) return "it";
    if (explicit.includes("manager") || explicit.includes("team") || explicit.includes("delivery"))
      return "delivery";
  }

  // 2) Fall back to matching on the task name ONLY. Do NOT include
  //    t.options here — see comment above IT_KEYWORDS.
  const name = (t.task_name || "").toLowerCase();

  if (matchesAny(name, DELIVERY_KEYWORDS)) return "delivery";
  if (matchesAny(name, IT_KEYWORDS)) return "it";
  if (matchesAny(name, HR_KEYWORDS)) return "hr";

  // 3) Truly unclassifiable — log it so you can add a keyword/backend field
  //    for it, instead of silently mis-filing it under HR.
  if (typeof window !== "undefined") {
    console.warn(`[classifyStage] Unmatched task, defaulting to HR:`, t.task_name, t);
  }
  return "hr";
}

const STAGES: { key: StageKey; eyebrow: string; title: string }[] = [
  { key: "hr", eyebrow: "STAGE 1 · DOCUMENTATION", title: "HR Verification" },
  { key: "it", eyebrow: "STAGE 2 · PROVISIONING", title: "IT Provisioning" },
  { key: "delivery", eyebrow: "STAGE 3 · TEAM ASSIGNMENT", title: "Delivery Team" },
];

// --- Role-based access -----------------------------------------------------
// Maps a logged-in user's role to the single stage they're allowed to
// EDIT. Every other stage is still fully visible to them — just read-only.
// "admin" (or any role not listed) falls back to full edit access —
// adjust ADMIN_ROLES if you have a different naming convention for a
// super-user role.
const ROLE_STAGE_MAP: Record<string, StageKey> = {
  hr: "hr",
  it: "it",
  manager: "delivery",
  delivery: "delivery",
  "delivery team": "delivery",
};
const ADMIN_ROLES = ["admin", "superadmin", "owner"];

function stageForRole(role?: string | null): StageKey | "all" | null {
  if (!role) return null;
  const r = role.toLowerCase();
  if (ADMIN_ROLES.includes(r)) return "all";
  return ROLE_STAGE_MAP[r] ?? null;
}

// A task card is visually "checked"/complete once it has been decided —
// approved OR rejected both count as Completed. The red "needs attention"
// styling is driven purely by the flag (expired/missing), not by the
// rejected decision itself, so a reviewer's reject action always reads as
// a completed action rather than a failure state.
function taskCardStyle(t: any) {
  const status = (t.status || "").toLowerCase();
  if (t.flag === "expired" || t.flag === "missing") {
    return { bg: "bg-red-50 border-red-100", checked: false };
  }
  if (status === "approved" || status === "verified" || status === "rejected") {
    return { bg: "bg-green-50 border-green-100", checked: true };
  }
  return { bg: "bg-white border-gray-100", checked: false };
}

// --- Individual task row ---------------------------------------------------
// Carries the editable-selection + approve/reject-per-task logic, restyled
// with the stepper design's tailwind visual language so it drops into either
// the HR checklist card or the IT/Delivery AI-recommendation panel.
function TaskRow({
  employeeId,
  task,
  workflow,
  onChanged,
  locked,
}: {
  employeeId: string;
  task: any;
  workflow: WorkflowType;
  onChanged: () => void;
  locked?: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [selection, setSelection] = useState<string[]>(task.selected_options || []);

  const isEditable =
    !locked &&
    task.status === "pending" &&
    (task.task_type === "multi_select" || task.task_type === "single_select");

  const updateSelection =
    workflow === "onboarding" ? api.updateTaskSelection : api.updateOffboardingTaskSelection;
  const decideTask = workflow === "onboarding" ? api.decideTask : api.decideOffboardingTask;

  async function saveSelection(next: string[]) {
    if (locked) return;
    setSelection(next);
    setSaving(true);
    try {
      await updateSelection(employeeId, task.id, next);
    } finally {
      setSaving(false);
    }
  }

  function toggleOption(option: string) {
    if (locked) return;
    if (task.task_type === "single_select") {
      saveSelection([option]);
    } else {
      const next = selection.includes(option)
        ? selection.filter((o) => o !== option)
        : [...selection, option];
      saveSelection(next);
    }
  }

  async function decide(status: "approved" | "rejected") {
    if (locked) return;
    setSaving(true);
    try {
      await decideTask(employeeId, task.id, status);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  const { bg, checked } = taskCardStyle(task);

  return (
    <div className={`rounded-xl border p-3 ${bg} ${locked ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <div
          className={`flex h-5 w-5 items-center justify-center rounded shrink-0 mt-0.5 ${
            checked ? "bg-green-600" : "border-2 border-gray-300 bg-white"
          }`}
        >
          {checked && <span className="text-white text-xs">✓</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm font-semibold text-[#14213D] flex items-center gap-2 flex-wrap">
              {task.task_name}
              {!task.is_mandatory && (
                <span className="text-[11px] font-normal text-gray-400">(optional)</span>
              )}
              {task.category === "compliance" && (
                <span className="text-[11px] font-semibold text-indigo-600">compliance</span>
              )}
              {checked && (
                <span className="text-[11px] font-semibold text-green-600">Completed</span>
              )}
            </div>
            {task.flag && (
              <span className="text-xs font-semibold text-red-600 whitespace-nowrap">
                {task.flag === "expired" ? "Expired" : "Missing"}
              </span>
            )}
          </div>

          {task.ai_recommendation && (
            <div className="text-xs text-gray-500 mt-0.5">
              {task.is_ai_generated ? "✦ " : ""}
              {task.ai_recommendation}
            </div>
          )}

          {/* single_select: dropdown over the full catalog, AI's top pick pre-selected but changeable */}
          {task.task_type === "single_select" && task.options && (
            <div className="mt-2.5">
              <select
                value={selection[0] || ""}
                disabled={!isEditable || saving}
                onChange={(e) => toggleOption(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-[#14213D] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="" disabled>
                  Select…
                </option>
                {task.options.map((opt: string) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* multi_select: editable checklist, AI's suggestion pre-checked but changeable */}
          {task.task_type === "multi_select" && task.options && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {task.options.map((opt: string) => (
                <label
                  key={opt}
                  className={`text-xs rounded-md border px-2 py-1 ${
                    isEditable ? "cursor-pointer" : "cursor-default"
                  } ${
                    selection.includes(opt)
                      ? "bg-[#EEE9FB] border-[#D9CFF5] text-[#6D4FC7]"
                      : "bg-white border-gray-200 text-[#14213D]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selection.includes(opt)}
                    disabled={!isEditable || saving}
                    onChange={() => toggleOption(opt)}
                    className="mr-1.5 align-middle"
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}

          {task.status === "pending" && !locked && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => decide("approved")}
                disabled={saving}
                className="rounded-lg bg-[#14213D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#243654] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Approve"}
              </button>
              <button
                onClick={() => decide("rejected")}
                disabled={saving}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#14213D] hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EmployeeApprovalPage() {
  const { role } = useAuth();
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [decidingStage, setDecidingStage] = useState<StageKey | null>(null);
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowType>("onboarding");

  // Which single stage (if any) this logged-in role is permitted to EDIT.
  // "all" = full edit access (admin-type role). null = unrecognized role,
  // treat as fully read-only everywhere to be safe. Note: this only ever
  // gates editing — every stage's data is still fetched and displayed to
  // every role (see load() below).
  const myStage = useMemo(() => stageForRole(role), [role]);

  function isStageLockedForRole(key: StageKey) {
    if (myStage === "all") return false;
    return myStage !== key;
  }

  async function load() {
    if (!role) return;
    setLoading(true);
    try {
      let data: any[] = [];
      if (typeof (api as any).approvalsForEmployee === "function") {
        // PREFERRED, if/when your backend adds it: a per-employee endpoint
        // that isn't scoped to the caller's own role queue, so every stage's
        // real tasks come back regardless of who's logged in.
        data = await (api as any).approvalsForEmployee(employeeId);
      } else {
        // Fallback: the logged-in role's own queue. Works today. Its known
        // limit: a stage the current role doesn't own may show up empty
        // instead of its real state, if your backend only ever sends that
        // role its own tasks. Add api.approvalsForEmployee(employeeId) on
        // the backend to remove this limitation.
        data = await api.approvalsForRole(role);
      }
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [role]);

  const employeeItems = useMemo(
    () => items.filter((item: any) => item.employee_id === employeeId),
    [items, employeeId]
  );

  const header = employeeItems[0];

  // Which workflows actually exist for this employee (usually just onboarding,
  // but offboarding records show up here too).
  const availableWorkflows = useMemo(() => {
    const set = new Set<WorkflowType>(employeeItems.map((i: any) => i.workflow_type));
    return (["onboarding", "offboarding"] as WorkflowType[]).filter((w) => set.has(w));
  }, [employeeItems]);

  useEffect(() => {
    if (availableWorkflows.length > 0 && !availableWorkflows.includes(activeWorkflow)) {
      setActiveWorkflow(availableWorkflows[0]);
    }
  }, [availableWorkflows, activeWorkflow]);

  // Flatten all tasks for the active workflow, tagging each with the
  // workflow it belongs to so TaskRow calls the right approve/select API.
  const allTasks = useMemo(() => {
    return employeeItems
      .filter((i: any) => i.workflow_type === activeWorkflow)
      .flatMap((i: any) => (i.tasks || []).map((t: any) => ({ ...t, _workflow: activeWorkflow })));
  }, [employeeItems, activeWorkflow]);

  const tasksByStage = useMemo(() => {
    const grouped: Record<StageKey, any[]> = { hr: [], it: [], delivery: [] };
    allTasks.forEach((t: any) => grouped[classifyStage(t)].push(t));
    return grouped;
  }, [allTasks]);

  // --- Stage progression -----------------------------------------------
  // Order of truth: HR → IT → Delivery. A stage can only be "In Progress"
  // once every EARLIER stage is fully "Completed" — this is checked FIRST,
  // even for a stage with zero tasks, so an empty stage never appears
  // Completed before it's actually its turn.
  function stageStatus(key: StageKey): "completed" | "pending" | "locked" {
    const stageIndex = STAGES.findIndex((s) => s.key === key);
    const priorStagesDone = STAGES.slice(0, stageIndex).every(
      (s) => stageStatus(s.key) === "completed"
    );
    if (!priorStagesDone) return "locked";

    const tasks = tasksByStage[key];
    if (tasks.length === 0) return "completed"; // nothing required, and it's this stage's turn

    // A stage is Completed once every task in it has been decided — approved
    // OR rejected. Tracking only advances after the owning role has actually
    // acted (task-level editing is already restricted to that role), so this
    // naturally satisfies "status changes only after the logged-in role
    // completes its action".
    const allDecided = tasks.every((t) => t.status === "approved" || t.status === "rejected");
    return allDecided ? "completed" : "pending";
  }

  async function handleApproveStage(key: StageKey) {
    if (isStageLockedForRole(key)) return;
    const pendingTasks = tasksByStage[key].filter((t) => t.status === "pending");
    if (pendingTasks.length === 0) return;
    setDecidingStage(key);
    try {
      for (const t of pendingTasks) {
        const decideTask = t._workflow === "onboarding" ? api.decideTask : api.decideOffboardingTask;
        await decideTask(employeeId, t.id, "approved");
      }
      await load();
    } finally {
      setDecidingStage(null);
    }
  }

  return (

      <div className="bg-[#FAFAF9] min-h-screen w-full p-6 flex-1">
        {/* Top bar */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="uppercase tracking-[0.25em] text-xs text-[#D9A653] font-semibold">
              Employee {activeWorkflow === "onboarding" ? "Onboarding" : "Offboarding"}
            </p>
            <h1 className="mt-2 text-4xl font-bold text-[#14213D]">Approval Dashboard</h1>
            <p className="mt-2 text-gray-500">
              Review, edit AI selections and approve or reject each task across HR, IT and Delivery
              Team.
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
                    {header.employee_id ?? "—"}
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
                  {header.experience_level && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-400">Experience</div>
                      <div className="font-semibold text-[#14213D]">{header.experience_level}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">Status</div>
                    <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      {header.status || "Onboarding"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Workflow tabs — only shown when the employee has more than one workflow record */}
              {availableWorkflows.length > 1 && (
                <div className="flex gap-2 mt-5 border-t border-gray-100 pt-4">
                  {availableWorkflows.map((w) => (
                    <button
                      key={w}
                      onClick={() => setActiveWorkflow(w)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        activeWorkflow === w
                          ? "bg-[#14213D] text-white"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {w === "onboarding" ? "Onboarding" : "Offboarding"}
                    </button>
                  ))}
                </div>
              )}
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
                              : `Waiting for ${STAGES[idx - 1]?.title.split(" ")[0] || "—"}`}
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {STAGES.map((s) => {
                const status = stageStatus(s.key);
                const tasks = tasksByStage[s.key];
                const locked = status === "locked"; // TRUE progress lock: a prior stage isn't done yet
                const roleLocked = isStageLockedForRole(s.key); // PERMISSION lock: this login can't edit this stage
                const pendingCount = tasks.filter((t) => t.status === "pending").length;

                return (
                  <div
                    key={s.key}
                    className="relative rounded-2xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col"
                  >
                    <p className="text-xs font-semibold tracking-wide text-[#D9A653] uppercase">
                      {s.eyebrow}
                    </p>
                    <div className="flex items-center justify-between mt-1 mb-4">
                      <h3 className="text-xl font-bold text-[#14213D] flex items-center gap-2">
                        {s.title}
                        {/* Stage stays fully visible even when this role can't edit it —
                            just a small "View only" tag instead of hiding the content. */}
                        {roleLocked && (
                          <span
                            title={`Read-only — only ${s.title} reviewers can edit this stage`}
                            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500"
                          >
                            🔒 View only
                          </span>
                        )}
                      </h3>
                      {/* Status pill reflects the REAL stage progress — Locked / Pending /
                          Completed — the same for every role. Editability is shown
                          separately via the "View only" tag above, never by relabeling
                          or hiding the real status here. */}
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                          locked
                            ? "bg-gray-100 text-gray-500"
                            : status === "completed"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {locked ? "Locked" : status === "completed" ? "Completed" : "In Progress"}
                      </span>
                    </div>

                    {/* Bulk stage action — approves every still-pending task in this stage */}
                    {pendingCount > 0 && !roleLocked && (
                      <button
                        onClick={() => handleApproveStage(s.key)}
                        disabled={locked || decidingStage === s.key}
                        className="mb-4 rounded-lg bg-[#14213D] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#243654] transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {decidingStage === s.key
                          ? "Approving..."
                          : `Approve all (${pendingCount})`}
                      </button>
                    )}

                    {/* HR: document checklist */}
                    {s.key === "hr" && (
                      <div className="space-y-2.5">
                        {tasks.length === 0 && (
                          <p className="text-sm text-gray-400">No documents listed.</p>
                        )}
                        {tasks.map((t: any, i: number) => (
                          <TaskRow
                            key={t.id ?? i}
                            employeeId={employeeId}
                            task={t}
                            workflow={t._workflow}
                            onChanged={load}
                            locked={roleLocked}
                          />
                        ))}
                      </div>
                    )}

                    {/* IT / Delivery Team: AI recommendation panel, editable selections */}
                    {s.key !== "hr" && (
                      <div className="rounded-xl bg-[#F3F1FB] border border-[#E4DFF7] p-4">
                        <div className="text-xs font-semibold text-[#6D4FC7] uppercase tracking-wide mb-3">
                          ✦{" "}
                          {s.key === "it" ? "AI Recommended Access" : "AI Suggested Assignment"}
                        </div>
                        {tasks.length === 0 && (
                          <p className="text-sm text-gray-400">No recommendations yet.</p>
                        )}
                        <div className="space-y-2.5">
                          {tasks.map((t: any, i: number) => (
                            <TaskRow
                              key={t.id ?? i}
                              employeeId={employeeId}
                              task={t}
                              workflow={t._workflow}
                              onChanged={load}
                              locked={roleLocked}
                            />
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
   
  );
}