"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Search, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  fetchAdminUsers,
  setUserSuspendedRpc,
} from "@/lib/admin/queries";
import {
  searchAdminUsers,
  suggestAdminUsers,
} from "@/lib/api/admin";
import type {
  AdminUserRow,
  UserSuggestionDto,
} from "@/lib/admin/types";
import {
  AdminDialog,
  AdminPagination,
  useDebouncedValue,
} from "@/components/admin/admin-dialog";
import { useAdminViewer } from "@/components/admin/admin-shell";

export default function AdminUsersPage() {
  const { adminId } = useAdminViewer();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);

  const [suggestions, setSuggestions] = useState<UserSuggestionDto[]>([]);
  const [filterIds, setFilterIds] = useState<string[] | null>(null);
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [dialogTarget, setDialogTarget] = useState<{
    user: AdminUserRow;
    suspend: boolean;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const trimmed = debouncedQuery.trim();
    const timer = setTimeout(() => {
      if (!trimmed) {
        if (!active) return;
        setSuggestions([]);
        setFilterIds(null);
        return;
      }

      void Promise.all([
        suggestAdminUsers(trimmed, 8),
        searchAdminUsers(trimmed),
      ])
        .then(([sugItems, searchItems]) => {
          if (!active) return;
          setSuggestions(sugItems);
          const ids = Array.from(
            new Set([
              ...searchItems.map((s) => s.id),
              ...sugItems.map((s) => s.id),
            ])
          );
          setFilterIds(ids);
          setPage(1);
        })
        .catch(() => {
          if (!active) return;
          setSuggestions([]);
        });
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [debouncedQuery]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const result = await fetchAdminUsers(supabase, {
        page,
        pageSize: 20,
        filterIds,
      });
      setRows(result.rows);
      setTotalCount(result.totalCount);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load user profiles."
      );
    } finally {
      setLoading(false);
    }
  }, [page, filterIds]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadUsers();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  async function handleFullSearchSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setFilterIds(null);
      setSuggestions([]);
      setPage(1);
      return;
    }
    try {
      const hits = await searchAdminUsers(trimmed);
      setFilterIds(hits.map((h) => h.id));
      setSuggestions([]);
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "User search failed.");
    }
  }

  async function handleConfirmSuspension() {
    if (!dialogTarget) return;
    const trimmedReason = reason.trim();

    setSubmitting(true);
    setDialogError(null);
    try {
      const supabase = createClient();
      await setUserSuspendedRpc(
        supabase,
        dialogTarget.user.id,
        dialogTarget.suspend,
        trimmedReason || (dialogTarget.suspend
          ? "Account suspended by administrator."
          : "Account unsuspended by administrator.")
      );
      setFeedback(
        dialogTarget.suspend
          ? `Suspended ${dialogTarget.user.full_name}.`
          : `Unsuspended ${dialogTarget.user.full_name}.`
      );
      setDialogTarget(null);
      await loadUsers();
    } catch (err) {
      setDialogError(
        err instanceof Error ? err.message : "Could not update user suspension state."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0C2A1B]">
          User Directory & Access Control
        </h1>
        <p className="mt-1 text-sm text-[#34453B]">
          Search users via Trie prefix autocomplete and InvertedIndex full-text search, or manage account suspensions.
        </p>
      </div>

      <form
        onSubmit={handleFullSearchSubmit}
        className="relative max-w-xl"
        role="search"
        aria-label="Search users"
      >
        <label htmlFor="admin-user-search" className="sr-only">
          Search users by name
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6A7B70]"
              aria-hidden="true"
            />
            <input
              id="admin-user-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users by name (e.g. Demo, Ahmed, Fatima)..."
              className="w-full rounded-lg border border-[#DCE8E0] bg-white py-2 pl-9 pr-8 text-xs text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  setFilterIds(null);
                  setSuggestions([]);
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6A7B70] hover:text-[#0C2A1B]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="rounded-lg bg-[#0F6B3E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B5430]"
          >
            Search
          </button>
        </div>

        {suggestions.length > 0 && (
          <div
            role="listbox"
            aria-label="User prefix suggestions"
            className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded-lg border border-[#DCE8E0] bg-white p-2 text-xs shadow-sm"
          >
            <span className="text-[11px] font-semibold text-[#6A7B70]">
              Suggestions:
            </span>
            {suggestions.map((sug) => (
              <button
                key={sug.id}
                type="button"
                onClick={() => {
                  setQuery(sug.displayName);
                  setFilterIds([sug.id]);
                  setSuggestions([]);
                  setPage(1);
                }}
                className="rounded-md border border-[#CDE9D6] bg-[#E6F4EA] px-2 py-0.5 text-[11px] font-semibold text-[#0F6B3E] hover:bg-[#d5ecdc]"
              >
                {sug.displayName}
              </button>
            ))}
          </div>
        )}
      </form>

      {feedback && (
        <div
          role="status"
          className="rounded-xl border border-[#CDE9D6] bg-[#E6F4EA] px-4 py-3 text-xs font-semibold text-[#0C2A1B]"
        >
          {feedback}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800"
        >
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[#DCE8E0] bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#DCE8E0] bg-[#F4FAF6] text-[11px] font-bold uppercase text-[#34453B]">
              <tr>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE8E0]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#6A7B70]">
                    Loading users...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#6A7B70]">
                    No users matched your criteria.
                  </td>
                </tr>
              ) : (
                rows.map((user) => {
                  const isSelfOrAdmin = user.id === adminId || user.role === "admin";
                  return (
                    <tr key={user.id} className="hover:bg-[#F8FBF9]">
                      <td className="px-4 py-3 font-semibold text-[#0C2A1B]">
                        <div>{user.full_name}</div>
                        <div className="font-mono text-[10px] font-normal text-[#6A7B70]">
                          {user.id}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            user.role === "admin"
                              ? "bg-[#E6F4EA] text-[#0F6B3E]"
                              : "bg-gray-100 text-[#34453B]"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.is_suspended ? (
                          <div>
                            <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-800">
                              Suspended
                            </span>
                            {user.suspended_reason && (
                              <p className="mt-1 max-w-xs text-[11px] text-red-700">
                                {user.suspended_reason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-block rounded-full bg-[#E6F4EA] px-2.5 py-0.5 text-[11px] font-semibold text-[#0F6B3E]">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#34453B]">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {user.is_suspended ? (
                          <button
                            type="button"
                            disabled={isSelfOrAdmin}
                            onClick={() => {
                              setDialogTarget({ user, suspend: false });
                              setReason("");
                              setDialogError(null);
                            }}
                            className="rounded-lg border border-[#0F6B3E] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F6B3E] hover:bg-[#E6F4EA] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Unsuspend
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isSelfOrAdmin}
                            title={
                              isSelfOrAdmin
                                ? "Administrators cannot suspend themselves or other admins"
                                : "Suspend user account"
                            }
                            onClick={() => {
                              setDialogTarget({ user, suspend: true });
                              setReason("");
                              setDialogError(null);
                            }}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Suspend
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination
          page={page}
          pageSize={20}
          totalCount={totalCount}
          onPageChange={setPage}
        />
      </div>

      <AdminDialog
        open={Boolean(dialogTarget)}
        title={
          dialogTarget
            ? `${dialogTarget.suspend ? "Suspend" : "Unsuspend"} ${
                dialogTarget.user.full_name
              }`
            : "Account Suspension"
        }
        description={
          dialogTarget?.suspend
            ? "Suspending immediately blocks sign-in and hides approved professional privileges. A note is optional."
            : "Restore this user's normal access to the platform."
        }
        onClose={() => setDialogTarget(null)}
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="suspension-reason-input"
              className="block text-xs font-bold text-[#0C2A1B]"
            >
              Reason <span className="font-normal text-[#6A7B70]">(optional)</span>
            </label>
            <textarea
              id="suspension-reason-input"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                dialogTarget?.suspend
                  ? "Add an optional suspension note..."
                  : "Optional note for unsuspending..."
              }
              className="mt-1.5 w-full rounded-lg border border-[#DCE8E0] px-3 py-2 text-xs text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
            />
          </div>

          {dialogError && (
            <p role="alert" className="text-xs font-semibold text-red-700">
              {dialogError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDialogTarget(null)}
              className="rounded-lg border border-[#DCE8E0] bg-white px-4 py-2 text-xs font-semibold text-[#34453B] hover:bg-[#F4FAF6]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirmSuspension}
              className={`rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 ${
                dialogTarget?.suspend
                  ? "bg-red-700 hover:bg-red-800"
                  : "bg-[#0F6B3E] hover:bg-[#0B5430]"
              }`}
            >
              {submitting
                ? "Saving..."
                : dialogTarget?.suspend
                ? "Confirm Suspend"
                : "Confirm Unsuspend"}
            </button>
          </div>
        </div>
      </AdminDialog>
    </div>
  );
}
