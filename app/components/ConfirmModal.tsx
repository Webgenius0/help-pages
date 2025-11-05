"use client";

import { X, AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger";
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in-0 zoom-in-95">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
              variant === "danger" ? "bg-destructive/10" : "bg-primary/10"
            }`}
          >
            <AlertTriangle
              className={`w-6 h-6 ${
                variant === "danger" ? "text-destructive" : "text-primary"
              }`}
            />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          {!isLoading && (
            <button
              onClick={handleCancel}
              className="p-1 hover:bg-muted rounded-md transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-border">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="btn-secondary inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-md text-white shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto ${
              variant === "danger"
                ? "bg-destructive hover:bg-destructive/90"
                : "bg-[#1A7A4A] hover:bg-[#158A5A]"
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                <span>Processing...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
