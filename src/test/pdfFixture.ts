/** Small real PDF for parser/API tests. No production/customer documents. */
export function pdfFixture(pages: Array<Array<{ x: number; y: number; text: string }>> = [[
  { x: 30, y: 750, text: "TEST POLE" }, { x: 220, y: 750, text: "Powercor" }, { x: 320, y: 750, text: "Jemena" },
  { x: 30, y: 720, text: "ZX-10 3.0m top entry" }, { x: 220, y: 720, text: "Approved" },
  { x: 30, y: 690, text: "ZX-20 5.5m side entry" }, { x: 320, y: 690, text: "Approved" },
], []]): Buffer {
  const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>", ""];
  const kids: number[] = [];
  for (const lines of pages) {
    const pageId = objects.length+1;
    kids.push(pageId);
    const stream = lines.map(line => `BT /F1 10 Tf ${line.x} ${line.y} Td (${line.text.replace(/[()\\]/g, "\\$&")}) Tj ET`).join("\n");
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${pageId+1} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  }
  objects[1] = `<< /Type /Pages /Kids [${kids.map(id => `${id} 0 R`).join(" ")}] /Count ${kids.length} >>`;
  let output = "%PDF-1.7\n";
  const offsets = [0];
  objects.forEach((object,index) => { offsets.push(Buffer.byteLength(output)); output += `${index+1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  output += offsets.slice(1).map(offset => `${String(offset).padStart(10,"0")} 00000 n \n`).join("");
  output += `trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output);
}
