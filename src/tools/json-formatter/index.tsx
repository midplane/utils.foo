import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { basicSetup } from "codemirror";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { linter, lintGutter } from "@codemirror/lint";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { CopyButton } from "../../components/ui/CopyButton";
import { Badge } from "../../components/ui/Badge";
import { cn } from "../../lib/utils";

// ─── Custom CodeMirror theme matching the app's warm palette ──────────────────

const appTheme = EditorView.theme(
  {
    "&": {
      fontSize: "13px",
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      background: "#FFFBF5",
      color: "#1C1917",
      border: "1px solid #E7E5E4",
      borderRadius: "8px",
      outline: "none",
      height: "100%",
    },
    "&.cm-focused": {
      outline: "none",
      border: "1px solid #EA580C",
      boxShadow: "0 0 0 3px rgba(234, 88, 12, 0.15)",
    },
    ".cm-scroller": {
      overflow: "auto",
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      height: "100%",
    },
    ".cm-content": {
      padding: "12px 4px",
      caretColor: "#EA580C",
    },
    ".cm-line": {
      padding: "0 8px",
    },
    ".cm-gutters": {
      background: "#FFF7ED",
      borderRight: "1px solid #E7E5E4",
      color: "#A8A29E",
      fontSize: "11px",
    },
    ".cm-activeLineGutter": {
      background: "#FEF3C7",
    },
    ".cm-activeLine": {
      background: "rgba(234, 88, 12, 0.04)",
    },
    ".cm-selectionBackground": {
      background: "rgba(234, 88, 12, 0.15) !important",
    },
    "&.cm-focused .cm-selectionBackground": {
      background: "rgba(234, 88, 12, 0.2) !important",
    },
    ".cm-cursor": {
      borderLeftColor: "#EA580C",
    },
    // Lint gutter
    ".cm-gutter-lint": {
      width: "18px",
      background: "#FFF7ED",
    },
    ".cm-lint-marker-error": {
      content: '""',
      display: "block",
      width: "6px",
      height: "6px",
      borderRadius: "50%",
      background: "#EF4444",
      margin: "0 auto",
    },
    // Diagnostic underline
    ".cm-lintRange-error": {
      backgroundImage:
        "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='3'><path d='m0 2.5 l2 -1.5 l2 1.5 l2 -1.5' stroke='%23EF4444' fill='none' stroke-width='1.2'/></svg>\")",
      backgroundRepeat: "repeat-x",
      backgroundPosition: "bottom",
      paddingBottom: "2px",
    },
    // Tooltip
    ".cm-tooltip": {
      background: "#1C1917",
      color: "#FFF7ED",
      border: "none",
      borderRadius: "6px",
      fontSize: "11px",
      padding: "4px 8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    },
    ".cm-tooltip-lint": {
      background: "#1C1917",
      borderRadius: "6px",
      padding: "4px 8px",
    },
    // JSON syntax colours — warm palette
    ".tok-propertyName": { color: "#C2410C", fontWeight: "500" }, // keys: deep orange
    ".tok-string": { color: "#15803D" }, // strings: forest green
    ".tok-number": { color: "#1D4ED8" }, // numbers: blue
    ".tok-bool": { color: "#7C3AED" }, // booleans: purple
    ".tok-null": { color: "#6B7280" }, // null: muted
    ".tok-punctuation": { color: "#78716C" }, // brackets/colons: muted ink
    ".tok-bracket": { color: "#78716C" },
  },
  { dark: false },
);

// ─── Validation helpers ────────────────────────────────────────────────────────

interface ValidationResult {
  valid: boolean;
  errorMessage?: string;
}

function validateJSON(text: string): ValidationResult {
  const trimmed = text.trim();
  if (!trimmed) return { valid: true };
  try {
    JSON.parse(trimmed);
    return { valid: true };
  } catch (e) {
    return { valid: false, errorMessage: (e as Error).message };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const SAMPLE_JSON = `{
  "name": "utils.foo",
  "version": "2.0.0",
  "features": ["prettify", "minify", "validate"],
  "config": {
    "indent": 2,
    "strict": true
  },
  "active": true,
  "score": 42
}`;

export default function JsonFormatterTool() {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);

  const [charCount, setCharCount] = useState(SAMPLE_JSON.length);
  const [lineCount, setLineCount] = useState(SAMPLE_JSON.split("\n").length);
  const [validState, setValidState] = useState<"idle" | "valid" | "invalid">(
    "idle",
  );
  const [currentText, setCurrentText] = useState(SAMPLE_JSON);
  const [expanded, setExpanded] = useState(false);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Build the editor once on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!editorContainerRef.current) return;

    const startState = EditorState.create({
      doc: SAMPLE_JSON,
      extensions: [
        basicSetup,
        json(),
        lintGutter(),
        linter(jsonParseLinter()),
        appTheme,
        EditorView.updateListener.of(
          (update: import("@codemirror/view").ViewUpdate) => {
            if (update.docChanged) {
              const text = update.state.doc.toString();
              setCurrentText(text);
              setCharCount(text.length);
              setLineCount(update.state.doc.lines);
              setValidState("idle");
            }
          },
        ),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorContainerRef.current,
    });

    editorViewRef.current = view;

    return () => {
      view.destroy();
      editorViewRef.current = null;
    };
  }, []);

  // ── Replace editor content ──────────────────────────────────────────────────
  const setEditorContent = useCallback((text: string) => {
    const view = editorViewRef.current;
    if (!view) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: text },
    });
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handlePrettify = () => {
    const text = currentText.trim();
    if (!text) return;
    try {
      const prettified = JSON.stringify(JSON.parse(text), null, 2);
      setEditorContent(prettified);
      setValidState("valid");
    } catch {
      setValidState("invalid");
    }
  };

  const handleMinify = () => {
    const text = currentText.trim();
    if (!text) return;
    try {
      const minified = JSON.stringify(JSON.parse(text));
      setEditorContent(minified);
      setValidState("valid");
    } catch {
      setValidState("invalid");
    }
  };

  const handleValidate = () => {
    const result = validateJSON(currentText);
    setValidState(result.valid ? "valid" : "invalid");
  };

  const handleClear = () => {
    setEditorContent("");
    setValidState("idle");
  };

  const handleSample = () => {
    setEditorContent(SAMPLE_JSON);
    setValidState("idle");
  };

  return (
    <>
      {/* Backdrop below the sticky header */}
      {expanded && (
        <div
          className="fixed left-0 right-0 bottom-0 bg-black/40 z-40 backdrop-blur-sm"
          style={{ top: "41px" }}
          onClick={() => setExpanded(false)}
        />
      )}

      <div className={cn("space-y-4 animate-fade-in", expanded && "relative z-50")}>
        {/* Breadcrumb & Header — hidden in expanded mode */}
        {!expanded && (
          <div className="space-y-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white">
                <JsonIcon className="w-3.5 h-3.5" />
              </div>
              <h1 className="font-mono text-lg font-semibold text-[var(--color-ink)]">
                JSON <span className="text-[var(--color-accent)]">Formatter</span>
              </h1>
            </div>
          </div>
        )}

        {/* Main Card */}
        <Card
          className={cn(
            expanded && "fixed left-4 right-4 bottom-4 z-50 shadow-2xl overflow-auto",
          )}
          style={expanded ? { top: "calc(41px + 8px)" } : undefined}
        >
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              {/* Action buttons */}
              <div className="flex items-center gap-1.5">
                <Button variant="secondary" size="sm" onClick={handlePrettify} className="gap-1.5 text-xs h-7 px-3">
                  <PrettifyIcon className="w-3 h-3" />
                  Prettify
                </Button>
                <Button variant="secondary" size="sm" onClick={handleMinify} className="gap-1.5 text-xs h-7 px-3">
                  <MinifyIcon className="w-3 h-3" />
                  Minify
                </Button>
                <Button variant="secondary" size="sm" onClick={handleValidate} className="gap-1.5 text-xs h-7 px-3">
                  <ValidateIcon className="w-3 h-3" />
                  Validate
                </Button>

                {validState === "valid" && (
                  <Badge variant="success" className="text-[10px] animate-fade-in">Valid JSON</Badge>
                )}
                {validState === "invalid" && (
                  <Badge variant="error" className="text-[10px] animate-fade-in">Invalid JSON</Badge>
                )}
              </div>

              {/* Secondary actions */}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={handleSample} className="gap-1 text-xs h-7 px-2">
                  <SampleIcon className="w-3 h-3" />
                  Sample
                </Button>
                <CopyButton text={currentText} />
                <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1 text-xs h-7 px-2">
                  <TrashIcon className="w-3 h-3" />
                  Clear
                </Button>
                {/* Expand / collapse */}
                <button
                  onClick={() => setExpanded((v) => !v)}
                  title={expanded ? "Collapse editor" : "Expand editor"}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-dark)] transition-colors cursor-pointer"
                >
                  {expanded ? <CollapseIcon className="w-3.5 h-3.5" /> : <ExpandIcon className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Editor — explicit pixel height so CodeMirror fills the space correctly */}
            <div
              ref={editorContainerRef}
              style={{ height: expanded ? "calc(100vh - 161px)" : "560px" }}
              className={cn(
                "rounded-lg",
                validState === "invalid" && "outline outline-2 outline-red-300",
              )}
            />

            {/* Stats row */}
            <div className="flex items-center gap-4 mt-2 flex-shrink-0">
              <span className="text-[10px] text-[var(--color-ink-muted)]">
                {lineCount} {lineCount === 1 ? "line" : "lines"}
              </span>
              <span className="text-[10px] text-[var(--color-ink-muted)]">
                {charCount} {charCount === 1 ? "char" : "chars"}
              </span>
              {expanded && (
                <span className="text-[10px] text-[var(--color-ink-muted)] ml-auto">
                  Press <kbd className="px-1 py-0.5 bg-[var(--color-cream-dark)] border border-[var(--color-border)] rounded text-[9px]">Esc</kbd> or click outside to collapse
                </span>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function JsonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 8h10M7 12h4m-4 4h10M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function PrettifyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 10h10M4 14h12M4 18h8"
      />
    </svg>
  );
}

function MinifyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 9l-4 4 4 4M16 9l4 4-4 4"
      />
    </svg>
  );
}

function ValidateIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function SampleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
      />
    </svg>
  );
}

function CollapseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 9L4 4m0 0h4M4 4v4m11-4l5 5m0-5h-4m4 0v4M9 15l-5 5m0 0h4m-4 0v-4m11 4l5-5m0 5h-4m4 0v-4"
      />
    </svg>
  );
}
