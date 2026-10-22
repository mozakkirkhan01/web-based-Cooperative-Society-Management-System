import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { LoadDataService } from '../../utils/load-data.service';
import { ConstantData } from '../../utils/constant-data';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface TrialBalanceItem {
  slNo: number;
  HeadCode: string;
  HeadName: string;
  HeadType: string;
  Closing: number;
  assetsDr: number | null;
  liabilitiesCr: number | null;
  isBankOrCash: boolean;
}

@Component({
  selector: 'app-trial-balance',
  templateUrl: './trial-balance.component.html',
  styleUrls: ['./trial-balance.component.css']
})
export class TrialBalanceComponent implements OnInit {
  dataLoading = false;
  Loaded = false;
  Error = '';

  Years: any[] = [];
  YearId = 0;
  SelectedYear: any = null;

  TrialDateValue: Date | null = null;
  TrialDate = '';
  SearchText = '';
  Company: any = null;

  NormalRows: TrialBalanceItem[] = [];
  BankRows: TrialBalanceItem[] = [];

  totalAssetsDr = 0;
  totalLiabilitiesCr = 0;
  isBalanced = true;
  readonly Math = Math;

  constructor(
    private service: AppService,
    private localService: LocalService,
    private loadData: LoadDataService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.setup();
  }

  private buildRequest(mode: string, extra: any = {}) {
    const staffLoginId = this.localService.getEmployeeDetail()?.StaffLoginId;
    return {
      request: this.localService.encrypt(JSON.stringify({
        StaffLoginId: staffLoginId,
        Report: 'TrialBalance',
        Mode: mode,
        YearId: this.YearId,
        FromDate: this.SelectedYear?.StartDate ? String(this.SelectedYear.StartDate).substring(0, 10) : null,
        ToDate: this.TrialDate || null,
        PageNumber: 1,
        PageSize: 100,
        ...extra
      })).toString()
    };
  }

  setup(): void {
    this.dataLoading = true;
    this.Error = '';
    this.Loaded = false;
    this.service.accessReport(this.buildRequest('Setup')).subscribe((r: any) => {
      this.dataLoading = false;
      if (r.Message !== ConstantData.SuccessMessage) {
        this.Error = r.Message || 'Failed to initialize Trial Balance';
        this.toastr.error(this.Error);
        return;
      }
      this.Years = r.Years || [];
      if (r.Company) this.Company = r.Company;

      if (r.Year) {
        this.YearId = r.Year.YearId;
        this.SelectedYear = r.Year;
        const endDate = new Date(r.Year.EndDate);
        this.TrialDateValue = endDate;
        this.TrialDate = this.loadData.loadDateYMD(endDate) || '';
      }
      this.load();
    }, err => {
      this.dataLoading = false;
      this.Error = err.error?.Message || 'Unable to connect to server';
      this.toastr.error(this.Error);
    });
  }

  yearChanged(): void {
    this.SelectedYear = this.Years.find(y => y.YearId == this.YearId);
    if (this.SelectedYear) {
      const endDate = new Date(this.SelectedYear.EndDate);
      this.TrialDateValue = endDate;
      this.TrialDate = this.loadData.loadDateYMD(endDate) || '';
    }
    this.load();
  }

  dateChanged(date: any): void {
    this.TrialDateValue = date ? new Date(date) : null;
    this.TrialDate = date ? (this.loadData.loadDateYMD(date) || '') : '';
  }

  load(): void {
    if (!this.TrialDate) {
      this.toastr.error('Please select a date for Trial Balance');
      return;
    }
    this.dataLoading = true;
    this.Error = '';
    this.service.accessReport(this.buildRequest('Data', { Export: true })).subscribe((r: any) => {
      this.dataLoading = false;
      if (r.Message !== ConstantData.SuccessMessage) {
        this.Error = r.Message || 'Failed to load Trial Balance records';
        this.toastr.error(this.Error);
        return;
      }
      if (r.Company) this.Company = r.Company;

      const allRows: any[] = (r.Rows || []).filter((row: any) => Math.abs(Number(row.Closing || 0)) > 0.001);

      // Separate non-bank and bank rows
      const normal = allRows.filter((row: any) => row.HeadType !== 'B' && row.HeadType !== 'C');
      normal.sort((a: any, b: any) => (a.HeadName || '').trim().localeCompare((b.HeadName || '').trim()));

      const banks = allRows.filter((row: any) => row.HeadType === 'B' || row.HeadType === 'C');
      banks.sort((a: any, b: any) => {
        const aName = (a.HeadName || '').trim().toUpperCase();
        const bName = (b.HeadName || '').trim().toUpperCase();
        if (aName === 'CASH') return -1;
        if (bName === 'CASH') return 1;
        return aName.localeCompare(bName);
      });

      let sl = 1;
      this.NormalRows = normal.map((row: any) => {
        const closing = Number(row.Closing || 0);
        return {
          slNo: sl++,
          HeadCode: row.HeadCode,
          HeadName: (row.HeadName || '').trim().toUpperCase(),
          HeadType: row.HeadType,
          Closing: closing,
          assetsDr: closing > 0 ? closing : null,
          liabilitiesCr: closing < 0 ? Math.abs(closing) : null,
          isBankOrCash: false
        };
      });

      this.BankRows = banks.map((row: any) => {
        const closing = Number(row.Closing || 0);
        return {
          slNo: sl++,
          HeadCode: row.HeadCode,
          HeadName: (row.HeadName || '').trim().toUpperCase(),
          HeadType: row.HeadType,
          Closing: closing,
          assetsDr: closing > 0 ? closing : null,
          liabilitiesCr: closing < 0 ? Math.abs(closing) : null,
          isBankOrCash: true
        };
      });

      const allItems = [...this.NormalRows, ...this.BankRows];
      this.totalAssetsDr = allItems.reduce((acc, it) => acc + (it.assetsDr || 0), 0);
      this.totalLiabilitiesCr = allItems.reduce((acc, it) => acc + (it.liabilitiesCr || 0), 0);
      this.isBalanced = Math.abs(this.totalAssetsDr - this.totalLiabilitiesCr) < 0.01;
      this.Loaded = true;
    }, err => {
      this.dataLoading = false;
      this.Error = err.error?.Message || 'Failed to fetch Trial Balance data';
      this.toastr.error(this.Error);
    });
  }

  get displayNormalRows(): TrialBalanceItem[] {
    if (!this.SearchText?.trim()) return this.NormalRows;
    const term = this.SearchText.trim().toLowerCase();
    return this.NormalRows.filter(r => r.HeadName.toLowerCase().includes(term) || r.HeadCode.includes(term));
  }

  get displayBankRows(): TrialBalanceItem[] {
    if (!this.SearchText?.trim()) return this.BankRows;
    const term = this.SearchText.trim().toLowerCase();
    return this.BankRows.filter(r => r.HeadName.toLowerCase().includes(term) || r.HeadCode.includes(term));
  }

  get totalItemsCount(): number {
    return this.NormalRows.length + this.BankRows.length;
  }

  close(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/admin/admin-dashboard']);
    }
  }

  printPdf(): void {
    const doc = this.buildPdfDoc();
    if (!doc) return;
    const blobUrl = doc.output('bloburl');
    const printWindow = window.open(blobUrl, '_blank');
    if (printWindow) {
      printWindow.focus();
    } else {
      doc.save(`Trial_Balance_${this.formatDateDDMMMYYYY(this.TrialDate)}.pdf`);
    }
  }

  downloadPdfFile(): void {
    const doc = this.buildPdfDoc();
    if (!doc) return;
    const formattedDate = this.formatDateDDMMMYYYY(this.TrialDate || new Date());
    doc.save(`Trial_Balance_${formattedDate}.pdf`);
    this.toastr.success('Trial Balance PDF downloaded successfully');
  }

  buildPdfDoc(): jsPDF | null {
    if (!this.Loaded || (!this.NormalRows.length && !this.BankRows.length)) {
      this.toastr.error('No data available to print');
      return null;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const centerX = pageWidth / 2;

    const company = this.Company || {};
    const trialDateStr = this.formatDateDDMMMYYYY(this.TrialDate || new Date());
    const reportDateStr = this.formatDateDDMMMYYYY(new Date());

    // Header drawing
    const companyName = company.CompanyName || 'Bokaro Steel Employees (TA/Med./Mat.) Co-op. Cr. Soc. Ltd.';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.text(companyName, centerX, 15, { align: 'center' });
    const nameW = doc.getTextWidth(companyName);
    doc.setLineWidth(0.4);
    doc.line(centerX - nameW / 2, 16, centerX + nameW / 2, 16);

    const hindiName = company.CompanyNameHindi || 'बोकारो इस्पात कर्मचारी (टी०ए०/मेड०/मेट०) सहकारी साख समिति लिमिटेड';
    const hindiImg = this.createHindiTextImage(hindiName);
    let nextY = 17.5;
    if (hindiImg) {
      doc.addImage(hindiImg.dataUrl, 'PNG', centerX - hindiImg.widthMm / 2, nextY, hindiImg.widthMm, hindiImg.heightMm);
      nextY += hindiImg.heightMm + 1.5;
    } else {
      nextY += 5;
    }

    const regNo = company.RegistrationNo || 'BAGH-6/78';
    const addr = company.CompanyAddress || 'Old Admn. Bldg., Bokaro Steel City-827001';
    const regAddressText = `(Regd. No.- ${regNo})    ${addr}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(regAddressText, centerX, nextY + 3, { align: 'center' });
    nextY += 7;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    const reportTitle = 'Trial Balance';
    doc.text(reportTitle, centerX, nextY + 3.5, { align: 'center' });
    const titleW = doc.getTextWidth(reportTitle);
    doc.setLineWidth(0.4);
    doc.line(centerX - titleW / 2, nextY + 4.5, centerX + titleW / 2, nextY + 4.5);
    nextY += 9;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(`Trial on Date: ${trialDateStr}`, 15, nextY + 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Report Date: ${reportDateStr}`, pageWidth - 15, nextY + 2, { align: 'right' });
    nextY += 4;

    const body: any[] = [];

    // 1. Normal heads
    for (const row of this.NormalRows) {
      body.push([
        `${row.slNo}.`,
        row.HeadName,
        row.assetsDr !== null ? row.assetsDr.toFixed(2) : '',
        row.liabilitiesCr !== null ? row.liabilitiesCr.toFixed(2) : ''
      ]);
    }

    // 2. Cash and Banks subheader
    if (this.BankRows.length > 0) {
      body.push([
        {
          content: 'Cash and Banks',
          colSpan: 4,
          styles: { halign: 'left', fontStyle: 'bold', fontSize: 8.5, cellPadding: { top: 3.5, bottom: 2, left: 6 } }
        }
      ]);

      // 3. Bank heads
      for (const row of this.BankRows) {
        body.push([
          `${row.slNo}.`,
          row.HeadName,
          row.assetsDr !== null ? row.assetsDr.toFixed(2) : '',
          row.liabilitiesCr !== null ? row.liabilitiesCr.toFixed(2) : ''
        ]);
      }
    }

    // 4. Total row
    const totalRowIndex = body.length;
    body.push([
      { content: 'Total:', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fontSize: 8.5 } },
      { content: this.totalAssetsDr.toFixed(2), styles: { halign: 'right', fontStyle: 'bold', fontSize: 8.5 } },
      { content: this.totalLiabilitiesCr.toFixed(2), styles: { halign: 'right', fontStyle: 'bold', fontSize: 8.5 } }
    ]);

    autoTable(doc, {
      head: [
        [
          { content: 'Sl.', styles: { halign: 'right' } },
          { content: 'Head', styles: { halign: 'left' } },
          { content: 'Assets (Dr)', styles: { halign: 'right' } },
          { content: 'Liabilities (Cr)', styles: { halign: 'right' } }
        ]
      ],
      body: body,
      startY: nextY + 2,
      margin: { top: 14, bottom: 16, left: 15, right: 15 },
      theme: 'plain',
      styles: {
        font: 'helvetica',
        fontSize: 7.8,
        cellPadding: { top: 1.1, bottom: 1.1, left: 1, right: 1 },
        textColor: [0, 0, 0],
        overflow: 'ellipsize'
      },
      headStyles: {
        font: 'helvetica',
        fontStyle: 'bold',
        fontSize: 8.5,
        textColor: [0, 0, 0],
        fillColor: false,
        lineWidth: { top: 0.4, bottom: 0.4 },
        lineColor: [0, 0, 0],
        cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 }
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'right' },
        1: { cellWidth: 98, halign: 'left' },
        2: { cellWidth: 36, halign: 'right' },
        3: { cellWidth: 36, halign: 'right' }
      },
      didParseCell: (data) => {
        if (data.column.index === 2 || data.column.index === 3) {
          data.cell.styles.halign = 'right';
        }
        if (data.cell.raw && typeof data.cell.raw === 'object' && (data.cell.raw as any).content === 'Cash and Banks') {
          data.cell.styles.halign = 'left';
        }
      },
      didDrawCell: (data) => {
        if (data.row.index === totalRowIndex) {
          doc.setDrawColor(0);
          doc.setLineWidth(0.35);
          // Top line above total row
          doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
          // Double bottom line below total row
          const bottomY = data.cell.y + data.cell.height;
          doc.line(data.cell.x, bottomY, data.cell.x + data.cell.width, bottomY);
          doc.line(data.cell.x, bottomY + 0.6, data.cell.x + data.cell.width, bottomY + 0.6);
        }
      }
    });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      const lineY = pageHeight - 12;
      doc.line(15, lineY, pageWidth - 15, lineY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(0);
      doc.text(`Page - ${i} of ${totalPages}`, centerX, pageHeight - 7, { align: 'center' });
    }

    return doc;
  }

  formatDateDDMMMYYYY(dateInput: any): string {
    if (!dateInput) return '';
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
      const parts = dateInput.substring(0, 10).split('-');
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parts[2];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day}-${months[monthIdx] || parts[1]}-${year}`;
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day}-${months[d.getMonth()]}-${d.getFullYear()}`;
  }

  private createHindiTextImage(text: string): { dataUrl: string; widthMm: number; heightMm: number } | null {
    if (!text || !text.trim()) return null;
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const fontSize = 18;
      const font = `bold ${fontSize}px "Nirmala UI", "Mangal", "Arial Unicode MS", "Devanagari Sangam MN", sans-serif`;
      ctx.font = font;
      const textMetrics = ctx.measureText(text);
      const textWidth = Math.ceil(textMetrics.width);
      const textHeight = Math.ceil(fontSize * 1.5);

      const scale = 3;
      canvas.width = (textWidth + 24) * scale;
      canvas.height = (textHeight + 12) * scale;

      ctx.scale(scale, scale);
      ctx.font = font;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, (textWidth + 24) / 2, (textHeight + 12) / 2);

      const widthMm = (textWidth + 24) * 0.264583;
      const heightMm = (textHeight + 12) * 0.264583;

      return {
        dataUrl: canvas.toDataURL('image/png'),
        widthMm: Math.min(widthMm, 180),
        heightMm: Math.min(widthMm, 180) * (heightMm / widthMm)
      };
    } catch {
      return null;
    }
  }
}
