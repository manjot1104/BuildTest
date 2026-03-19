"use client";

import { useState, useEffect, useRef } from "react";
import {
  Github, GitBranch, ChevronDown, ChevronUp,
  Loader2, CheckCircle2, XCircle, AlertCircle,
  Code2, ShieldCheck, User,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useGithubStatus } from "@/client-api/query-hooks/use-github-hooks";
import { useRouter } from "next/navigation";

export interface GithubSourceValue {
  owner: string;
  repo: string;
  branch: string;
}

interface GithubSourcePanelProps {
  onChange: (value: GithubSourceValue | null) => void;
  disabled?: boolean;
}

type ValState = "idle" | "validating" | "valid" | "invalid";

export function GithubSourcePanel({ onChange, disabled = false }: GithubSourcePanelProps) {
  const router = useRouter();
  const { data: githubStatus, isLoading } = useGithubStatus();

  const [expanded, setExpanded] = useState(false);
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("");

  const [valState, setValState] = useState<ValState>("idle");
  const [valError, setValError] = useState("");
  const [valDefault, setValDefault] = useState("");

  const lastValidated = useRef("");  // "owner/repo@branch" of last successful validation

  const githubConnected = githubStatus?.connected === true;

  // Pre-fill owner from the connected GitHub login so the user doesn't have to type it
  useEffect(() => {
    if (githubStatus?.login && owner === "") {
      setOwner(githubStatus.login);
    }
  }, [githubStatus?.login, owner]);

  const ownerTrimmed = owner.trim();
  const repoTrimmed = repo.trim();
  const branchTrimmed = branch.trim() || "main";
  const inputsFilled = ownerTrimmed !== "" && repoTrimmed !== "";

  // Reset when user edits after validating
  useEffect(() => {
    if (lastValidated.current === "") return;
    const key = `${ownerTrimmed}/${repoTrimmed}@${branchTrimmed}`;
    if (key !== lastValidated.current) {
      lastValidated.current = "";
      setValState("idle");
      setValError("");
      onChange(null);
    }
  }, [ownerTrimmed, repoTrimmed, branchTrimmed, onChange]);

  async function handleValidate() {
    if (!inputsFilled || valState === "validating") return;

    setValState("validating");
    setValError("");
    onChange(null);

    try {
      const qs = new URLSearchParams({ owner: ownerTrimmed, repo: repoTrimmed, branch: branchTrimmed });
      const res = await fetch(`/api/github/validate?${qs}`);
      const json = await res.json() as {
        valid: boolean;
        defaultBranch?: string;
        message?: string;
      };

      if (json.valid) {
        setValState("valid");
        setValDefault(json.defaultBranch ?? branchTrimmed);
        lastValidated.current = `${ownerTrimmed}/${repoTrimmed}@${branchTrimmed}`;
        onChange({ owner: ownerTrimmed, repo: repoTrimmed, branch: branchTrimmed });
      } else {
        setValState("invalid");
        setValError(json.message ?? "Validation failed");
        onChange(null);
      }
    } catch {
      setValState("invalid");
      setValError("Could not reach the server — check your connection.");
      onChange(null);
    }
  }

  function handleClear() {
    setRepo("");
    setBranch("");
    setValState("idle");
    setValError("");
    lastValidated.current = "";
    onChange(null);
    // Keep owner pre-filled — no reason to clear it
  }

  const isValidating = valState === "validating";

  function btnLabel() {
    if (isValidating) return "Checking…";
    if (valState === "valid") return "Validated ✓";
    if (valState === "invalid") return "Retry";
    return "Validate Repo";
  }

  function btnClass() {
    const base = "inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-ring";
    if (isValidating)
      return `${base} bg-muted text-muted-foreground border border-border cursor-wait`;
    if (valState === "valid")
      return `${base} bg-emerald-600 text-white hover:bg-emerald-500`;
    if (valState === "invalid")
      return `${base} bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20`;
    return `${base} bg-primary text-primary-foreground hover:bg-primary/90`;
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">

      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Source Code Analysis
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/40 border border-border/40 rounded-full px-1.5 py-0.5">
            optional
          </span>
          {valState === "valid" && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {githubConnected && githubStatus?.login && (
            <span className="text-[10px] font-mono text-muted-foreground/50 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
              @{githubStatus.login}
            </span>
          )}
          {expanded
            ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          }
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="border-t border-border px-4 pt-4 pb-4 space-y-4">

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground font-mono">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Checking GitHub connection…
            </div>
          )}

          {/* No GitHub account */}
          {!isLoading && !githubConnected && (
            <div className="space-y-3">
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
                <Github className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">No GitHub account connected</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Sign in with GitHub to attach a repository and get more precise AI-generated test cases.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="flex items-center justify-center gap-2 w-full h-9 rounded-lg bg-[#24292f] text-white text-xs font-semibold hover:bg-[#2f363d] transition-colors"
              >
                <Github className="h-4 w-4" />
                Sign in with GitHub
              </button>
            </div>
          )}

          {/* GitHub connected — show form */}
          {!isLoading && githubConnected && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                The pipeline will read your routes, schemas, and validation rules to write
                more precise test cases.
              </p>

              {/* Two-column: owner + repo */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-3 w-3" />
                    Owner
                    <span className="normal-case font-sans font-normal text-muted-foreground/40">(GitHub username or org)</span>
                  </label>
                  <Input
                    placeholder="e.g. vercel"
                    value={owner}
                    onChange={e => setOwner(e.target.value)}
                    disabled={isValidating}
                    className="h-9 text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Github className="h-3 w-3" />
                    Repository
                    <span className="normal-case font-sans font-normal text-muted-foreground/40">(repo name only)</span>
                  </label>
                  <Input
                    placeholder="e.g. next.js"
                    value={repo}
                    onChange={e => setRepo(e.target.value)}
                    disabled={isValidating}
                    className="h-9 text-sm font-mono"
                  />
                </div>
              </div>

              {/* Preview of full path */}
              {(ownerTrimmed || repoTrimmed) && (
                <p className="text-[11px] font-mono text-muted-foreground/50 flex items-center gap-1">
                  Full path:&nbsp;
                  <span className="text-foreground/70">
                    {ownerTrimmed || "owner"}/{repoTrimmed || "repo"}
                  </span>
                </p>
              )}

              {/* Branch */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <GitBranch className="h-3 w-3" />
                  Branch
                  <span className="normal-case font-sans font-normal text-muted-foreground/40">(leave blank for main)</span>
                </label>
                <Input
                  placeholder="main"
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                  disabled={isValidating}
                  className="h-9 text-sm font-mono"
                />
              </div>

              {/* Validate button — appears once owner + repo are filled */}
              {inputsFilled && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={isValidating}
                      onClick={() => { void handleValidate(); }}
                      className={btnClass()}
                    >
                      {isValidating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {!isValidating && valState === "valid" && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {!isValidating && valState === "invalid" && <XCircle className="h-3.5 w-3.5" />}
                      {!isValidating && valState === "idle" && <ShieldCheck className="h-3.5 w-3.5" />}
                      {btnLabel()}
                    </button>

                    {!isValidating && (
                      <button
                        type="button"
                        onClick={handleClear}
                        className="text-[11px] font-mono text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Validating hint */}
                  {isValidating && (
                    <p className="text-[11px] text-muted-foreground/60 font-mono flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                      Contacting GitHub, please wait…
                    </p>
                  )}

                  {/* Error */}
                  {valState === "invalid" && (
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/5 border border-red-500/20">
                      <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-400 font-mono">{valError}</p>
                    </div>
                  )}

                  {/* Success */}
                  {valState === "valid" && (
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-xs font-mono space-y-0.5">
                        <p className="text-emerald-400">
                          <span className="font-bold">{ownerTrimmed}/{repoTrimmed}</span>
                          {" @ "}{branchTrimmed}
                          {valDefault && branchTrimmed !== valDefault && (
                            <span className="text-muted-foreground font-normal"> · default is {valDefault}</span>
                          )}
                        </p>
                        <p className="text-emerald-400/50">Source code will be included in test generation.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Hint when fields empty */}
              {!inputsFilled && (
                <p className="text-[11px] text-muted-foreground/40 font-mono">
                  Fill in owner and repo above to validate.
                </p>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}