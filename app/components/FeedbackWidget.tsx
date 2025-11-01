"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, MessageSquare, X, Send } from "lucide-react";

interface FeedbackWidgetProps {
  pageId: string;
  pageTitle?: string;
}

export function FeedbackWidget({ pageId, pageTitle }: FeedbackWidgetProps) {
  const [feedback, setFeedback] = useState<"helpful" | "not-helpful" | null>(
    null
  );
  const [comment, setComment] = useState("");
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (value: "helpful" | "not-helpful") => {
    setFeedback(value);
    if (value === "not-helpful") {
      setShowCommentBox(true);
    } else {
      await submitFeedback(value, "");
    }
  };

  const submitFeedback = async (
    value: "helpful" | "not-helpful",
    commentText: string
  ) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId,
          helpful: value === "helpful",
          comment: commentText,
          pageTitle,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        setShowCommentBox(false);
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div>
        <p className="text-sm text-muted-foreground text-center">
          Thank you for your feedback! 🙏
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium text-foreground/70 mb-3">
        Is this helpful?
      </p>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => handleFeedback("helpful")}
          disabled={isSubmitting || feedback !== null}
          className={`p-2 rounded-md border transition-colors ${
            feedback === "helpful"
              ? "bg-primary/10 border-primary text-primary"
              : "border-border hover:bg-muted text-muted-foreground hover:text-foreground"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <ThumbsUp className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleFeedback("not-helpful")}
          disabled={isSubmitting || feedback !== null}
          className={`p-2 rounded-md border transition-colors ${
            feedback === "not-helpful"
              ? "bg-destructive/10 border-destructive text-destructive"
              : "border-border hover:bg-muted text-muted-foreground hover:text-foreground"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <ThumbsDown className="w-4 h-4" />
        </button>
      </div>

      {showCommentBox && (
        <div className="mt-4 max-w-md mx-auto">
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What can we improve? (optional)"
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              rows={3}
            />
          </div>
          <div className="flex items-center justify-end space-x-2 mt-2">
            <button
              onClick={() => {
                setShowCommentBox(false);
                setFeedback(null);
              }}
              className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => submitFeedback("not-helpful", comment)}
              disabled={isSubmitting}
              className="btn-primary text-sm flex items-center space-x-1"
            >
              <Send className="w-3 h-3" />
              <span>Send Feedback</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

