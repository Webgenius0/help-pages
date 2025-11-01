"use client";

import { useState, useEffect } from "react";
import { Clock, User, RotateCcw, X } from "lucide-react";

interface PageRevision {
  id: string;
  createdAt: string;
  user: {
    username: string;
    fullName: string | null;
  };
  snapshot: {
    title: string;
    content: string;
    summary?: string | null;
    status: string;
  };
  changeLog?: string | null;
}

interface VersionHistoryProps {
  pageId: string;
  onRestore: (revisionId: string) => void;
}

export function VersionHistory({ pageId, onRestore }: VersionHistoryProps) {
  const [revisions, setRevisions] = useState<PageRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRevision, setSelectedRevision] = useState<PageRevision | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRevisions();
    }
  }, [isOpen, pageId]);

  const loadRevisions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/pages/${pageId}/revisions`);
      if (response.ok) {
        const data = await response.json();
        setRevisions(data.revisions || []);
      }
    } catch (error) {
      console.error("Failed to load revisions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (revisionId: string) => {
    if (confirm("Are you sure you want to restore this version? This will create a new revision with the restored content.")) {
      await onRestore(revisionId);
      setIsOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn-ghost flex items-center space-x-2"
      >
        <Clock className="w-4 h-4" />
        <span>Version History</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-2xl font-bold text-foreground">Version History</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex h-[calc(90vh-6rem)]">
              {/* Revisions List */}
              <div className="w-1/3 border-r border-border overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center text-muted-foreground">
                    Loading...
                  </div>
                ) : revisions.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    No version history available
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
                    {revisions.map((revision) => (
                      <button
                        key={revision.id}
                        onClick={() => setSelectedRevision(revision)}
                        className={`w-full text-left p-4 rounded-lg border transition-colors ${
                          selectedRevision?.id === revision.id
                            ? "bg-accent border-primary"
                            : "border-border hover:bg-accent/50"
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <Clock className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground">
                              {new Date(revision.createdAt).toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              by {revision.user.fullName || revision.user.username}
                            </div>
                            {revision.changeLog && (
                              <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                {revision.changeLog}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Preview */}
              <div className="flex-1 overflow-y-auto">
                {selectedRevision ? (
                  <div className="p-6">
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-foreground">
                            {selectedRevision.snapshot.title}
                          </h3>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center space-x-1">
                              <User className="w-4 h-4" />
                              <span>{selectedRevision.user.fullName || selectedRevision.user.username}</span>
                            </span>
                            <span>{new Date(selectedRevision.createdAt).toLocaleString()}</span>
                            <span className="px-2 py-0.5 bg-accent rounded text-xs">
                              {selectedRevision.snapshot.status}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRestore(selectedRevision.id)}
                          className="btn-primary flex items-center space-x-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Restore</span>
                        </button>
                      </div>

                      {selectedRevision.snapshot.summary && (
                        <div className="p-4 bg-muted/50 rounded-lg border border-border mb-4">
                          {selectedRevision.snapshot.summary}
                        </div>
                      )}
                    </div>

                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg border border-border text-sm">
                        {selectedRevision.snapshot.content}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Select a revision to preview
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

