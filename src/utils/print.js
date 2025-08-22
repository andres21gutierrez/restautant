// src/utils/print.js
export function printTicket(content, title = "Ticket") {
  const w = window.open("", "_blank", "width=300,height=600");
  w.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          body { font-family: monospace; font-size: 12px; margin: 0; padding: 4px; }
          .line { border-top: 1px dashed #000; margin: 4px 0; }
          .center { text-align: center; }
          .right { text-align: right; }
        </style>
      </head>
      <body>
        ${content}
        <script>window.print(); window.close();</script>
      </body>
    </html>
  `);
  w.document.close();
}
