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

  // Mobile State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
  
  // --- Iframe Scroll & Dimension Tracking ---
  const [iframeScrollX, setIframeScrollX] = useState(0);
  const [iframeScrollY, setIframeScrollY] = useState(0);
  const [iframeWidth, setIframeWidth] = useState(0);
  const [initialIframeWidths, setInitialIframeWidths] = useState<Record<string, number>>({});

  const isPathValid = currentPath && currentPath.startsWith("/");

  // Listen for Embed Script Messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || event.data.source !== "annota-embed") return;

      // Handle scroll & dimension updates
      if (event.data.type === "scroll-update") {
        setIframeScrollX(event.data.scrollX ?? 0);
        setIframeScrollY(event.data.scrollY ?? 0);
        if (event.data.innerWidth) {
          setIframeWidth(event.data.innerWidth);
        }
        return;
      }

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

    // Close mobile menu on navigation
    setIsMobileMenuOpen(false);

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
    // Get viewport coordinates
    const vx = Math.round(e.clientX - rect.left);
    const vy = Math.round(e.clientY - rect.top);

    // Convert viewport → document space using iframe scroll offsets
    const docX = vx + iframeScrollX;
    const docY = vy + iframeScrollY;

    // Use a large bounds for clamping to allow commenting on scrolled content
    const clampedX = Math.max(0, docX);
    const clampedY = Math.max(0, docY);

    // Store document coordinates in popover (will be saved to DB)
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

  // Set initial baseline width when iframe loads
  useEffect(() => {
    if (iframeStatus === "LOADED" && iframeWidth > 0 && !initialIframeWidths[project.id]) {
      setInitialIframeWidths(prev => ({ ...prev, [project.id]: iframeWidth }));
    }
  }, [iframeStatus, iframeWidth, project.id, initialIframeWidths]);

  // Force re-render on container resize
  useEffect(() => {
    if (!overlayRef.current) return;
    const observer = new ResizeObserver(() => {
      // Trigger a light re-render to update pin positions
      setIframeWidth(prev => prev); 
    });
    observer.observe(overlayRef.current);
    return () => observer.disconnect();
  }, []);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  // Counts for mobile badge
  const totalComments = comments.length;
  const pendingTotal = comments.filter(c => c.status === 'OPEN').length;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.mainArea}>
        <AppHeader
          title={project?.name}
          logoHref={mode === 'agency' ? '/dashboard' : undefined}
          leftSlot={
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex items-center justify-center p-2 hover:bg-white/10 rounded-lg transition-all text-[#00F3FF] border border-[#00F3FF]/20 bg-[#00F3FF]/5 hover:border-[#00F3FF]/50 shadow-[0_0_10px_rgba(0,243,255,0.05)]"
              title={isSidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                {!isSidebarCollapsed && (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                )}
                {isSidebarCollapsed && (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                )}
              </svg>
            </button>
          }
          description={
            <div className="flex items-center gap-3">
              {/* Simplified Layout: Only path, cleaner visual */}
              <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1 border border-white/5">
                {isEmbedDetected ? (
                  <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" title="Page Detected" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]" title="Manual Mode" />
                )}

                {isEmbedDetected ? (
                  <span className="text-xs font-mono text-[var(--text-1)] truncate max-w-[150px] md:max-w-[300px]">
                    {currentPath}
                  </span>
                ) : (
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
                    className="bg-transparent border-none p-0 text-xs font-mono text-[var(--accent-1)] focus:outline-none w-[120px] md:w-[200px] placeholder-white/20"
                    placeholder="/path"
                  />
                )}
              </div>
            </div>
          }
          rightSlot={
            <div className="flex items-center gap-3">
              {/* MOBILE TOGGLE */}
              <button
                onClick={toggleMobileMenu}
                className="md:hidden flex items-center justify-center p-2 rounded bg-white/10 text-white relative"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
                {pendingTotal > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {pendingTotal}
                  </span>
                )}
              </button>

              {/* DESKTOP ACTIONS */}
              <div className="hidden md:flex items-center gap-3">
                {mode === "agency" && (
                  <div className="flex items-center gap-2 mr-4 border-r border-white/10 pr-4">
                    {/* Copy Embed Button */}
                    <button
                      onClick={() => {
                        const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
                        const scriptTag = `<script src="${appUrl}/embed.js" async></script>`;
                        navigator.clipboard.writeText(scriptTag);
                        toast.success('Embed script copied!');
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-white/10 text-[var(--text-1)] hover:text-white transition-colors text-xs font-medium"
                      title="Copy Embed Script"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="hidden lg:inline uppercase tracking-wide text-[10px] font-bold">Copy Embed</span>
                    </button>

                    {onRequestApprovalClick && project.status !== "APPROVED" && (
                      <button
                        onClick={onRequestApprovalClick}
                        className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-white/10 text-[var(--text-1)] hover:text-[var(--accent-1)] transition-colors text-xs font-medium"
                        title="Request Approval"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="hidden lg:inline uppercase tracking-wide text-[10px] font-bold">Request Approval</span>
                      </button>
                    )}
                  </div>
                )}

                {project?.status === "APPROVED" ? (
                  <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-bold border border-green-500/20 tracking-wide uppercase">
                    ✓ {PROJECT_STATUS_LABELS.APPROVED}
                  </span>
                ) : (
                  <button
                    className={`btn ${commentMode ? "btn-primary" : "btn-secondary"} py-1.5 px-4 text-xs font-medium 
                                                ${!isPathValid ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => {
                      if (isPathValid) setCommentMode(!commentMode);
                    }}
                    disabled={!isPathValid}
                  >
                    {commentMode ? "● Commenting" : "○ Comment"}
                  </button>
                )}
              </div>
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

          {iframeStatus !== "ERROR" && (
            <div
              ref={overlayRef}
              className={`${styles.overlay} ${commentMode ? styles.overlayActive : styles.overlayPassive}`}
              onClick={handleOverlayClick}
              style={{ pointerEvents: commentMode ? "auto" : "none" }}
            >
              {displayedComments.map((comment, i) => {
                let docX = comment.clickX;
                let docY = comment.clickY;

                // --- RESPONSIVE DRIFT COMPENSATION ---
                // If the iframe width has changed since the pin was created (or the session started),
                // and we assume the content is centered (common for most sites),
                // we adjust the X coordinate based on the width delta / 2.
                
                // For now, we'll use the *first* width we saw for this project as the "baseline".
                const baselineWidth = initialIframeWidths[project.id] || iframeWidth;
                
                // Only compensate if we have a valid baseline and current width
                if (baselineWidth > 0 && iframeWidth > 0 && baselineWidth !== iframeWidth) {
                  const widthDelta = iframeWidth - baselineWidth;
                  docX = docX + (widthDelta / 2);
                }

                const viewportX = docX - iframeScrollX;
                const viewportY = docY - iframeScrollY;

                const overlayRect = overlayRef.current?.getBoundingClientRect();
                const overlayWidth = overlayRect?.width || 0;
                const overlayHeight = overlayRect?.height || 0;

                const isOutsideViewport =
                  overlayWidth > 0 &&
                  (viewportX < -20 ||
                    viewportY < -20 ||
                    viewportX > overlayWidth + 20 ||
                    viewportY > overlayHeight + 20);

                if (isOutsideViewport) return null;

                return (
                  <div
                    key={comment.id}
                    className={`${styles.pin} ${activeCommentId === comment.id ? styles.pinActive : ""} ${comment.status === "RESOLVED" ? styles.pinResolved : ""}`}
                    style={{
                      left: viewportX,
                      top: viewportY,
                      pointerEvents: "auto",
                      display: filterStatus === comment.status ? "flex" : "none",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveCommentId(comment.id);
                      document
                        .getElementById(`comment-${comment.id}`)
                        ?.scrollIntoView({ behavior: "smooth", block: "center" });

                      if (window.innerWidth <= 768) {
                        setIsMobileMenuOpen(true);
                      }
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
                        <div className={styles.tooltipMessage}>
                          {comment.message}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Commenting UI (Popover & Helper Text) */}
              {commentMode && project.status !== "APPROVED" && (
                <>
                  {!popover.isOpen && (
                    <div className={styles.helperText}>
                      {prefilledText ? "Click to comment" : "Click anywhere"}
                    </div>
                  )}
                  {popover.isOpen && (
                    <div
                      ref={popoverRef}
                      className={styles.popover}
                      style={{
                        left: popover.x - iframeScrollX,
                        top: popover.y - iframeScrollY,
                        pointerEvents: "auto",
                      }}
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
                          disabled={submitting || !commentText.trim()}
                          onClick={handleSubmit}
                        >
                          {submitting ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}


        </div>
      </div>

      {/* Sidebar with Mobile Toggle Class */}
      <div className={`${styles.sidebar} ${isMobileMenuOpen ? styles.sidebarOpen : ''} ${isSidebarCollapsed ? styles.sidebarCollapsed : ''}`}>

        {/* Mobile Header in Menu */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-[var(--bg-1)]">
          <span className="font-bold text-lg">Feedback</span>
          <button onClick={toggleMobileMenu} className="p-2 text-[var(--text-1)]">
            ✕ Close
          </button>
        </div>

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
              <div className="px-2 pb-4 space-y-3">
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
                      : "Switch to Comment Mode to add a new note."}
                  </p>
                </>
              ) : (
                <>
                  <div className={styles.emptyStateIcon}>✓</div>
                  <div className={styles.emptyStateTitle}>
                    No resolved items
                  </div>
                  <p className={styles.emptyStateDesc}>
                    Resolved comments will appear here.
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
                onClick={() => {
                  setActiveCommentId(c.id);
                  // On mobile, keep sidebar open to read it.
                }}
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
                        // Close sidebar on mobile to allow commenting
                        if (window.innerWidth <= 768) setIsMobileMenuOpen(false);
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
