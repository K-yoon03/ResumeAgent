import { Link } from "react-router-dom";

const CareerPilotHelmIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="6" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    <path d="M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    <circle cx="12" cy="2" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="22" r="1" fill="currentColor" stroke="none" />
    <circle cx="2" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="22" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="4.93" cy="4.93" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="19.07" cy="19.07" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="4.93" cy="19.07" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="19.07" cy="4.93" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

function Footer() {
  return (
    <footer className="border-t border-border/40 px-4 py-10 text-center text-sm text-muted-foreground bg-background/50">
      <div className="flex items-center justify-center gap-2 mb-3">
        <div className="p-1 rounded-md bg-gradient-to-br from-[#6366f1] via-[#8b5cf6] to-[#a78bfa] shadow-sm transition-transform">
          <CareerPilotHelmIcon className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="font-bold text-foreground tracking-tight">
          CareerPilot
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-medium text-muted-foreground/80">
          AI 기반 취업 준비 플랫폼 · 더 나은 취업을 위해
        </p>
        <p className="text-xs opacity-50">
          © {new Date().getFullYear()} CareerPilot. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;