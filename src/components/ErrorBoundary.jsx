import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleClearCache = () => {
    // Clear all local storage to fix stuck state
    localStorage.clear();
    sessionStorage.clear();
    // Reload the page
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{
          padding: '20px', 
          textAlign: 'center', 
          backgroundColor: '#1e1e1e', 
          color: '#fff',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <h1 style={{color: '#ff4444'}}>Something went wrong.</h1>
          <p style={{maxWidth: '500px', marginBottom: '20px', color: '#ccc'}}>
            The application encountered an unexpected error. This might be due to corrupted local data.
          </p>
          <div style={{ 
            backgroundColor: '#000', 
            padding: '10px', 
            borderRadius: '5px',
            marginBottom: '30px',
            maxWidth: '100%',
            overflow: 'auto',
            color: '#ff8888',
            fontSize: '12px',
            textAlign: 'left'
          }}>
            {this.state.error && this.state.error.toString()}
          </div>
          <button 
            onClick={this.handleClearCache}
            style={{
              padding: '12px 24px',
              backgroundColor: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Clear Cache & Reload
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
