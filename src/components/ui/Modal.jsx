import { Icons } from "./Icons";

export const Modal = ({ open, onClose, title, children, size = "md", fullscreen = false }) => {
  if (!open) return null;
  const sizes = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl" };

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded"><Icons.x size={20} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] px-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white rounded-lg shadow-xl w-full ${sizes[size]} mb-10`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded"><Icons.x size={18} /></button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
