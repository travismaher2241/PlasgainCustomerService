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
export function generateCustomerFollowUpEmail(options: {
  cadence: "day7" | "day14" | "urgent";
  contactName?: string;
  contactEmail?: string;
  companyName?: string;
  projectName?: string;
  quoteRef?: string;
  productsList?: string[];
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  companyAbn?: string;
  leadTime?: string;
  warranty?: string;
  customNote?: string;
}): { subject: string; body: string; mailtoUrl: string } {
  const contact = options.contactName?.trim() || "there";
  const company = options.companyName?.trim() || "your team";
  const project = options.projectName?.trim() || "your public lighting project";
  const quoteRef = options.quoteRef?.trim() || "our recent quote";
  const sender = options.senderName?.trim() || "";
  const senderEmail = options.senderEmail?.trim() || "";
  const senderPhone = options.senderPhone?.trim();
  const contactLine = senderPhone ? `${senderEmail} | ${senderPhone}` : senderEmail;
  const leadTimeStr = options.leadTime?.trim() || "approximately 2–3 weeks from order confirmation";
  const warrantyStr = options.warranty?.trim() || "Plasgain Manufacturer Warranty";
  const productsStr =
    options.productsList && options.productsList.length > 0
      ? options.productsList.slice(0, 3).join(", ")
      : "Plasgain Solar Lighting & Civil Systems";

  const signoffLines = [sender, "Plasgain Customer Service", contactLine].filter(Boolean).join("\n");

  let subject = "";
  let body = "";

  if (options.cadence === "day7") {
    subject = `Following up: Plasgain Quotation ${options.quoteRef ? `[${quoteRef}] ` : ""}- ${project}`;
    body = `Hi ${contact},

I hope your week is going well.

I wanted to quickly check in regarding the quotation we sent through for ${project}${options.quoteRef ? ` (Ref: ${quoteRef})` : ""}, featuring ${productsStr}.

Did you have a chance to review the quote and product schedule? We want to make sure the pricing, quantities and delivery timing all line up with what your project needs.

If anything needs adjusting, or you would like us to look at alternative options, please don't hesitate to reach out.

${options.customNote ? `${options.customNote}

` : ""}Kind regards,

${signoffLines}`;
  } else if (options.cadence === "day14") {
    subject = `Checking in on your quote - ${project} ${options.quoteRef ? `[${quoteRef}]` : ""}`;
    body = `Hi ${contact},

Following up on our quote for ${project}${options.quoteRef ? ` (Ref: ${quoteRef})` : ""}.

As you finalise plans for ${company}, we are happy to help however is most useful — revising quantities, confirming delivery staging, or putting you in touch with the right person at Plasgain for any product detail you need.

Current production lead times for ${productsStr} are running at ${leadTimeStr}. If your project schedule has shifted or you need adjusted delivery staging, we can hold allocation accordingly.

Would you be open to a quick 5-minute call this week to align on next steps?

${options.customNote ? `${options.customNote}

` : ""}Best regards,

${signoffLines}`;
  } else {
    // Urgent / Tender Closing
    subject = `Tender Closing Check-in: ${project} ${options.quoteRef ? `[${quoteRef}] ` : ""}`;
    body = `Hi ${contact},

With tender submission deadlines approaching for ${project}, I wanted to make sure you have all the required documentation from Plasgain.

Our quotation for ${productsStr}${options.quoteRef ? ` under Quote Ref ${quoteRef}` : ""} covers pricing, quantities, lead times and local support.

If you need any last-minute amendments, or there is supporting documentation your submission requires, let me know and I will get it organised for you.

${options.customNote ? `${options.customNote}

` : ""}Kind regards,

${signoffLines}`;
  }

  const recipient = options.contactEmail?.trim() || "";
  const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return { subject, body, mailtoUrl };
}