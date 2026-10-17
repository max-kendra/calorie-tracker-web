import { useState } from "react";
import { useBackupStatus } from "@/api/hooks";

function ago(unixSeconds: number): string {
  const hours = Math.floor((Date.now() / 1000 - unixSeconds) / 3600);
  if (hours < 1) return "less than an hour ago";
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

export function BackupBanner() {
  const { data } = useBackupStatus();
  const [dismissed, setDismissed] = useState(false);

  if (!data || data.ok || dismissed) return null;

  const problems = [
    { label: "Database backup", check: data.database },
    { label: "Off-site backup", check: data.offsite },
  ].filter((p) => !p.check.ok);

  return (
    <div className="bg-amber-100 text-amber-900 border-b border-amber-300 px-4 py-2 text-sm flex items-start justify-between gap-3">
      <div className="space-y-0.5">
        {problems.map((p) => (
          <div key={p.label}>
            <span className="font-medium">{p.label}:</span> {p.check.message}
            {p.check.last_success_at != null && ` (last success ${ago(p.check.last_success_at)})`}
          </div>
        ))}
      </div>
      <button onClick={() => setDismissed(true)} className="text-amber-900 hover:text-black text-lg leading-none shrink-0" aria-label="Dismiss">
        &times;
      </button>
    </div>
  );
}