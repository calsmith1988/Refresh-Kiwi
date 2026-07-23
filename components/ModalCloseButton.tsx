type ModalCloseButtonProps = {
  onClick: () => void;
  className?: string;
  label?: string;
};

export default function ModalCloseButton({
  onClick,
  className = "",
  label = "Close",
}: ModalCloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/10 text-black/50 transition hover:border-black/25 hover:text-black ${className}`}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}
