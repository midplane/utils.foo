import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Card, CardHeader, CardContent } from "./Card";
import { cn } from "../../lib/utils";

// ─── useExpandable hook ───────────────────────────────────────────────────────

export interface UseExpandableOptions {
  /** Initial expanded state (default: false) */
  defaultExpanded?: boolean;
  /** Callback when expanded state changes */
  onExpandedChange?: (expanded: boolean) => void;
}

export interface UseExpandableReturn {
  /** Current expanded state */
  expanded: boolean;
  /** Toggle expanded state */
  toggle: () => void;
  /** Set expanded state directly */
  setExpanded: (value: boolean) => void;
  /** Collapse the card */
  collapse: () => void;
  /** Expand the card */
  expand: () => void;
}

/**
 * Hook for managing expandable card state with Escape key support.
 *
 * @example
 * const { expanded, toggle } = useExpandable()
 * // Escape key automatically collapses when expanded
 */
export function useExpandable(
  options: UseExpandableOptions = {},
): UseExpandableReturn {
  const { defaultExpanded = false, onExpandedChange } = options;
  const [expanded, setExpandedState] = useState(defaultExpanded);

  const setExpanded = useCallback(
    (value: boolean) => {
      setExpandedState(value);
      onExpandedChange?.(value);
    },
    [onExpandedChange],
  );

  const toggle = useCallback(
    () => setExpanded(!expanded),
    [expanded, setExpanded],
  );
  const collapse = useCallback(() => setExpanded(false), [setExpanded]);
  const expand = useCallback(() => setExpanded(true), [setExpanded]);

  // Escape key to collapse
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") collapse();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, collapse]);

  return { expanded, toggle, setExpanded, collapse, expand };
}

// ─── Shared sizing ────────────────────────────────────────────────────────────

/**
 * Height for a scrollable pane inside an expanded (fullscreen) ExpandableCard.
 *
 * The expanded card is edge-to-edge (`inset-0`), so the only chrome to subtract
 * is the card's own: ~45px header + 24px content padding + ~26px footer/stats
 * row. Tools share this constant so the value lives in exactly one place.
 */
export const EXPANDED_PANE_HEIGHT = 'calc(100vh - 95px)'

/**
 * Height for a scrollable pane in the normal (non-expanded) state.
 *
 * Scales with the viewport so tall monitors do not leave dead space below the
 * card and short laptops are not forced to scroll, while the bounds keep the
 * pane usable at either extreme.
 */
export const DEFAULT_PANE_HEIGHT = 'clamp(420px, 62vh, 760px)'

// ─── ExpandableCard context ───────────────────────────────────────────────────

interface ExpandableCardContextValue {
  expanded: boolean;
  toggle: () => void;
  collapse: () => void;
}

const ExpandableCardContext = createContext<ExpandableCardContextValue | null>(
  null,
);

export function useExpandableCard() {
  const ctx = useContext(ExpandableCardContext);
  if (!ctx)
    throw new Error("useExpandableCard must be used within ExpandableCard");
  return ctx;
}

// ─── ExpandableCard component ─────────────────────────────────────────────────

export interface ExpandableCardProps {
  /** Current expanded state */
  expanded: boolean;
  /** Callback to set expanded state */
  onExpandedChange: (expanded: boolean) => void;
  /** Card content */
  children: ReactNode;
  /** Additional class name for the card */
  className?: string;
}

/**
 * A Card that can expand to fill the entire viewport.
 *
 * Features:
 * - True fullscreen expansion — covers the site header, edge to edge
 * - Escape key to collapse
 * - Locks background scroll while expanded
 * - Provides context for child components to access expanded state
 *
 * Note: because the expanded card covers the whole viewport there is no
 * click-outside target; Escape is the collapse affordance (see ExpandHint).
 *
 * @example
 * const { expanded, setExpanded } = useExpandable()
 *
 * <ExpandableCard expanded={expanded} onExpandedChange={setExpanded}>
 *   <ExpandableCardHeader>
 *     <div>Title</div>
 *     <ExpandToggleButton />
 *   </ExpandableCardHeader>
 *   <ExpandableCardContent>
 *     Content here
 *   </ExpandableCardContent>
 * </ExpandableCard>
 */
export function ExpandableCard({
  expanded,
  onExpandedChange,
  children,
  className,
}: ExpandableCardProps) {
  const toggle = useCallback(
    () => onExpandedChange(!expanded),
    [expanded, onExpandedChange],
  );
  const collapse = useCallback(
    () => onExpandedChange(false),
    [onExpandedChange],
  );

  // While fullscreen: lock background scroll, and flag the document so CSS can
  // lift <main> above the sticky site header. A portal would be the textbook
  // fix for the stacking context, but relocating the DOM subtree remounts
  // children — which would destroy and rebuild editor instances (CodeMirror et
  // al.) and discard the user's input.
  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.dataset.expandedCard = "true";
    return () => {
      document.body.style.overflow = previousOverflow;
      delete document.body.dataset.expandedCard;
    };
  }, [expanded]);

  return (
    <ExpandableCardContext.Provider value={{ expanded, toggle, collapse }}>
      <Card
        className={cn(
          expanded &&
            // z-[60] clears the sticky site header (z-50) so the card covers it.
            "fixed inset-0 z-[60] rounded-none border-0 overflow-auto",
          className,
        )}
      >
        {children}
      </Card>
    </ExpandableCardContext.Provider>
  );
}

// ─── ExpandableCardHeader ─────────────────────────────────────────────────────

export interface ExpandableCardHeaderProps {
  children: ReactNode;
  className?: string;
}

/**
 * Header section for ExpandableCard. Wraps CardHeader.
 */
export function ExpandableCardHeader({
  children,
  className,
}: ExpandableCardHeaderProps) {
  return <CardHeader className={className}>{children}</CardHeader>;
}

// ─── ExpandableCardContent ────────────────────────────────────────────────────

export interface ExpandableCardContentProps {
  children: ReactNode;
  className?: string;
}

/**
 * Content section for ExpandableCard. Wraps CardContent.
 */
export function ExpandableCardContent({
  children,
  className,
}: ExpandableCardContentProps) {
  return <CardContent className={className}>{children}</CardContent>;
}

// ─── ExpandToggleButton ───────────────────────────────────────────────────────

export interface ExpandToggleButtonProps {
  /** Additional class name */
  className?: string;
}

/**
 * A button that toggles the expanded state of the parent ExpandableCard.
 * Automatically shows Maximize2 or Minimize2 icon based on state.
 *
 * @example
 * <ExpandableCardHeader>
 *   <div>Actions</div>
 *   <ExpandToggleButton />
 * </ExpandableCardHeader>
 */
export function ExpandToggleButton({ className }: ExpandToggleButtonProps) {
  const { expanded, toggle } = useExpandableCard();

  return (
    <button
      onClick={toggle}
      title={expanded ? "Collapse" : "Expand"}
      className={cn(
        "inline-flex items-center justify-center w-7 h-7 rounded-lg",
        "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]",
        "hover:bg-[var(--color-cream-dark)] transition-colors cursor-pointer",
        className,
      )}
    >
      {expanded ? (
        <Minimize2 className="w-3.5 h-3.5" />
      ) : (
        <Maximize2 className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

// ─── ExpandHint ───────────────────────────────────────────────────────────────

export interface ExpandHintProps {
  /** Additional class name */
  className?: string;
}

/**
 * Shows "Press Esc to collapse" hint when expanded.
 * Only renders when the card is expanded.
 *
 * @example
 * <div className="flex items-center gap-4 mt-2">
 *   <span>42 lines</span>
 *   <ExpandHint />
 * </div>
 */
export function ExpandHint({ className }: ExpandHintProps) {
  const { expanded } = useExpandableCard();

  if (!expanded) return null;

  return (
    <span
      className={cn("text-[10px] text-[var(--color-ink-muted)]", className)}
    >
      Press{" "}
      <kbd className="px-1 py-0.5 bg-[var(--color-cream-dark)] border border-[var(--color-border)] rounded text-[9px]">
        Esc
      </kbd>{" "}
      to collapse
    </span>
  );
}
