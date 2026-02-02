"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./ReviewInterface.module.css";
import AppHeader from "./AppHeader";
import { PROJECT_STATUS_LABELS } from "../src/lib/constants";

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
  onRequestApprovalClick?: () => void;
}

export default function ReviewInterface({
  mode,
  project,
  comments,
  onCreateComment,
  onUpdateCommentStatus,
  onPathChange,
  onRequestApprovalClick,
}: ReviewInterfaceProps) {
  // UI State
  const [commentMode, setCommentMode] = useState(false);
  const [iframeStatus, setIframeStatus] = useState<
    "LOADING" | "LOADED" | "ERROR"
  >("LOADING");
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"OPEN" | "RESOLVED">("OPEN");
  const [prefilledText, setPrefilledText] = useState("");
  const [isInboxExpanded, setIsInboxExpanded] = useState(true);

  // Iframe & Navigation State
  const [iframeSrc, setIframeSrc] = useState(project.baseUrl);

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

  // Derived State: Feedback Inbox Logic
  const pageSummary = comments.reduce((acc, c) => {
    const path = c.pageUrl || "/";
    if (!acc[path]) acc[path] = { path, pending: 0, resolved: 0 };
    if (c.status === "OPEN") acc[path].pending++;
    if (c.status === "RESOLVED") acc[path].resolved++;
    return acc;
  }, {} as Record<string, { path: string; pending: number; resolved: number }>);

  // Split into "Action Needed" (Pending) and "Done" (Resolved Only)
  const pagesWithPending = Object.values(pageSummary)
    .filter((p) => p.pending > 0)
    .sort((a, b) => b.pending - a.pending); // Sort desc by pending count

  const pagesResolvedOnly = Object.values(pageSummary)
    .filter((p) => p.pending === 0 && p.resolved > 0)
    .sort((a, b) => a.path.localeCompare(b.path)); // Sort alpha

  const totalActionPages = pagesWithPending.length;

  // Update displayed comments
  const displayedComments = comments
    .filter((c) => c.status === filterStatus)
    .filter((c) => c.pageUrl === currentPath) // Strict Scoping
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  // Navigation Helper
  const handlePageClick = (path: string) => {
    setCurrentPath(path);
    if (onPathChange) onPathChange(path);

    // If clicking a page with pending items, switch filter to OPEN to see them
    const pageStats = pageSummary[path];
    if (pageStats?.pending > 0) {
      setFilterStatus("OPEN");
    } else if (pageStats?.resolved > 0) {
      setFilterStatus("RESOLVED");
    }

    // Navigate Iframe
    try {
      const base = project.baseUrl.replace(/\/$/, "");
      const target = path === "/" ? base : `${base}${path}`;
      setIframeSrc(target);
    } catch (e) {
      console.error("Navigation error", e);
    }
  };

  // --- Interaction Handlers ---
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (!commentMode || !overlayRef.current) return;

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
      toast.error(
        "Failed to submit comment. Please ensure Page Path is valid (starts with /).",
      );
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && popover.isOpen) handleCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [popover.isOpen]);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.mainArea}>
        <AppHeader
          title={project?.name}
          logoHref={mode === 'agency' ? '/dashboard' : undefined}
          description={
            <div className="flex items-center gap-3">
              {mode === "agency" && (
                <>
                  Agency View
                  <span className="text-white/20">|</span>
                </>
              )}

              <div className="flex items-center gap-2">
                {isEmbedDetected ? (
                  <>
                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                      Page detected
                    </span>
                    <span className="text-xs font-mono text-[var(--muted)]">
                      {currentPath}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] uppercase tracking-wide text-yellow-500/90 whitespace-nowrap">
                      Manual Page Selection:
                    </span>
                    <div className="flex flex-col">
                      <input
                        type="text"
                        value={currentPath}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCurrentPath(val);
                          if (onPathChange) onPathChange(val);
                          if (!val.startsWith("/") && commentMode) {
                            setCommentMode(false);
                          }
                        }}
                        className={`bg-black/40 border rounded px-2 py-0.5 text-xs focus:outline-none w-[160px] transition-all
                                                    ${!isPathValid
                            ? "border-red-500/50 text-red-400 focus:border-red-500"
                            : "border-yellow-500/30 text-yellow-400 focus:border-yellow-500/60"
                          }
                                                `}
                        placeholder="/path (e.g. /about)"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          }
          rightSlot={
            <div className="flex items-center gap-3">
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

                  {onRequestApprovalClick && project.status !== "APPROVED" && (
                    <button
                      onClick={onRequestApprovalClick}
                      className="text-xs font-semibold bg-[var(--accent-0)]/10 text-[var(--accent-0)] border border-[var(--accent-0)]/20 hover:bg-[var(--accent-0)]/20 px-3 py-1.5 rounded transition-all ml-2 flex items-center gap-2 shadow-[0_0_10px_rgba(0,243,255,0.05)] hover:shadow-[0_0_15px_rgba(0,243,255,0.15)]"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Request Approval
                    </button>
                  )}
                </div>
              )}

              {project?.status === "APPROVED" ? (
                <div className="flex flex-col items-end">
                  <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-bold border border-green-500/20 tracking-wide uppercase">
                    ✓ {PROJECT_STATUS_LABELS.APPROVED}
                  </span>
                  {project.approvedAt && (
                    <span className="text-[10px] text-[var(--muted)] mt-1">
                      {new Date(project.approvedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
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
            src={iframeSrc}
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
                      {PROJECT_STATUS_LABELS[comment.status] || comment.status}
                    </span>
                    <div className="line-clamp-3 overflow-hidden text-ellipsis">
                      {comment.message}
                    </div>
                  </div>
                )}
              </div>
            ))}

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

      <div className={styles.sidebar}>
        {/* FEEDBACK INBOX SECTION */}
        {(pagesWithPending.length > 0 || pagesResolvedOnly.length > 0) && (
          <div className="border-b border-white/5">
            <button
              onClick={() => setIsInboxExpanded(!isInboxExpanded)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[var(--text-1)] uppercase tracking-wider">Inbox</span>
                {totalActionPages > 0 && !isInboxExpanded && (
                  <span className="text-[10px] text-[var(--accent-1)] font-medium">
                    {totalActionPages} pages pending
                  </span>
                )}
              </div>
              <span className={`text-[var(--text-2)] text-[10px] transition-transform ${isInboxExpanded ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {isInboxExpanded && (
              <div className="px-2 pb-4 space-y-3 max-h-[300px] overflow-y-auto">
                {/* Action Needed Group */}
                {pagesWithPending.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] text-[var(--text-2)] uppercase tracking-widest font-bold px-2 mb-1 opacity-70">
                      Needs Review
                    </div>
                    {pagesWithPending.map((page) => (
                      <button
                        key={page.path}
                        onClick={() => handlePageClick(page.path)}
                        className={`w-full flex items-center justify-between px-2 py-2 rounded text-xs transition-all border border-transparent
                                        ${currentPath === page.path
                            ? 'bg-white/10 text-white border-white/5 shadow-sm'
                            : 'text-[var(--text-1)] hover:bg-white/5'
                          }`}
                      >
                        <span className="truncate flex-1 text-left font-medium" title={page.path}>
                          {page.path}
                        </span>
                        <span className="bg-[var(--accent-1)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 shadow-[0_0_8px_rgba(255,59,48,0.4)]">
                          {page.pending}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Resolved Only Group */}
                {pagesResolvedOnly.length > 0 && (
                  <div className="space-y-1 pt-2">
                    <div className="text-[10px] text-[var(--text-2)] uppercase tracking-widest font-bold px-2 mb-1 opacity-50">
                      Done
                    </div>
                    {pagesResolvedOnly.map((page) => (
                      <button
                        key={page.path}
                        onClick={() => handlePageClick(page.path)}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors
                                        ${currentPath === page.path
                            ? 'bg-white/5 text-[var(--text-1)]'
                            : 'text-[var(--text-2)] hover:bg-white/5 hover:text-[var(--text-1)]'
                          }`}
                      >
                        <span className="truncate flex-1 text-left" title={page.path}>
                          {page.path}
                        </span>
                        <span className="text-[var(--text-2)] text-[10px]">
                          ✓
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {pagesWithPending.length === 0 && pagesResolvedOnly.length === 0 && (
                  <div className="text-[10px] text-[var(--muted)] text-center py-4 italic">
                    No feedback yet.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className={styles.sidebarHeader}>
          <div className={styles.toggleGroup}>
            <button
              className={`${styles.toggleTab} ${filterStatus === "OPEN" ? styles.toggleTabActive : ""}`}
              onClick={() => setFilterStatus("OPEN")}
            >
              {PROJECT_STATUS_LABELS.OPEN}
            </button>
            <button
              className={`${styles.toggleTab} ${filterStatus === "RESOLVED" ? styles.toggleTabActive : ""}`}
              onClick={() => setFilterStatus("RESOLVED")}
            >
              {PROJECT_STATUS_LABELS.RESOLVED}
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
                      ? "This project has been approved by the client."
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
                    <span className={styles.commentStatus}>
                      {PROJECT_STATUS_LABELS[c.status] || c.status}
                    </span>
                    <span
                      className="text-[10px] text-[var(--muted)] opacity-60 ml-1 truncate max-w-[120px]"
                      title={c.pageUrl}
                    >
                      {c.pageUrl}
                    </span>
                  </div>

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

                <div className={styles.meta}>
                  <div>{new Date(c.createdAt).toLocaleDateString()}</div>

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

        <div className="mt-auto pt-4 pb-2 text-center border-t border-white/5">
          <span className="text-[10px] text-[var(--muted)] opacity-40 font-medium tracking-wider uppercase">
            Feedback powered by Annota
          </span>
        </div>
      </div>
    </div>
  );
}
