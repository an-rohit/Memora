export interface HamburgerButtonProps {
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isOpen?: boolean;
  className?: string;
}

export function HamburgerButton({
  onClick,
  onMouseEnter,
  onMouseLeave,
  isOpen = false,
  className = "",
}: HamburgerButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`p-2 rounded-md transition-all duration-150 ease-out cursor-pointer flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 active:scale-95 ${
        isOpen ? "bg-white/10 text-white" : ""
      } ${className}`}
      aria-label="Toggle Navigation Menu"
    >
      <svg
        className="w-5 h-5 transition-transform duration-200"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M4 7h16M4 12h16M4 17h16"
        />
      </svg>
    </button>
  );
}
