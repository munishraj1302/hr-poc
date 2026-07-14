"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/useAuth";
import Sidebar from "../components/Sidebar";

function Search({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function RefreshCw({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  onboarding: "Onboarding",
  documents_pending: "Documents Pending",
  inactive: "Inactive",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  onboarding: "bg-amber-100 text-amber-700",
  documents_pending: "bg-blue-100 text-blue-700",
  inactive: "bg-red-100 text-red-700",
};

export default function DirectoryPage() {

  useAuth();

  const router = useRouter();

  const [employees, setEmployees] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");


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


  const filtered = employees.filter((e) => {

    const q = search.toLowerCase();


    return (
      e.name?.toLowerCase().includes(q) ||
      e.employee_id?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q) ||
      e.role?.toLowerCase().includes(q) ||
      e.office?.toLowerCase().includes(q) ||
      e.manager?.toLowerCase().includes(q) ||
      e.status?.toLowerCase().includes(q)
    );

  });



  return (

    <Sidebar>


      <div className="bg-[#FAFAF9] min-h-screen w-full p-6 flex-1">


        {/* Header */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">


          <div>


            <p className="uppercase tracking-[0.25em] text-xs text-[#D9A653]">

              Employee Management

            </p>


            <h2 className="mt-2 text-4xl font-bold text-[#14213D]">

              Employee Directory

            </h2>


            <p className="mt-2 text-gray-500">

              View and manage employee records.

            </p>


          </div>



          <button

            onClick={handleSync}

            disabled={syncing}

            className="flex items-center gap-2 rounded-xl bg-[#14213D] px-5 py-3 text-white hover:bg-[#243654] disabled:opacity-60 transition"

          >

            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />

            {syncing ? "Syncing..." : "Sync from HRMS"}

          </button>


        </div>




        {/* Search */}

        <div className="mt-8 w-full">


          <div className="flex items-center gap-4 mb-5">


            <div className="relative w-full">

              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input

                value={search}

                onChange={(e)=>setSearch(e.target.value)}

                placeholder="Search employees..."

                className="w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-[#D9A653] focus:border-transparent"

              />

            </div>


            <div className="whitespace-nowrap rounded-full bg-[#D9A653]/10 px-4 py-2.5 text-sm font-medium text-[#14213D]">

              {filtered.length} Employees

            </div>


          </div>




          {/* Table */}

          <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">


            <table className="w-full table-fixed">


              <thead className="bg-[#F4F1EC] border-b border-gray-200">


                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">


                 <th className="p-3 w-[21%]">
  Employee
</th>

<th className="p-3 w-[14%]">
  Department
</th>

<th className="p-3 w-[13%]">
  Role
</th>

<th className="p-3 w-[10%]">
  Experience
</th>

<th className="p-3 w-[10%]">
  Manager
</th>

<th className="p-3 w-[14%]">
  Status
</th>

<th className="p-3 w-[10%]">
  Progress
</th>

<th className="p-3 w-[8%]">
  Profile
</th>
                </tr>


              </thead>


              <tbody>
                {filtered.map((e, idx) => (

  <tr
    key={e.id}
    className={`border-t border-gray-100 hover:bg-gray-50 transition ${
      idx % 2 === 1 ? "bg-gray-50/50" : ""
    }`}
  >


    {/* Employee */}

    <td className="p-3 py-3.5 align-top">

      <div className="flex items-center gap-2">


        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#14213D] text-white text-xs font-bold shrink-0">

          {e.name
            ?.split(" ")
            .map((x: string) => x[0])
            .join("")
            .slice(0, 2)}

        </div>


        <div className="min-w-0">


          <div className="font-semibold text-[#14213D] truncate">

            {e.name}

          </div>


          <div className="text-xs text-gray-500 truncate">

            {e.employee_id}

          </div>


          {e.email && (

            <div className="text-xs text-gray-500 break-all">

              {e.email}

            </div>

          )}


        </div>


      </div>


    </td>




    {/* Department */}

    <td className="p-3 py-3.5 align-top">


      <div className="truncate">

        {e.department}

      </div>


      <div className="text-xs text-gray-500 truncate">

        {e.office || "—"}

      </div>


    </td>




    {/* Role */}

    <td className="p-3 py-3.5 align-top">

      <div className="break-words">
        {e.role || "—"}
      </div>

    </td>




    {/* Experience */}

    <td className="p-3 py-3.5 align-top">


      {e.experience_level ? (

        <span

          className={`rounded-full px-2 py-1 text-xs font-semibold whitespace-nowrap ${
            e.experience_level === "fresher"
              ? "bg-sky-100 text-sky-700"
              : "bg-violet-100 text-violet-700"
          }`}

        >

          {e.experience_level}

        </span>

      ) : (

        "—"

      )}


    </td>




    {/* Manager */}

    <td className="p-3 py-3.5 align-top truncate">

      {e.manager || "—"}

    </td>




    {/* Status */}

    <td className="p-3 py-3.5 align-top">


      <span

        className={`inline-block rounded-full px-2 py-1 text-xs font-semibold whitespace-nowrap ${
          STATUS_STYLES[e.status?.toLowerCase()] || "bg-gray-100 text-gray-700"
        }`}

      >

        {STATUS_LABELS[e.status?.toLowerCase()] || e.status}

      </span>


    </td>




    {/* Progress */}

    <td className="p-3 py-3.5 align-top">


      <div className="flex items-center gap-2">


        <div className="w-16 h-2 rounded-full bg-gray-200 overflow-hidden">


          <div

            className="h-full bg-[#D9A653]"

            style={{
              width: `${e.completion_pct || 0}%`
            }}

          />


        </div>


        <span className="text-xs text-gray-600">

          {e.completion_pct || 0}%

        </span>


      </div>


    </td>




    {/* Profile */}

    <td className="p-3 py-3.5 align-top">


      <button

        onClick={() => router.push(`/profile/${e.id}`)}

        className="rounded-lg bg-[#14213D] px-3 py-1.5 text-xs text-white hover:bg-[#243654] transition"

      >

        View

      </button>


    </td>



  </tr>


))}




{filtered.length === 0 && (

  <tr>

    <td
      colSpan={8}
      className="p-10 text-center text-gray-500"
    >

      No employees found.

    </td>

  </tr>

)}



              </tbody>


            </table>


          </div>


        </div>


      </div>


    </Sidebar>


  );

}