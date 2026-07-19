import './toast.scss';
export type ToastType = 'info' | 'success' | 'error';
interface ToastOptions {
    message: string;
    type?: ToastType;
    duration?: number;
}
export declare function showToast(options: ToastOptions): void;
export {};
//# sourceMappingURL=toast.d.ts.map