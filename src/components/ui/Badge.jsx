export const Badge = ({ children, variant = "default" }) => {
  const styles = {
    default: "bg-brand-50 text-brand-800 border border-brand-100",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
    danger: "bg-red-50 text-red-700 border border-red-200",
    info: "bg-brand-50 text-brand-700 border border-brand-200",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[variant]}`}>{children}</span>;
};
