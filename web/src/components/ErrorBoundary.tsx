import { Component, ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Bắt lỗi render để 1 component lỗi không làm trắng cả app. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <h2 className="text-lg font-bold text-slate-700">Đã có lỗi xảy ra</h2>
          <p className="text-sm text-slate-400">{this.state.error.message}</p>
          <button onClick={() => this.setState({ error: null })} className="btn-primary">
            Thử lại
          </button>
          <button onClick={() => (location.href = '/')} className="btn-outline">
            Về trang chủ
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
