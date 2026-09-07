import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled error in render:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen bg-gray-50 items-center justify-center p-4">
          <div className="text-center max-w-lg">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-4">
              The screen hit an unexpected error and couldn't continue. Reloading will take you back to a working state.
            </p>
            <pre className="text-left text-xs text-red-700 bg-red-50 border border-red-200 rounded-md p-3 mb-6 overflow-auto max-h-40">
              {this.state.error.message || String(this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
