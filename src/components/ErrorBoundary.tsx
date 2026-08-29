import React, { Component } from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Shown in the fallback so a rep knows which part of the workspace failed. */
  area?: string;
  /** Clears the failed state when this value changes (e.g. the active tab). */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Stops one bad render from taking down the whole workspace.
 *
 * This exists because AI-returned JSON is not a trusted shape: a single missing
 * key used to unmount the entire app to a white screen, losing whatever the rep
 * had open. A rep must always be able to get back to their pipeline.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // This project has no @types/react installed, so React's class-component
  // generics resolve to nothing and inherited members are invisible to tsc.
  // `declare` describes what React supplies at runtime and emits no code.
  declare props: ErrorBoundaryProps;
  declare setState: (state: ErrorBoundaryState) => void;

  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[Plasgain] ${this.props.area || "Workspace"} render failed:`, error, info.componentStack);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private handleRetry = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        className="rounded-panel border-2 border-urgent bg-urgent-wash p-6 m-2 flex gap-4 items-start"
        data-testid="error-boundary-fallback"
      >
        <AlertOctagon className="w-6 h-6 text-urgent shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-2 min-w-0">
          <div className="text-body font-bold text-urgent">
            {this.props.area || "This screen"} could not be displayed
          </div>
          <p className="text-meta text-ink-dim leading-relaxed max-w-prose">
            Nothing was saved or sent. Your CRM records are unaffected — switch to another
            screen and come back, or retry below. If it keeps happening, send this to support:
          </p>
          <p className="text-spec font-mono text-ink-dim bg-white/60 border border-line rounded-edge px-2.5 py-1.5 break-words">
            {this.state.error.message || String(this.state.error)}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 text-meta font-bold text-urgent hover:text-urgent underline underline-offset-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Retry
          </button>
        </div>
      </div>
    );
  }
}
