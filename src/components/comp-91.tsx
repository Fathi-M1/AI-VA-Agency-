"use client";

// Origin UI comp-91, "Button with loading overlay" (label kept, spinner overlaid,
// so the button never changes width).
// Source: https://coss.com/origin/r/comp-91.json (installed via shadcn CLI)
// License: MIT. Copyright (c) 2025 coss.com, originally Copyright (c) 2025 Origin UI.
// Adapted: outline variant and Dashboard sizing; the approved shadcn Spinner
// (https://ui.shadcn.com/docs/components/spinner, MIT) replaces LoaderCircleIcon
// and stays still under reduced motion; "Preparing…" beside it; the click
// prepares the weekly report and confirms with a Sonner toast. Structure unchanged.
import { DownloadIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export default function DownloadReportButton({
  weekLabel,
  reportText,
  fileName,
  className,
}: {
  weekLabel: string
  /** The report body, built from the real weekly numbers by the Dashboard. */
  reportText: string
  /** e.g. "cruz-family-dental-weekly-report.txt", from the business name. */
  fileName: string
  /** Optional style override (e.g. the glass button in the Dashboard hero). */
  className?: string
}) {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleClick = () => {
    setIsLoading(true);
    // Stand-in for the real PDF job (unchanged from before this retrofit).
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Report ready", {
        description: `Weekly results, ${weekLabel}`,
        action: {
          label: "Download",
          onClick: () => {
            // Plain-text report of the real numbers until a PDF service exists.
            const blob = new Blob(
              [reportText],
              { type: "text/plain" }
            );
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(a.href);
          },
        },
      });
    }, 1600);
  };

  return (
    <Button
      variant="outline"
      className={className ?? "group relative h-9 gap-2 rounded-lg border-input bg-transparent px-3.5 text-xs font-medium disabled:opacity-100"}
      data-loading={isLoading || undefined}
      disabled={isLoading}
      aria-busy={isLoading}
      onClick={handleClick}
    >
      <span className="flex items-center gap-2 group-data-loading:text-transparent">
        <DownloadIcon aria-hidden="true" className="group-data-loading:opacity-0" />
        <span className="hidden sm:inline">Download report</span>
        <span className="sr-only sm:hidden">Download report</span>
      </span>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-muted-foreground">
          <Spinner aria-hidden="true" className="motion-reduce:animate-none" />
          <span className="hidden sm:inline">Preparing…</span>
          <span className="sr-only" role="status">
            Preparing your report
          </span>
        </div>
      )}
    </Button>
  );
}
