import { useState, useEffect } from "react";
import AdminLogin from "./admin-login";
import AdminPanel from "./admin-panel";

export default function Admin() {
  const [token, setToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("adminToken");
    if (saved) {
      fetch("/api/admin/me", { headers: { Authorization: `Bearer ${saved}` } })
        .then(r => {
          if (r.ok) setToken(saved);
          else localStorage.removeItem("adminToken");
        })
        .catch(() => localStorage.removeItem("adminToken"))
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  if (checking) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading...</div>;

  if (!token) return <AdminLogin onLogin={setToken} />;

  return <AdminPanel token={token} onLogout={() => { setToken(null); localStorage.removeItem("adminToken"); }} />;
}
