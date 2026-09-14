/**
 * Follow-up email copy.
 *
 * This module also held the Ostendo CSV and tab-delimited matrix exporters.
 * Nothing in the workspace writes back to Ostendo — quotes arrive here as PDF
 * imports and go no further — so the export menu was removed and these went
 * with it rather than sitting unreachable.
 */

/**
 * Generates email content for follow-up cadences.
 */
/**
 * A follow-up email a rep would plausibly have typed themselves.
 *
 * These used to open with "I hope your week is going well" and then recite the
 * quote's product lines — "featuring Boulevard Gooseneck 5.5m MH, 0.9m
 * Outreach, 7.6m OL, IGM, Painted, Toorak 12 LED 14w..." — which is both
 * unreadable and an unmistakable tell that a machine wrote it. The customer
 * already has the quote; they do not need it read back to them.
 *
 * A follow-up needs to do one thing: name the quote and ask where it stands.
 * So the product list, the lead-time paragraph and the pleasantries are gone,
 * and what is left is short enough that a rep can send it without editing.
 */
export function generateCustomerFollowUpEmail(options: {
  cadence: "day7" | "day14" | "urgent";
  contactName?: string;
  contactEmail?: string;
  companyName?: string;
  projectName?: string;
  quoteRef?: string;
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  companyAbn?: string;
  customNote?: string;
}): { subject: string; body: string; mailtoUrl: string } {
  const contact = options.contactName?.trim() || "there";
  const sender = options.senderName?.trim() || "";
  const senderEmail = options.senderEmail?.trim() || "";
  const senderPhone = options.senderPhone?.trim();
  const contactLine = senderPhone ? `${senderEmail} | ${senderPhone}` : senderEmail;

  /** "quote PL6262", or a plain reference when the number is unknown. */
  const quoteLabel = options.quoteRef?.trim() ? `quote ${options.quoteRef.trim()}` : "our recent quote";

  /**
   * " for Top Paddock, Stage 8" — omitted entirely when there is no project
   * name, rather than padded out with something generic. A rep would not write
   * "your public lighting project" to someone they know.
   */
  const forProject = options.projectName?.trim() ? ` for ${options.projectName.trim()}` : "";

  const signoffLines = [sender, "Plasgain Customer Service", contactLine].filter(Boolean).join("\n");

  let subject = "";
  let body = "";

  if (options.cadence === "day7") {
    subject = `Checking in on ${quoteLabel}`;
    body = `Hi ${contact},

I wanted to quickly check in on ${quoteLabel}${forProject}.

Have you had a chance to look at it? Happy to adjust anything if that would help.

Let me know how you are placed.

${options.customNote ? `${options.customNote}

` : ""}Kind regards,

${signoffLines}`;
  } else if (options.cadence === "day14") {
    subject = `Following up on ${quoteLabel}`;
    body = `Hi ${contact},

Following up on ${quoteLabel}${forProject}.

Is this still going ahead at your end? If the timing has moved or anything needs changing, let me know and I will sort it out.

Worth a quick call this week?

${options.customNote ? `${options.customNote}

` : ""}Kind regards,

${signoffLines}`;
  } else {
    // Tender closing
    subject = `${quoteLabel.charAt(0).toUpperCase()}${quoteLabel.slice(1)} - before you submit`;
    body = `Hi ${contact},

Quick one on ${quoteLabel}${forProject} — I believe your submission is due shortly.

Is there anything you still need from us before it goes in? I can turn changes around quickly if you need them.

${options.customNote ? `${options.customNote}

` : ""}Kind regards,

${signoffLines}`;
  }

  const recipient = options.contactEmail?.trim() || "";
  const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return { subject, body, mailtoUrl };
}