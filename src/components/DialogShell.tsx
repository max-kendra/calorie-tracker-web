import type { ClipboardEventHandler, ReactNode } from "react";

export interface DialogSection {
  id: string;
  label: string;
  /** Small count/badge shown next to the label. */
  badge?: string | number;
}

interface DialogShellProps {
  title: string;
  onClose: () => void;
  /** Renders above another open dialog instead of alongside it. */
  stacked?: boolean;
  /** When given, the body splits into a left sidebar (tabs on narrow
   * screens) plus a scrolling content pane, so long forms are broken
   * into sections instead of one tall scroll. */
  sections?: DialogSection[];
  activeSection?: string;
  onSectionChange?: (id: string) => void;
  /** Always-visible strip between the title and the body (e.g. a
   * summary that should stay on screen while switching sections). */
  summary?: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
  onPaste?: ClipboardEventHandler<HTMLDivElement>;
  children: ReactNode;
}

/** Shared frame for the app's edit dialogs: backdrop, title bar, optional
 * section sidebar, scrolling body, optional footer. Content pane scrolls
 * independently of the sidebar and summary, and the height is fixed when
 * sections are used so the dialog doesn't resize between sections. */
export function DialogShell({
  title,
  onClose,
  stacked,
  sections,
  activeSection,
  onSectionChange,
  summary,
  footer,
  size = "md",
  onPaste,
  children,
}: DialogShellProps) {
  const hasSections = sections != null && sections.length > 0;
  const widthClass = size === "lg" ? "max-w-3xl" : "max-w-lg";
  const heightClass = hasSections ? "h-[85vh] max-h-[48rem]" : "max-h-[85vh]";

  return (
    <>
      <div className={`fixed inset-0 bg-black/50 ${stacked ? "z-[60]" : "z-40"}`} onClick={onClose} />
      <div className={`fixed inset-0 ${stacked ? "z-[70]" : "z-50"} flex items-start justify-center pt-10 p-4 pointer-events-none`}>
        <div
          onPaste={onPaste}
          className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full ${widthClass} ${heightClass} flex flex-col pointer-events-auto overflow-hidden`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl leading-none"
            >
              &times;
            </button>
          </div>

          {summary && <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 shrink-0">{summary}</div>}

          {hasSections && (
            <div className="sm:hidden flex gap-1 overflow-x-auto px-2 py-1.5 border-b border-gray-100 dark:border-gray-700 shrink-0">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSectionChange?.(s.id)}
                  className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                    s.id === activeSection
                      ? "bg-blue-500 text-white"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-1 min-h-0">
            {hasSections && (
              <nav className="hidden sm:flex flex-col gap-0.5 w-40 shrink-0 border-r border-gray-100 dark:border-gray-700 p-2 overflow-y-auto">
                {sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onSectionChange?.(s.id)}
                    className={`flex items-center justify-between text-left px-3 py-2 rounded-lg text-sm ${
                      s.id === activeSection
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <span>{s.label}</span>
                    {s.badge != null && s.badge !== 0 && (
                      <span className="text-xs text-gray-400 dark:text-gray-400">{s.badge}</span>
                    )}
                  </button>
                ))}
              </nav>
            )}
            <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-3">{children}</div>
          </div>

          {footer && <div className="p-4 border-t border-gray-100 dark:border-gray-700 shrink-0">{footer}</div>}
        </div>
      </div>
    </>
  );
}
