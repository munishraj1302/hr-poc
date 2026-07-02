"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, getRole, clearToken } from "./api";

export function useAuth() {
  const router = useRouter();
  const [role, setRole] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
    } else {
      setRole(getRole());
    }
  }, []);

  function logout() {
    clearToken();
    router.push("/login");
  }

  return { role, logout };
}