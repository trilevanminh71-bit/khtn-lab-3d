/**
 * components/TutorErrorBoundary.tsx — Error Boundary RIÊNG cho Trợ lý AI Socratic.
 * Lỗi phát sinh trong khung trợ lý (render, effect, tải chunk lười) chỉ hiện thông báo trong khung này;
 * cảnh 3D, số liệu đo và phần còn lại của ứng dụng vẫn hoạt động bình thường.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logAction } from '../utils/bugSnapshot';

interface Props {
  children: ReactNode;
  onClose: () => void;
}

interface State {
  error: string | null;
}

export class TutorErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(err: unknown): State {
    return { error: err instanceof Error ? err.message : String(err) };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logAction('tutor-crash', `${error.message} ${info.componentStack ?? ''}`.slice(0, 280));
  }

  private close = (): void => {
    if (typeof this.props.onClose === 'function') this.props.onClose();
  };

  render(): ReactNode {
    if (this.state.error === null) return this.props.children;
    return (
      <div className="no-print fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col items-center justify-center gap-3 border-l border-slate-700 bg-slate-950 p-6 text-center shadow-2xl" role="alert">
        <p className="text-lg font-semibold text-warn">Trợ lý AI tạm gặp sự cố</p>
        <p className="text-sm text-slate-300">Bài thí nghiệm và số liệu của em không bị ảnh hưởng.</p>
        <p className="max-w-full break-words text-xs text-slate-500">{this.state.error}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button className="btn-primary" onClick={() => this.setState({ error: null })}>
            Thử lại
          </button>
          <button className="btn" onClick={() => window.location.reload()}>
            Tải lại trang
          </button>
          <button className="btn" onClick={this.close}>
            Đóng trợ lý
          </button>
        </div>
      </div>
    );
  }
}
