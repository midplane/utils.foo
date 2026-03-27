import { useCallback, useEffect, useRef, useState } from "react";
import { Braces, AlignLeft, ChevronsLeftRight, CircleCheck, RefreshCw, Trash2, ListFilter, Play, X, HelpCircle } from "lucide-react";
import { basicSetup } from "codemirror";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { linter, lintGutter } from "@codemirror/lint";
import { JSONPath } from "jsonpath-plus";
import { Button } from "../../components/ui/Button";
import { CopyButton } from "../../components/ui/CopyButton";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { ToolHeader } from "../../components/ui/ToolHeader";
import { Alert } from "../../components/ui/Alert";
import {
  useExpandable,
  ExpandableCard,
  ExpandableCardHeader,
  ExpandableCardContent,
  ExpandToggleButton,
  ExpandHint,
} from "../../components/ui/ExpandableCard";
import { cn } from "../../lib/utils";
import { appTheme } from "../../lib/codemirrorTheme";

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

// ─── JSONPath cheatsheet ──────────────────────────────────────────────────────

const JSONPATH_CHEATSHEET = [
  { expr: "$",        desc: "Root element" },
  { expr: ".key",     desc: "Child key" },
  { expr: "..key",    desc: "Recursive / deep search" },
  { expr: "[0]",      desc: "Array index (0-based)" },
  { expr: "[-1]",     desc: "Last array item" },
  { expr: "[*]",      desc: "All array items" },
  { expr: "[0,2]",    desc: "Items at index 0 and 2" },
  { expr: "[0:3]",    desc: "Slice: indices 0–2" },
  { expr: ".*",       desc: "All children of an object" },
  { expr: "[?(@.x)]", desc: "Filter: items that have key x" },
  { expr: "[?(@>2)]", desc: "Filter: items where value > 2" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function JsonFormatterTool() {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const resultContainerRef = useRef<HTMLDivElement>(null);
  const resultViewRef = useRef<EditorView | null>(null);

  const [charCount, setCharCount] = useState(0);
  const [lineCount, setLineCount] = useState(0);
  const [validState, setValidState] = useState<"idle" | "valid" | "invalid">(
    "idle",
  );
  const [currentText, setCurrentText] = useState('');
  const { expanded, setExpanded } = useExpandable();

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterExpr, setFilterExpr] = useState("$");
  const [filterResult, setFilterResult] = useState("");
  const [filterError, setFilterError] = useState("");
  const [showCheatsheet, setShowCheatsheet] = useState(false);

  // ── Build the result (read-only) editor on mount ────────────────────────────
  useEffect(() => {
    if (!resultContainerRef.current) return;

    const startState = EditorState.create({
      doc: "",
      extensions: [
        basicSetup,
        json(),
        appTheme,
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: resultContainerRef.current,
    });

    resultViewRef.current = view;

    return () => {
      view.destroy();
      resultViewRef.current = null;
    };
  }, []);

  // Sync filterResult into the read-only result editor
  useEffect(() => {
    const view = resultViewRef.current;
    if (!view) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: filterResult },
    });
  }, [filterResult]);

  // ── Build the editor once on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!editorContainerRef.current) return;

    const startState = EditorState.create({
      doc: '',
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

  // ── Filter ───────────────────────────────────────────────────────────────────
  const handleRunFilter = (expr?: string) => {
    const path = (expr ?? filterExpr).trim();
    if (!path) { setFilterResult(""); setFilterError(""); return; }
    try {
      const parsed = JSON.parse(currentText) as object;
      const result = JSONPath({ path, json: parsed });
      setFilterResult(JSON.stringify(result, null, 2));
      setFilterError("");
    } catch (e) {
      setFilterError(e instanceof Error ? e.message : "Filter failed");
      setFilterResult("");
    }
  };

  const handleClearFilter = () => {
    setFilterExpr("$");
    setFilterResult("");
    setFilterError("");
    setShowCheatsheet(false);
  };

  return (
    <>
      <div className={cn("space-y-4 animate-fade-in", expanded && "relative z-50")}>
        {/* Breadcrumb & Header — hidden in expanded mode */}
          {!expanded && (
            <ToolHeader icon={<Braces />} title="JSON" accentedSuffix="Formatter" />
          )}

        {/* Main Card */}
        <ExpandableCard expanded={expanded} onExpandedChange={setExpanded}>
          <ExpandableCardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              {/* Action buttons */}
              <div className="flex items-center gap-1.5">
                <Button variant="secondary" size="sm" onClick={handlePrettify} className="gap-1.5 text-xs h-7 px-3">
                  <AlignLeft className="w-3 h-3" />
                  Prettify
                </Button>
                <Button variant="secondary" size="sm" onClick={handleMinify} className="gap-1.5 text-xs h-7 px-3">
                  <ChevronsLeftRight className="w-3 h-3" />
                  Minify
                </Button>
                <Button variant="secondary" size="sm" onClick={handleValidate} className="gap-1.5 text-xs h-7 px-3">
                   <CircleCheck className="w-3 h-3" />
                   Validate
                 </Button>
                 <Button
                   variant="secondary"
                   size="sm"
                   onClick={() => setFilterOpen((v) => !v)}
                   className={cn("gap-1.5 text-xs h-7 px-3", filterOpen && "text-[var(--color-accent)] border-[var(--color-accent)]")}
                 >
                   <ListFilter className="w-3 h-3" />
                   Filter
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
                  <RefreshCw className="w-3 h-3" />
                  Sample
                </Button>
                <CopyButton text={currentText} />
                <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1 text-xs h-7 px-2">
                  <Trash2 className="w-3 h-3" />
                  Clear
                </Button>
                {/* Expand / collapse */}
                <ExpandToggleButton />
              </div>
            </div>
          </ExpandableCardHeader>

          <ExpandableCardContent>
            {/* ── Filter controls — full-width row, right column only ────── */}
            {filterOpen && (
              <div className="grid grid-cols-2 gap-3 mb-2 animate-fade-in">
                {/* Left column: empty placeholder to keep alignment */}
                <div />

                {/* Right column: expression input + cheatsheet */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={filterExpr}
                      onChange={(e) => setFilterExpr(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleRunFilter(); }}
                      placeholder="e.g. $.features[*]"
                      className="font-mono text-xs h-7 flex-1 min-w-0"
                    />
                    <Button variant="secondary" size="sm" onClick={() => handleRunFilter()} className="gap-1 text-xs h-7 px-3 shrink-0">
                      <Play className="w-3 h-3" />
                      Run
                    </Button>
                    <button
                      onClick={() => setShowCheatsheet((v) => !v)}
                      title="JSONPath syntax reference"
                      className={cn(
                        "inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors cursor-pointer shrink-0",
                        showCheatsheet
                          ? "text-[var(--color-accent)] bg-orange-50"
                          : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-dark)]"
                      )}
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleClearFilter}
                      title="Clear filter"
                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-dark)] transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Cheatsheet */}
                  {showCheatsheet && (
                    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-cream-dark)] px-3 py-2 animate-fade-in">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)] mb-1.5">JSONPath quick reference</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                        {JSONPATH_CHEATSHEET.map((row) => (
                          <div key={row.expr} className="flex items-baseline gap-2">
                            <code className="text-[11px] font-mono text-[var(--color-accent)] shrink-0">{row.expr}</code>
                            <span className="text-[10px] text-[var(--color-ink-muted)]">{row.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error banner */}
                  {filterError && (
                    <Alert variant="error" size="sm" className="font-mono animate-fade-in">{filterError}</Alert>
                  )}
                </div>
              </div>
            )}

            {/* Two-pane layout when filter is open, single-pane otherwise */}
            <div className={cn(filterOpen && "grid grid-cols-2 gap-3")}>

              {/* ── Source pane ─────────────────────────────────────────────── */}
              <div className="flex flex-col gap-1">
                <div
                  ref={editorContainerRef}
                  style={{ height: expanded ? "calc(100vh - 161px)" : "560px" }}
                  className={cn(
                    "rounded-lg",
                    validState === "invalid" && "outline outline-2 outline-red-300",
                  )}
                />
                {/* Stats row */}
                <div className="flex items-center gap-4 mt-1 flex-shrink-0">
                  <span className="text-[10px] text-[var(--color-ink-muted)]">
                    {lineCount} {lineCount === 1 ? "line" : "lines"}
                  </span>
                  <span className="text-[10px] text-[var(--color-ink-muted)]">
                    {charCount} {charCount === 1 ? "char" : "chars"}
                  </span>
                  <ExpandHint className="ml-auto" />
                </div>
              </div>

              {/* ── Result pane — always in DOM so the ref is stable ─────────── */}
              <div className={cn("flex flex-col gap-2", !filterOpen && "hidden")}>
                {/* Result editor */}
                <div
                  ref={resultContainerRef}
                  style={{ height: expanded ? "calc(100vh - 161px)" : "560px" }}
                  className="rounded-lg border border-[var(--color-border)] overflow-auto"
                />
                {/* Result stats + copy */}
                <div className="flex items-center gap-4 mt-1 flex-shrink-0">
                  {filterResult
                    ? <span className="text-[10px] text-[var(--color-ink-muted)]">{filterResult.split("\n").length} lines</span>
                    : <span className="text-[10px] text-[var(--color-ink-muted)] italic">Press Run to see results</span>
                  }
                  {filterResult && <CopyButton text={filterResult} />}
                </div>
              </div>

            </div>
          </ExpandableCardContent>
        </ExpandableCard>

      </div>
    </>
  );
}


