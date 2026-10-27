"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  createCategoryRpc,
  fetchAdminCategories,
  updateCategoryRpc,
} from "@/lib/admin/queries";
import type { AdminCategoryRow } from "@/lib/admin/types";
import { AdminDialog } from "@/components/admin/admin-dialog";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const [renameTarget, setRenameTarget] = useState<AdminCategoryRow | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [savingRename, setSavingRename] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const rows = await fetchAdminCategories(supabase);
      setCategories(rows);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load categories."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCategories();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadCategories]);

  async function handleCreateCategory(e: FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (trimmed.length < 2 || trimmed.length > 60) {
      setError("Category name must be between 2 and 60 characters.");
      return;
    }

    setCreating(true);
    setError(null);
    setFeedback(null);
    try {
      const supabase = createClient();
      const parentId = newParentId ? Number(newParentId) : null;
      await createCategoryRpc(supabase, trimmed, parentId);
      setNewName("");
      setNewParentId("");
      setFeedback(`Created category "${trimmed}".`);
      await loadCategories();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create category."
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(category: AdminCategoryRow) {
    setError(null);
    setFeedback(null);
    try {
      const supabase = createClient();
      const nextActive = !category.is_active;
      await updateCategoryRpc(supabase, category.id, category.name, nextActive);
      setFeedback(
        `${nextActive ? "Activated" : "Deactivated"} "${category.name}".`
      );
      await loadCategories();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update category state."
      );
    }
  }

  async function handleConfirmRename() {
    if (!renameTarget) return;
    const trimmed = renameValue.trim();
    if (trimmed.length < 2 || trimmed.length > 60) {
      setRenameError("Category name must be between 2 and 60 characters.");
      return;
    }

    setSavingRename(true);
    setRenameError(null);
    try {
      const supabase = createClient();
      await updateCategoryRpc(
        supabase,
        renameTarget.id,
        trimmed,
        renameTarget.is_active
      );
      setFeedback(`Renamed category to "${trimmed}".`);
      setRenameTarget(null);
      await loadCategories();
    } catch (err) {
      setRenameError(
        err instanceof Error ? err.message : "Could not rename category."
      );
    } finally {
      setSavingRename(false);
    }
  }

  const parentNameMap = new Map<number, string>();
  for (const c of categories) {
    parentNameMap.set(c.id, c.name);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0C2A1B]">
          Service Categories
        </h1>
        <p className="mt-1 text-sm text-[#34453B]">
          Create, rename, activate, and deactivate service categories across the ProLink marketplace.
        </p>
      </div>

      <form
        onSubmit={handleCreateCategory}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-[#DCE8E0] bg-white p-4 shadow-2xs"
      >
        <div className="min-w-[220px] flex-1">
          <label
            htmlFor="new-category-name"
            className="block text-xs font-bold text-[#0C2A1B]"
          >
            New Category Name
          </label>
          <input
            id="new-category-name"
            type="text"
            minLength={2}
            maxLength={60}
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Solar Panel Maintenance"
            className="mt-1 w-full rounded-lg border border-[#DCE8E0] px-3 py-2 text-xs text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
          />
        </div>

        <div className="min-w-[180px]">
          <label
            htmlFor="new-category-parent"
            className="block text-xs font-bold text-[#0C2A1B]"
          >
            Parent Category (optional)
          </label>
          <select
            id="new-category-parent"
            value={newParentId}
            onChange={(e) => setNewParentId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#DCE8E0] bg-white px-3 py-2 text-xs text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
          >
            <option value="">None (Top-level)</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={creating}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F6B3E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B5430] disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{creating ? "Creating..." : "Create Category"}</span>
        </button>
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
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Category Name</th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Job Count</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE8E0]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#6A7B70]">
                    Loading categories...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#6A7B70]">
                    No categories found.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-[#F8FBF9]">
                    <td className="px-4 py-3 font-mono text-[#6A7B70]">#{cat.id}</td>
                    <td className="px-4 py-3 font-bold text-[#0C2A1B]">{cat.name}</td>
                    <td className="px-4 py-3 text-[#34453B]">
                      {cat.parent_id
                        ? parentNameMap.get(cat.parent_id) ?? `#${cat.parent_id}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#0C2A1B]">
                      {cat.job_count}
                    </td>
                    <td className="px-4 py-3">
                      {cat.is_active ? (
                        <span className="inline-block rounded-full bg-[#E6F4EA] px-2.5 py-0.5 text-[11px] font-semibold text-[#0F6B3E]">
                          Active
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-gray-200 px-2.5 py-0.5 text-[11px] font-semibold text-gray-700">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRenameTarget(cat);
                            setRenameValue(cat.name);
                            setRenameError(null);
                          }}
                          className="rounded-lg border border-[#DCE8E0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0C2A1B] hover:bg-[#F4FAF6]"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(cat)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                            cat.is_active
                              ? "border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                              : "bg-[#0F6B3E] text-white hover:bg-[#0B5430]"
                          }`}
                        >
                          {cat.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminDialog
        open={Boolean(renameTarget)}
        title={renameTarget ? `Rename "${renameTarget.name}"` : "Rename Category"}
        description="Category names must be 2 to 60 characters and unique ignoring case."
        onClose={() => setRenameTarget(null)}
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="rename-category-input"
              className="block text-xs font-bold text-[#0C2A1B]"
            >
              Category Name
            </label>
            <input
              id="rename-category-input"
              type="text"
              minLength={2}
              maxLength={60}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#DCE8E0] px-3 py-2 text-xs text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
            />
          </div>

          {renameError && (
            <p role="alert" className="text-xs font-semibold text-red-700">
              {renameError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRenameTarget(null)}
              className="rounded-lg border border-[#DCE8E0] bg-white px-4 py-2 text-xs font-semibold text-[#34453B] hover:bg-[#F4FAF6]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={savingRename}
              onClick={handleConfirmRename}
              className="rounded-lg bg-[#0F6B3E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B5430] disabled:opacity-50"
            >
              {savingRename ? "Saving..." : "Save Name"}
            </button>
          </div>
        </div>
      </AdminDialog>
    </div>
  );
}
