import { Component, Input } from '@angular/core';

/** Boutons d'export Excel (RTL) + PDF (impression) — clone campagnes. */
@Component({
  selector: 'app-export-buttons',
  standalone: true,
  template: `
    <div class="results-export-toolbar" aria-label="Téléchargements">
      <button type="button" class="btn btn-outline-success btn-sm" (click)="exportExcel()">Excel</button>
      <button type="button" class="btn btn-outline-danger btn-sm" (click)="exportPdf()">PDF</button>
    </div>
  `,
  styles: [],
})
export class ExportButtonsComponent {
  @Input() headers: string[] = [];
  @Input() rows: string[][] = [];
  @Input() title = 'المراسلات';
  @Input() filenameBase = 'courriers';

  private esc(s: string): string {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /** Vrai fichier Excel RTL (.xlsx, sans avertissement) : feuille right-to-left. */
  async exportExcel(): Promise<void> {
    const { default: ExcelJS } = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(String(this.title || 'export').slice(0, 31), {
      views: [{ rightToLeft: true }],
    });
    ws.columns = this.headers.map((h) => ({ header: h, width: 24 }));
    this.rows.forEach((r) => ws.addRow(r));
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDCEEF4' },
    };
    ws.eachRow((row) => {
      row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
    });
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const fname = `${this.filenameBase}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fname;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /** PDF via fenêtre d'impression (dialogue navigateur, fermeture auto) — clone campagnes. */
  exportPdf(): void {
    const esc = (s: string) => this.esc(s);
    const thead = `<thead><tr>${this.headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>`;
    const tbody = this.rows.length
      ? `<tbody>${this.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>`
      : `<tbody><tr><td colspan="${this.headers.length}" style="text-align:center;color:#777;">لا توجد نتائج</td></tr></tbody>`;
    const fname = `${this.filenameBase}_${new Date().toISOString().slice(0, 10)}`;
    const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>${fname}</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:Arial,Tahoma,sans-serif;direction:rtl;color:#111}h1{text-align:center;font-size:18pt;margin:0 0 8mm}table{width:100%;border-collapse:collapse}thead th{background:#f2f2f2}th,td{border:1px solid #999;padding:4px 6px;font-size:8pt;text-align:center;word-wrap:break-word}tr{page-break-inside:avoid}</style></head><body><h1>${esc(this.title)} (${this.rows.length})</h1><table>${thead}${tbody}</table><script>(function(){try{document.title="${fname}"}catch(e){}var hasInvokedPrint=false;function closeMeSoon(){setTimeout(function(){try{window.close()}catch(e){}},120)}window.onafterprint=closeMeSoon;if(window.matchMedia){var mql=window.matchMedia("print");var handler=function(e){if(hasInvokedPrint&&e&&e.matches===false)closeMeSoon()};if(mql&&typeof mql.addEventListener==="function")mql.addEventListener("change",handler);else if(mql&&typeof mql.addListener==="function")mql.addListener(handler)}window.addEventListener("focus",function(){if(hasInvokedPrint)closeMeSoon()});window.onload=function(){setTimeout(function(){window.focus();hasInvokedPrint=true;window.print()},200)}})()<\/script></body></html>`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
  }
}
