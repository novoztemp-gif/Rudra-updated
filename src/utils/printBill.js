// Shared print pipeline for the compact dashed-line bill views (retail
// customer/company bills, purchase bills). Prints via a hidden iframe so it
// never touches the app's own DOM.
export const escapeHtml = (value) => {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

export const printHtmlInIframe = (html) => {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");

  const cleanup = () => {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  };

  // Trigger the print off the iframe's own load event instead of a fixed
  // delay. A guessed setTimeout is either too short (prints a half-rendered
  // or blank document on a slow machine) or, on some Safari/Chrome builds,
  // long enough that the print call no longer counts as tied to the click
  // that started it and the dialog silently never opens — both of which
  // match "print itself not coming" reports.
  //
  // Gotcha: `onload` actually fires twice here — once immediately for the
  // iframe's own blank initial document (as soon as it's inserted), and
  // again for the real content once doc.write()/close() below run. Only the
  // second firing means our bill is actually ready; reacting to the first
  // one prints a blank page and tears the iframe down before we ever get a
  // chance to write the real content into it. `contentWritten` distinguishes
  // the two regardless of how many times the browser happens to fire it.
  let contentWritten = false;
  iframe.onload = () => {
    if (!contentWritten) return;
    const win = iframe.contentWindow;
    win.onafterprint = cleanup;
    // Fallback in case onafterprint never fires (seen on some older Safari
    // versions) so the hidden iframe doesn't linger indefinitely.
    setTimeout(cleanup, 60000);
    win.focus();
    win.print();
  };

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title></title>
        <style>
          /* No fixed page size or orientation here on purpose — Safari in
             particular renders a hardcoded @page size (e.g. A5) as a fixed
             canvas and then pastes it in a corner of whatever paper is
             actually loaded, instead of scaling or centering it, if the
             printer's real paper is a different size (A4). Leaving size
             unset means the content just fills whichever paper size and
             orientation the print dialog actually has selected, in every
             browser. */
          @page {
               margin: 8mm;
            }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: Arial, sans-serif;
            color: #111827;
            font-size: 12px;
            line-height: 1.35;
          }

          .bill-wrap {
              width: 100%;
              background: #ffffff;
              border: 1.5px solid #111827;
              padding: 10px 12px;
            }

          .bill-line {
            border-top: 1px dashed #111827;
            margin: 6px 0;
          }

          .bill-info {
            padding-bottom: 4px;
          }

          .bill-info-row {
            display: flex;
            justify-content: space-between;
            gap: 6px;
            margin-bottom: 2px;
          }

          .bill-info-label {
            font-weight: 700;
            white-space: nowrap;
          }

          .bill-info-value {
            text-align: right;
            word-break: break-word;
            overflow-wrap: anywhere;
          }

          .customer-box {
            margin-top: 4px;
          }

          .item {
            padding: 5px 0;
            border-bottom: 1px dashed #cbd5e1;
          }

          .item-name {
            font-weight: 700;
            word-break: break-word;
            overflow-wrap: anywhere;
            margin-bottom: 2px;
          }

          .item-meta {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            font-size: 11px;
          }

          .item-left {
            word-break: break-word;
            overflow-wrap: anywhere;
          }

          .item-right {
            text-align: right;
            white-space: nowrap;
            font-weight: 700;
          }

          .company-meta {
            margin-top: 2px;
            color: #374151;
            font-size: 9.5px;
            word-break: break-word;
            overflow-wrap: anywhere;
          }

          .summary {
            padding-top: 5px;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 3px;
          }

          .summary-label {
            font-weight: 700;
          }

          .summary-value {
            text-align: right;
            white-space: nowrap;
          }

          .notes {
            margin-top: 5px;
            word-break: break-word;
            overflow-wrap: anywhere;
          }

          .total-box {
            border-top: 1px dashed #111827;
            border-bottom: 1px dashed #111827;
            padding: 6px 0;
            margin-top: 6px;
            display: flex;
            justify-content: space-between;
            gap: 8px;
            font-size: 12px;
            font-weight: 700;
          }

          .footer-space {
            height: 8px;
          }

          @media print {
            html,
            body {
                width: auto;
              }

            .bill-wrap {
                width: 100%;
            }

            /* Protect individual line items from splitting mid-row, without
               forcing the whole bill onto one page — a long item list should
               flow across as many physical pages as it needs. */
            .item {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `);
  contentWritten = true;
  doc.close();
};
