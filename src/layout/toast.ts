import { createIcon } from '../util/icon';
import './toast.scss';

export type ToastType = 'info' | 'success' | 'error';

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

let container: HTMLDivElement | null = null;

function ensureContainer(): HTMLDivElement {
  if (!container) {
    container = document.createElement('div');
    container.classList.add('toast-container');
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(options: ToastOptions): void {
  const root = ensureContainer();
  const type = options.type ?? 'info';
  const duration = options.duration ?? 3000;

  const el = document.createElement('div');
  el.classList.add('toast', `toast--${type}`);

  const msg = document.createElement('span');
  msg.classList.add('toast__message');
  msg.textContent = options.message;

  const closeBtn = document.createElement('button');
  closeBtn.classList.add('toast__close');
  closeBtn.appendChild(createIcon('close'));
  closeBtn.addEventListener('click', () => remove());

  el.appendChild(msg);
  el.appendChild(closeBtn);
  root.appendChild(el);

  const remove = () => {
    el.classList.add('toast--leaving');
    setTimeout(() => el.remove(), 150);
  };

  if (duration > 0) {
    setTimeout(remove, duration);
  }
}
