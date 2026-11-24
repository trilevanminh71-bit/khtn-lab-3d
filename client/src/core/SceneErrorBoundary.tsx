/**
 * core/SceneErrorBoundary.tsx — Chống trắng màn hình: bắt lỗi trong cây React của cảnh 3D,
 * hiển thị thông báo tiếng Việt và TỰ PHỤC HỒI (gắn lại cảnh) sau 1,5 giây, tối đa 3 lần liên tiếp.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logAction } from '../utils/bugSnapshot';

interface Props {
  children: ReactNode;
  /** Đổi giá trị này để buộc gắn lại cảnh (ví dụ khi mất WebGL context) */
  resetKey?: string | number;
}

interface State {
  error: string | null;
  attempt: number;
  key: number;
}

export class SceneErrorBoundary extends Component<Props, State> {
  state: State = { error: null, attempt: 0, key: 0 };
  private timer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError(err: unknown): Partial<State> {
    return { error: err instanceof Error ? err.message : String(err) };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logAction('scene-crash', `${error.message} ${info.componentStack ?? ''}`.slice(0, 280));
    if (this.state.attempt < 3) {
      this.timer = setTimeout(() => this.recover(), 1500);
    }
  }

  componentDidUpdate(prev: Props): void {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.recover();
  }

  componentWillUnmount(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  private recover = (): void => {
    this.setState((s) => ({ error: null, attempt: s.attempt + 1, key: s.key + 1 }));
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-900 p-6 text-center" role="alert">
          <p className="text-lg font-semibold text-amber-300">Cảnh 3D gặp sự cố</p>
          <p className="max-w-md text-sm text-slate-300">{this.state.error}</p>
          <p className="text-xs text-slate-400">
            {this.state.attempt < 3 ? 'Đang tự khôi phục…' : 'Đã thử khôi phục 3 lần. Hãy bật "Đồ họa máy yếu" trong Cài đặt.'}
          </p>
          <button className="btn-primary" onClick={() => this.setState({ error: null, attempt: 0, key: this.state.key + 1 })}>
            Khôi phục ngay
          </button>
        </div>
      );
    }
    return <div key={this.state.key} className="h-full w-full">{this.props.children}</div>;
  }
}
