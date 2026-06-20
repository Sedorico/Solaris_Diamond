"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/ui";

interface AdminUserRow {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  createdAt: string;
  tenant: { businessName: string | null };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const url = search ? `/api/admin/users?search=${encodeURIComponent(search)}` : "/api/admin/users";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action: "suspend" | "reactivate" | "delete", userId: string) {
    setActingId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId }),
      });
      if (!res.ok) throw new Error("Action failed");
      toast.success(`User ${action}d`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Subscribers"
        description="Every account on the platform — manage status and access."
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 pl-9"
          />
        </div>
      </PageHeader>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">No users found.</p>
        ) : (
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Business</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{u.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {u.tenant.businessName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.role}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        u.status === "ACTIVE"
                          ? "success"
                          : u.status === "SUSPENDED"
                            ? "muted"
                            : "warning"
                      }
                    >
                      {u.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString("en-PH")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.status === "ACTIVE" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={actingId === u.id}
                        onClick={() => act("suspend", u.id)}
                      >
                        Suspend
                      </Button>
                    )}
                    {u.status === "SUSPENDED" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={actingId === u.id}
                        onClick={() => act("reactivate", u.id)}
                      >
                        Reactivate
                      </Button>
                    )}
                    {u.status !== "DELETED" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={actingId === u.id}
                        onClick={() => act("delete", u.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
