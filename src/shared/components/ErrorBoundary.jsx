
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    render() {
        if (this.state.hasError) {
            // Fallback UI
            return (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 text-center bg-red-50/50 rounded-2xl border border-red-100">
                    <div className="p-3 bg-red-100 rounded-full mb-4">
                        <AlertCircle size={32} className="text-red-500" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h2>
                    <p className="text-sm text-gray-600 mb-6 max-w-md">
                        We encountered an error while loading this section. Please try refreshing or navigate to a different tab.
                    </p>

                    {/* Dev Info (optional, hiding in prod ideally) */}
                    {this.state.error && (
                        <div className="mb-6 p-4 bg-white rounded-lg border border-red-100 text-left w-full max-w-lg overflow-auto max-h-40 text-xs font-mono text-red-800">
                            {this.state.error.toString()}
                        </div>
                    )}

                    <button
                        onClick={this.handleReset}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-red-200 text-red-700 font-bold rounded-xl hover:bg-red-50 transition-all shadow-sm"
                    >
                        <RefreshCw size={16} />
                        Try Again
                    </button>

                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 text-xs font-medium text-gray-400 hover:text-gray-600 underline"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
