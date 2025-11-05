"use client";

import { useState } from "react";
import { Download, FileText, Code, FileType } from "lucide-react";
import toast from "react-hot-toast";

interface ExportButtonProps {
  pageId: string;
  pageName: string;
}

export function ExportButton({ pageId, pageName }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: "markdown" | "html" | "pdf") => {
    setExporting(true);
    try {
      const response = await fetch(
        `/api/export?format=${format}&pageId=${pageId}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }

      // Get the blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${pageName}.${format === "markdown" ? "md" : format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setIsOpen(false);
      toast.success(`Exported as ${format.toUpperCase()} successfully!`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(`Failed to export: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary flex items-center space-x-2"
        disabled={exporting}
      >
        <Download className="w-4 h-4" />
        <span>{exporting ? "Exporting..." : "Export"}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-popover border border-border rounded-lg shadow-lg z-50">
            <div className="py-1">
              <button
                onClick={() => handleExport("markdown")}
                className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent flex items-center space-x-3"
              >
                <FileText className="w-4 h-4" />
                <span>Markdown (.md)</span>
              </button>
              <button
                onClick={() => handleExport("html")}
                className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent flex items-center space-x-3"
              >
                <Code className="w-4 h-4" />
                <span>HTML (.html)</span>
              </button>
              <button
                onClick={() => handleExport("pdf")}
                className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent flex items-center space-x-3 opacity-50 cursor-not-allowed"
                disabled
              >
                <FileType className="w-4 h-4" />
                <span>PDF (Coming Soon)</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

