"use client";

/**
 * marketplace/report-dialog.tsx — the shared report dialog, worded for a listing.
 *
 * The dialog itself lives in components/report-dialog.tsx and is shared with the
 * contracts page; all that is here is the half that is about crafts — including the
 * line that sends a "I didn't like it" back to the dislike button, which is the whole
 * reason the marketplace's wording differs from the contract one.
 */
import { ReportDialog as BaseReportDialog } from "@/components/report-dialog";
import { type Listing } from "@/lib/marketplace";

interface ReportDialogProps {
  listing: Listing;
  onSubmit: (reason: string) => Promise<void>;
  onClose: () => void;
  busy?: boolean;
  /** Set when the last attempt failed — e.g. "you've already reported this craft". */
  error?: string | null;
}

export function ReportDialog({ listing, ...rest }: ReportDialogProps) {
  return (
    <BaseReportDialog
      title="Report this listing"
      subject={
        <>
          <span className="font-medium text-foreground">{listing.craft_name}</span> by{" "}
          {listing.seller_name}
        </>
      }
      placeholder="Stolen craft, misleading listing, offensive name, broken download…"
      notice={
        <>
          This opens a private ticket in Discord with a moderator pinged. The listing,
          the seller and your Discord account are attached to it. Only report a real
          problem. To say you didn&apos;t like the craft, use the dislike button.
        </>
      }
      {...rest}
    />
  );
}
