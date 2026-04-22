import { useEffect } from "react";
import { Icons } from "./Icons";

const variantStyles = {
  success: {
    wrap: "bg-emerald-50 border-emerald-200 text-emerald-800",
    icon: "text-emerald-600",
  },
  error: {
    wrap: "bg-red-50 border-red-200 text-red-800",
    icon: "text-red-600",
  },
  warning: {
    wrap: "bg-amber-50 border-amber-200 text-amber-800",
    icon: "text-amber-600",
  },
  info: {
    wrap: "bg-blue-50 border-blue-200 text-blue-800",
    icon: "text-blue-600",
  },
};

const getIcon = (type) => {
  switch (type) {
    case "success":
      return Icons.check;
    case "error":
      return Icons.alertCircle || Icons.x;
    case "warning":
      return Icons.alertTriangle || Icons.file;
    default:
      return Icons.info || Icons.file;
  }
};

export const Toast = ({
  open,
  message,
  type = "info",
  onClose,
  duration = 3000,
}) => {
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [open, duration, onClose]);

  if (!open || !message) return null;

  const styles = variantStyles[type] || variantStyles.info;
  const IconComp = getIcon(type);

  return (
    <div className="fixed top-4 right-4 z-[100] w-[340px] max-w-[calc(100vw-2rem)]">
      <div
        className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg ${styles.wrap}`}
      >
        <div className={`mt-0.5 ${styles.icon}`}>
          <IconComp size={18} />
        </div>

        <div className="flex-1 text-sm font-medium leading-5">
          {message}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <Icons.x size={16} />
        </button>
      </div>
    </div>
  );
};