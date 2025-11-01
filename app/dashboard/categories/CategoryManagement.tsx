"use client";

import { useState } from "react";
import { Breadcrumb } from "@/app/components/Breadcrumb";
import { Plus, Edit2, Trash2, Folder, Save, X, Loader2 } from "lucide-react";
import { generateSlug, isValidSlug, getSlugErrorMessage } from "@/lib/slug";

interface NavHeader {
  id: string;
  label: string;
  slug: string;
  icon?: string | null;
  position: number;
  parentId?: string | null;
  parent?: NavHeader | null;
  children?: NavHeader[];
}

interface User {
  id: string;
  role: string;
}

interface CategoryManagementProps {
  user: User;
  initialHeaders: NavHeader[];
}

export function CategoryManagement({ user, initialHeaders }: CategoryManagementProps) {
  const [headers, setHeaders] = useState<NavHeader[]>(initialHeaders);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ label: "", slug: "", parentId: null as string | null });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newCategory.label.trim()) {
      alert('Label is required');
      return;
    }

    const normalizedSlug = generateSlug(newCategory.slug || newCategory.label);
    if (!isValidSlug(normalizedSlug)) {
      const errorMsg = getSlugErrorMessage(normalizedSlug);
      alert(errorMsg || 'Invalid slug format');
      return;
    }

    try {
      setCreating(true);
      // Allow React to re-render with loading state
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const response = await fetch('/api/nav-headers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCategory,
          slug: normalizedSlug,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setHeaders([...headers, data.header]);
        setNewCategory({ label: "", slug: "", parentId: null });
        setIsAddingNew(false);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Failed to create category:', error);
      alert('Failed to create category');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const response = await fetch(`/api/nav-headers/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setHeaders(headers.filter(h => h.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('Failed to delete category');
    }
  };

  const renderHeader = (header: NavHeader, level = 0) => {
    return (
      <div key={header.id} className="border-b border-border last:border-0">
        <div 
          className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
          style={{ paddingLeft: `${1 + level * 2}rem` }}
        >
          <div className="flex items-center space-x-3">
            <Folder className="w-5 h-5 text-primary" />
            <div>
              <div className="font-medium text-foreground">{header.label}</div>
              <div className="text-sm text-muted-foreground">/{header.slug}</div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setEditingId(header.id)}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            {user.role === 'admin' && (
              <button
                onClick={() => handleDelete(header.id)}
                className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {header.children && header.children.map(child => renderHeader(child, level + 1))}
      </div>
    );
  };

  // Filter top-level headers (no parent)
  const topLevelHeaders = headers.filter(h => !h.parentId);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Breadcrumb
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Categories" },
            ]}
          />
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Categories</h1>
            <p className="text-muted-foreground mt-2">
              Organize your documentation with categories and subcategories
            </p>
          </div>

          <button
            onClick={() => setIsAddingNew(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Category</span>
          </button>
        </div>

        {/* New Category Form */}
        {isAddingNew && (
          <div className="card mb-6">
            <div className="card-content">
              <h3 className="text-lg font-semibold mb-4">Create New Category</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Label</label>
                  <input
                    type="text"
                    value={newCategory.label}
                    onChange={(e) => {
                      const label = e.target.value;
                      const autoSlug = generateSlug(label);
                      setNewCategory({
                        ...newCategory,
                        label,
                        slug: !newCategory.slug || newCategory.slug === generateSlug(newCategory.label)
                          ? autoSlug
                          : newCategory.slug,
                      });
                    }}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input"
                    placeholder="Getting Started"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Slug</label>
                  <input
                    type="text"
                    value={newCategory.slug}
                    onChange={(e) => setNewCategory({ ...newCategory, slug: generateSlug(e.target.value) })}
                    className={`w-full px-4 py-2 border rounded-lg bg-input font-mono text-sm ${
                      newCategory.slug && !isValidSlug(newCategory.slug)
                        ? "border-destructive"
                        : "border-border"
                    }`}
                    placeholder="getting-started"
                  />
                  {newCategory.slug && !isValidSlug(newCategory.slug) && (
                    <p className="mt-1 text-xs text-destructive">
                      {getSlugErrorMessage(newCategory.slug)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Parent Category (Optional)</label>
                  <select
                    value={newCategory.parentId || ""}
                    onChange={(e) => setNewCategory({ ...newCategory, parentId: e.target.value || null })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input"
                  >
                    <option value="">None (Top Level)</option>
                    {topLevelHeaders.map(h => (
                      <option key={h.id} value={h.id}>{h.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setIsAddingNew(false);
                      setNewCategory({ label: "", slug: "", parentId: null });
                    }}
                    className="btn-ghost flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={handleCreate}
                    className="btn-primary flex items-center space-x-2"
                    disabled={creating}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Create</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Categories List */}
        <div className="card">
          <div className="card-content p-0">
            {topLevelHeaders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No categories yet. Create your first category to get started.
              </div>
            ) : (
              topLevelHeaders.map(header => renderHeader(header))
            )}
          </div>
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
          <h3 className="font-semibold mb-2">💡 Tips:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Create top-level categories for main sections (e.g., API, Guides, Tutorials)</li>
            <li>• Use subcategories to organize related content</li>
            <li>• Slug should be URL-friendly (lowercase, hyphens instead of spaces)</li>
            <li>• Drag-and-drop reordering coming soon!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

