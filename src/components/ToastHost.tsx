import type { Toast } from "../state/usePageState";

export function ToastHost({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-host">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>
          <span className="toast-dot" />
          {t.text}
        </div>
      ))}
    </div>
  );
}
