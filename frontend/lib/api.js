// Single place all screens call through -- keeps the API base URL and
// fetch error handling consistent across every page.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json();
}

export const api = {
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  listEmployees: () => request("/employees"),
  getEmployee: (id) => request(`/employees/${id}`),
  createEmployee: (payload) =>
    request("/employees", { method: "POST", body: JSON.stringify(payload) }),
  syncHrmsNewHires: () => request("/hrms/sync/new-hires", { method: "POST" }),
  syncHrmsExits: () => request("/hrms/sync/exits", { method: "POST" }),
  onboardingStatus: (id) => request(`/onboarding/${id}/status`),
  offboardingStatus: (id) => request(`/offboarding/${id}/status`),
  accessRecommendation: (id) => request(`/access/${id}/recommendation`),
  assets: (id) => request(`/assets/${id}`),
  approvals: (id) => request(`/approvals/${id}`),
  decideApproval: (id, role, status) =>
    request(`/approvals/${id}/${role}/decide`, { method: "POST", body: JSON.stringify({ status }) }),
  auditTrail: (id) => request(`/audit/${id}`),
};
