export const Button = ({ children, variant = "primary", size = "md", onClick, disabled, className = "", type = "button" }) => {
  const base = "inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-brand-900 text-white hover:bg-brand-800 focus:ring-brand-500",
    secondary: "bg-white text-brand-800 border border-gray-300 hover:bg-gray-50 focus:ring-brand-400",
    danger: "bg-red-700 text-white hover:bg-red-800 focus:ring-red-500",
    ghost: "text-brand-700 hover:bg-brand-50 focus:ring-brand-400",
    success: "bg-emerald-700 text-white hover:bg-emerald-800 focus:ring-emerald-500",
  };
  const sizes = { sm: "px-2.5 py-1.5 text-xs gap-1", md: "px-3.5 py-2 text-sm gap-1.5", lg: "px-5 py-2.5 text-base gap-2" };
  return <button type={type} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>;
};
