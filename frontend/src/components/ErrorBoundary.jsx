// components/ErrorBoundary.jsx
//
// Kisi bhi page par render ke dauraan error aaye to pehle poori screen safed
// (blank) ho jaati thi aur user ke paas koi rasta nahi bachta tha. Ab ek
// saaf message + "Reload" / "Home" button dikhta hai. Page badalte hi
// (resetKey) boundary apne aap reset ho jaata hai.
import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Page crashed:", error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <p className="text-base font-semibold">Kuch galat ho gaya</p>
          <p className="text-sm text-gray-400">
            Ye page abhi khul nahi paya. Reload karke dekhein — aapka data surakshit hai.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-semibold"
          >
            Reload karein
          </button>
          <button
            onClick={() => {
              window.location.hash = "#/HomePage";
              this.setState({ error: null });
            }}
            className="w-full py-3 rounded-xl border border-gray-700 text-sm text-gray-300"
          >
            Home par jaayein
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
