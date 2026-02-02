"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./ReviewInterface.module.css";
import AppHeader from "./AppHeader";

import { toast } from "sonner";

export type ReviewMode = "client" | "agency";

type Project = {
  id: string;
  name: string;
  baseUrl: string;
  status: "IN_REVIEW" | "APPROVED";
  approvedAt?: string | null;
};

type Comment = {
  id: string;
  message: string;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
  clickX: number;
  clickY: number;
  pageUrl?: string; // Optional for backward partial compatibility
};

interface ReviewInterfaceProps {
  mode: ReviewMode;
  project: Project;
  comments: Comment[];
  onCreateComment?: (payload: {
    x: number;
    y: number;
    message: string;
    pageUrl: string;
  }) => Promise<void>;
  onUpdateCommentStatus?: (
    commentId: string,
    status: "OPEN" | "RESOLVED",
  ) => Promise<void>;
  onPathChange?: (path: string) => void;
}

export default function ReviewInterface({
  mode,
  project,
  comments,
  onCreateComment,
  onUpdateCommentStatus,
  onPathChange,
}: ReviewInterfaceProps) {
  // UI State
  const [commentMode, setCommentMode] = useState(false);
  const [iframeStatus, setIframeStatus] = useState<
    "LOADING" | "LOADED" | "ERROR"
  >("LOADING");
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"OPEN" | "RESOLVED">("OPEN");
  const [prefilledText, setPrefilledText] = useState("");

  // Popover State
  const [popover, setPopover] = useState<{
    x: number;
    y: number;
    isOpen: boolean;
  }>({
    x: 0,
    y: 0,
    isOpen: false,
  });
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Refs
  const overlayRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Derived State
  const openCount = comments.filter((c) => c.status === "OPEN").length;
  const resolvedCount = comments.filter((c) => c.status === "RESOLVED").length;

  // --- Page Scope Logic ---
  const [isEmbedDetected, setIsEmbedDetected] = useState(false);
  const [isManualMode, setIsManualMode] = useState(true);
  const [currentPath, setCurrentPath] = useState("/");

  const isPathValid = currentPath && currentPath.startsWith("/");

  // Listen for Embed Script Messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || event.data.source !== "annota-embed") return;

      if (
        event.data.type === "handshake" ||
        event.data.type === "path-update"
      ) {
        if (!isEmbedDetected) {
          setIsEmbedDetected(true);
          setIsManualMode(false);
          toast.success("Page detected automatically!");
        }

        const path = event.data.path || "/";
        if (path !== currentPath) {
          setCurrentPath(path);
          if (onPathChange) onPathChange(path);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isEmbedDetected, currentPath, onPathChange]);

  // Update displayed comments
  const displayedComments = comments
    .filter((c) => c.status === filterStatus)
    .filter((c) => c.pageUrl === currentPath) // Strict Scoping
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  // --- Interaction Handlers ---
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (!commentMode || !overlayRef.current) return;

    // Double check safety (though button should be disabled)
    if (isManualMode && !isPathValid) {
      return;
    }

    if (popover.isOpen) {
      setPopover({ ...popover, isOpen: false });
      return;
    }

    const rect = overlayRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    // Clamp
    const clampedX = Math.max(0, Math.min(x, rect.width));
    const clampedY = Math.max(0, Math.min(y, rect.height));

    setPopover({ x: clampedX, y: clampedY, isOpen: true });
    setCommentText(prefilledText || "");
    setPrefilledText("");
  };

  const handleCancel = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPopover({ ...popover, isOpen: false });
    setCommentText("");
    setPrefilledText("");
  };

  const handleSubmit = async () => {
    if (!commentText.trim() || !onCreateComment) return;

    // Final sanity check
    if (!isPathValid) {
      toast.error("Invalid page path.");
      return;
    }

    setSubmitting(true);
    try {
      await onCreateComment({
        x: popover.x,
        y: popover.y,
        message: commentText,
        pageUrl: currentPath,
      });
      handleCancel();
      setFilterStatus("OPEN");
    } catch (err) {
      alert(
        "Failed to submit comment. Please ensure Page Path is valid (starts with /).",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Close popover on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && popover.isOpen) handleCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [popover.isOpen]);

  return (
    <div className={styles.pageContainer}>
      {/* Main Area: Header + Preview */}
      <div className={styles.mainArea}>
        <AppHeader
          title={project?.name}
          description={
            <div className="flex items-center gap-3">
              {mode === "agency" ? "Agency View" : "Client Review"}
              <span className="text-white/20">|</span>

              {/* PAGE SELECTOR */}
              <div className="flex items-center gap-2">
                {isEmbedDetected ? (
                  <>
                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                      Page detected automatically
                    </span>
                    <span className="text-xs font-mono text-[var(--muted)]">
                      {currentPath}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] uppercase tracking-wide text-yellow-500/90 whitespace-nowrap">
                      Manual Page Selection (required for this site):
                    </span>
                    <div className="flex flex-col">
                      <input
                        type="text"
                        value={currentPath}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCurrentPath(val);
                          if (onPathChange) onPathChange(val);
                          // Disable comment mode immediately if invalid
                          if (!val.startsWith("/") && commentMode) {
                            setCommentMode(false);
                          }
                        }}
                        className={`bg-black/40 border rounded px-2 py-0.5 text-xs focus:outline-none w-[160px] transition-all
                                                    ${
                                                      !isPathValid
                                                        ? "border-red-500/50 text-red-400 focus:border-red-500"
                                                        : "border-yellow-500/30 text-yellow-400 focus:border-yellow-500/60"
                                                    }
                                                `}
                        placeholder="/path (e.g. /about)"
                      />
                      {!isPathValid && (
                        <span className="text-[9px] text-red-400 absolute mt-6 bg-black/80 px-1 rounded whitespace-nowrap">
                          必须以 "/" 开头 (Must start with /)
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          }
          rightSlot={
            <div className="flex items-center gap-3">
              {/* AGENCY-ONLY: EMBED INSTRUCTIONS */}
              {mode === "agency" && (
                <div className="flex items-center gap-2 mr-4 border-r border-white/10 pr-4">
                  <button
                    onClick={() => {
                      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
                      const scriptTag = `<script src="${appUrl}/embed.js" async></script>`;
                      navigator.clipboard.writeText(scriptTag);
                      toast.success('Embed script copied!');
                    }}
                    className="text-[10px] bg-[var(--accent-1)]/10 text-[var(--accent-1)] hover:bg-[var(--accent-1)]/20 px-2 py-1 rounded font-bold tracking-wide uppercase transition-colors"
                  >
                    Copy Embed Script
                  </button>

                  {/* Manual Fallback Tooltip */}
                  <div className="group relative cursor-help">
                    <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-[var(--text-2)] hover:text-white transition-colors">
                      ?
                    </span>
                    <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-[#1A1A1A] border border-white/10 rounded shadow-xl text-xs z-[60] hidden group-hover:block pointer-events-none">
                      <div className="font-bold text-white mb-1">
                        Manual Fallback
                      </div>
                      <p className="text-[var(--text-2)]">
                        If the client cannot install the script, use{" "}
                        <strong>Manual Page Selection</strong> in the top bar to
                        ensuring comments are scoped correctly.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {mode === "agency" && (
                <span className="text-[10px] uppercase font-bold text-purple-300 bg-purple-900/40 border border-purple-700/50 px-2 py-1 rounded tracking-wide">
                  Agency Mode
                </span>
              )}
              {project?.status === "APPROVED" ? (
                <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-bold border border-green-500/20 tracking-wide uppercase">
                  ✓ Approved
                </span>
              ) : (
                <div className="flex flex-col items-end">
                  <button
                    className={`btn ${commentMode ? "btn-primary" : "btn-secondary"} py-1.5 px-3 text-xs 
                                            ${!isPathValid ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => {
                      if (isPathValid) setCommentMode(!commentMode);
                    }}
                    disabled={!isPathValid}
                  >
                    {commentMode ? "● Comment Mode" : "○ Comment Mode"}
                  </button>
                  {!isPathValid && (
                    <span className="text-[9px] text-red-400 mt-1">
                      Select a valid page path to add comments.
                    </span>
                  )}
                </div>
              )}
            </div>
          }
        />

        <div className={styles.previewContainer}>
          <iframe
            ref={iframeRef}
            src={project.baseUrl}
            className={styles.iframe}
            onLoad={() => {
              setIframeStatus("LOADED");
            }}
          />

          {iframeStatus === "ERROR" && (
            <div className={styles.fallback}>
              <h3 className="text-xl mb-4 font-bold">Preview Unavailable</h3>
              <p className="mb-6 max-w-md">
                This website blocks embedded previews (X-Frame-Options).
              </p>
              <a
                href={project.baseUrl}
                target="_blank"
                className="btn btn-primary"
              >
                Open Website ↗
              </a>
            </div>
          )}

          {/* Pins */}
          {iframeStatus !== "ERROR" &&
            displayedComments.map((comment, i) => (
              <div
                key={comment.id}
                className={`${styles.pin} ${activeCommentId === comment.id ? styles.pinActive : ""} ${comment.status === "RESOLVED" ? styles.pinResolved : ""}`}
                style={{
                  left: comment.clickX,
                  top: comment.clickY,
                  pointerEvents: commentMode ? "auto" : "none",
                  display: filterStatus === comment.status ? "flex" : "none",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveCommentId(comment.id);
                  document
                    .getElementById(`comment-${comment.id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                onMouseEnter={() => setActiveCommentId(comment.id)}
                onMouseLeave={() => setActiveCommentId(null)}
              >
                {i + 1}
                {activeCommentId === comment.id && (
                  <div className={styles.pinTooltip}>
                    <span className={styles.tooltipStatus}>
                      {comment.status}
                    </span>
                    <div className="line-clamp-3 overflow-hidden text-ellipsis">
                      {comment.message}
                    </div>
                  </div>
                )}
              </div>
            ))}

          {/* Overlay */}
          {commentMode &&
            project.status !== "APPROVED" &&
            iframeStatus !== "ERROR" && (
              <div
                ref={overlayRef}
                className={styles.overlay}
                onClick={handleOverlayClick}
              >
                {!popover.isOpen && (
                  <div className={styles.helperText}>
                    {prefilledText
                      ? "Click on the page to place your new comment"
                      : "Click anywhere to leave a comment"}
                    {!isEmbedDetected && (
                      <div className="text-[10px] mt-1 text-yellow-300/80 bg-black/50 px-2 py-0.5 rounded">
                        Automatic page detection requires the Annota script.
                      </div>
                    )}
                  </div>
                )}
                {popover.isOpen && (
                  <div
                    ref={popoverRef}
                    className={styles.popover}
                    style={{ left: popover.x, top: popover.y }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <textarea
                      autoFocus
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                          handleSubmit();
                      }}
                    />
                    <div className={styles.popoverActions}>
                      <button
                        className="btn btn-ghost py-1 px-3 text-sm"
                        onClick={(e) => handleCancel(e)}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn btn-primary py-1 px-3 text-sm"
                        onClick={handleSubmit}
                        disabled={submitting || !commentText.trim()}
                      >
                        {submitting ? "..." : "Post"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>

      {/* Sidebar */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.toggleGroup}>
            <button
              className={`${styles.toggleTab} ${filterStatus === "OPEN" ? styles.toggleTabActive : ""}`}
              onClick={() => setFilterStatus("OPEN")}
            >
              Pending
            </button>
            <button
              className={`${styles.toggleTab} ${filterStatus === "RESOLVED" ? styles.toggleTabActive : ""}`}
              onClick={() => setFilterStatus("RESOLVED")}
            >
              Resolved
            </button>
          </div>
        </div>

        <div className={styles.commentList}>
          {displayedComments.length === 0 ? (
            <div className={styles.emptyState}>
              {filterStatus === "OPEN" ? (
                <>
                  <div className={styles.emptyStateIcon}>💬</div>
                  <div className={styles.emptyStateTitle}>
                    No pending feedback
                  </div>
                  <p className={styles.emptyStateDesc}>
                    {project?.status === "APPROVED"
                      ? "This project has been approved."
                      : "Everything looks good! Switch to Comment Mode to add a new note."}
                  </p>
                </>
              ) : (
                <>
                  <div className={styles.emptyStateIcon}>✓</div>
                  <div className={styles.emptyStateTitle}>
                    No resolved items
                  </div>
                  <p className={styles.emptyStateDesc}>
                    Resolved comments will appear here for reference.
                  </p>
                </>
              )}
            </div>
          ) : (
            displayedComments.map((c, i) => (
              <div
                key={c.id}
                id={`comment-${c.id}`}
                className={`${styles.commentCard} ${activeCommentId === c.id ? styles.cardActive : ""}`}
                onMouseEnter={() => setActiveCommentId(c.id)}
                onMouseLeave={() => setActiveCommentId(null)}
                onClick={() => setActiveCommentId(c.id)}
              >
                <div className={styles.commentHeader}>
                  <div className="flex items-center gap-2">
                    <span className={styles.commentIndex}>{i + 1}</span>
                    <span className={styles.commentStatus}>{c.status}</span>
                    {/* PAGE CONTEXT LABEL */}
                    <span
                      className="text-[10px] text-[var(--muted)] opacity-60 ml-1 truncate max-w-[120px]"
                      title={c.pageUrl}
                    >
                      {c.pageUrl}
                    </span>
                  </div>

                  {/* AGENCY ACTIONS */}
                  {mode === "agency" && onUpdateCommentStatus && (
                    <div className="flex items-center gap-1">
                      {c.status === "OPEN" && (
                        <button
                          className="text-[var(--accent-1)] hover:text-white p-1"
                          title="Mark Resolved"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateCommentStatus(c.id, "RESOLVED");
                          }}
                        >
                          ✓ Resolve
                        </button>
                      )}
                      {c.status === "RESOLVED" && (
                        <button
                          className="text-[var(--text-1)] hover:text-white p-1"
                          title="Reopen"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateCommentStatus(c.id, "OPEN");
                          }}
                        >
                          ↺ Reopen
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className={styles.message}>{c.message}</div>

                {/* FOOTER */}
                <div className={styles.meta}>
                  <div>{new Date(c.createdAt).toLocaleDateString()}</div>

                  {/* Client "Not Fixed" Action */}
                  {c.status === "RESOLVED" && (
                    <button
                      className="text-[var(--accent-1)] hover:underline opacity-80 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPrefilledText(
                          `Regarding resolved comment #${i + 1}: `,
                        );
                        setCommentMode(true);
                        setFilterStatus("OPEN");
                      }}
                    >
                      Not fixed? Add new comment
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
