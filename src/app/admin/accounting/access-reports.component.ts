import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { ConstantData } from '../../utils/constant-data';
import { LoadDataService } from '../../utils/load-data.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-access-reports',
  templateUrl: './access-reports.component.html',
  styleUrls: ['./access-reports.component.css']
})
export class AccessReportsComponent implements OnInit, OnDestroy {
  Report = ''; Title = ''; YearId = 0; Years: any[] = []; Heads: any[] = [];
  HeadCode = ''; FromDate = ''; ToDate = ''; MemberKey = ''; MemberSearch = '';
  Members: any[] = []; SelectedMember: any = null; Search = '';
  CashBankDate: any = null;
  Rows: any[] = []; Totals: any = {}; Checks: any = {}; Total = 0;
  Company: any = null;
  PageNumber = 1; PageSize = 20; dataLoading = false; Loaded = false;
  Allowed = false; Error = ''; requestNumber = 0; memberRequest = 0;
  IncludeDeleted = false;
  IncludeScheduleDetails = false;
  AccessReview = ConstantData.AccessReview; Notice = '';
  private routeSubscription?: Subscription;
  constructor(private service: AppService, private localService: LocalService, private toastr: ToastrService,
    private route: ActivatedRoute, private loadData: LoadDataService) { }
  ngOnInit() {
    this.routeSubscription = this.route.data.subscribe(data => {
      this.Report = data['report']; this.Title = data['title']; this.Allowed = false;
      this.HeadCode = ''; this.MemberKey = ''; this.MemberSearch = ''; this.SelectedMember = null;
      this.Search = ''; this.Rows = []; this.Totals = {}; this.Checks = {}; this.Loaded = false;
      this.YearId = 0; this.Years = []; this.Heads = []; this.Members = []; this.Notice = '';
      this.setup();
    });
  }
  ngOnDestroy() { this.routeSubscription?.unsubscribe(); this.requestNumber++; this.memberRequest++; }
  request(mode: string, extra: any = {}) {
    return {
      request: this.localService.encrypt(JSON.stringify({
        StaffLoginId: this.localService.getEmployeeDetail().StaffLoginId, Report: this.Report, Mode: mode,
        YearId: this.YearId, FromDate: this.FromDate || null, ToDate: (this.Report == 'DayBook' ? this.FromDate : this.ToDate) || null,
        HeadCode: this.HeadCode, MemberKey: this.MemberKey, Search: this.Search,
        PageNumber: this.PageNumber, PageSize: this.PageSize, IncludeDeleted: this.IncludeDeleted,
        IncludeScheduleDetails: this.IncludeScheduleDetails, ...extra
      })).toString()
    };
  }
  setup() {
    const current = ++this.requestNumber; this.memberRequest++;
    this.dataLoading = true; this.Error = ''; this.Notice = ''; this.Allowed = false; this.Loaded = false; this.Rows = []; this.Totals = {};
    this.service.accessReport(this.request('Setup')).subscribe((r: any) => {
      if (current != this.requestNumber) return;
      this.dataLoading = false;
      if (r.Message != ConstantData.SuccessMessage) { this.fail(r.Message); return; }
      if (r.Available === false) { this.Notice = r.Notice; return; }
      this.Allowed = true; this.Years = r.Years; this.YearId = r.Year.YearId; this.Heads = r.Heads;
      if (r.Company) this.Company = r.Company;
      this.FromDate = r.Year.StartDate.substring(0, 10); this.ToDate = r.Year.EndDate.substring(0, 10);
      if (this.Report == 'CashBank') this.CashBankDate = new Date(this.ToDate);
      if (this.Report == 'DayBook') {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        this.FromDate = today < this.FromDate ? this.FromDate : today > this.ToDate ? this.ToDate : today;
        this.ToDate = this.FromDate;
      }
      this.PageNumber = 1;
      if (this.Report != 'MemberLedger') this.load();
    }, err => { if (current == this.requestNumber) this.fail(err.error?.Message); });
  }
  yearChanged() {
    this.HeadCode = ''; this.MemberKey = ''; this.MemberSearch = ''; this.Members = []; this.SelectedMember = null;
    this.Search = ''; this.setup();
  }
  dayBookDateChanged(date: any) {
    this.FromDate = date ? this.loadData.loadDateYMD(date) || '' : '';
    this.ToDate = this.FromDate;
    this.filtersChanged();
  }
  cashBankDateChanged(date: any) {
    this.ToDate = date ? this.loadData.loadDateYMD(date) || '' : '';
    this.filtersChanged();
  }
  filtersChanged() { this.requestNumber++; this.Rows = []; this.Totals = {}; this.Loaded = false; this.dataLoading = false; }
  findMembers() {
    this.MemberKey = ''; this.SelectedMember = null; this.filtersChanged();
    const current = ++this.memberRequest;
    if (!this.MemberSearch.trim()) { this.Members = []; return; }
    this.service.accessReport(this.request('Members', { Search: this.MemberSearch })).subscribe((r: any) => {
      if (current == this.memberRequest) this.Members = r.Message == ConstantData.SuccessMessage ? r.Rows : [];
    }, () => { if (current == this.memberRequest) this.Members = []; });
  }
  selectMember(member: any) {
    this.MemberKey = member.MemberKey; this.SelectedMember = member;
    this.MemberSearch = `${member.MemberName} — ${member.MemberNo} / ${member.StaffNo}`;
    this.filtersChanged();
  }
  show() { this.PageNumber = 1; this.load(); }
  load(exportCsv = false) {
    if (this.Report == 'DayBook') {
      if (!this.FromDate) { this.toastr.error('Select a date first'); return; }
      this.ToDate = this.FromDate;
    }
    if (this.Report == 'MemberLedger' && !this.MemberKey) { this.toastr.error('Select a member first'); return; }
    const current = ++this.requestNumber; this.dataLoading = true; this.Error = '';
    this.service.accessReport(this.request('Data', { Export: exportCsv })).subscribe((r: any) => {
      if (current != this.requestNumber) return;
      this.dataLoading = false;
      if (r.Message != ConstantData.SuccessMessage) { this.fail(r.Message); return; }
      if (exportCsv) { this.download(r.Rows); return; }
      this.Checks = r; this.Rows = r.Rows || []; this.Total = r.Total || 0; this.Totals = r.Totals || {}; this.Loaded = true;
      if (r.Company) this.Company = r.Company;
      if (this.Report == 'DayBook' && this.Checks?.DayBook) {
        const initGroup = (g: any) => {
          // Long data (> 5 rows) starts collapsed with [+] icon
          g.collapsed = (g.Rows && g.Rows.length > 5);
        };
        (this.Checks.DayBook.Receipts || []).forEach(initGroup);
        (this.Checks.DayBook.Payments || []).forEach(initGroup);
      }
    }, err => { if (current == this.requestNumber) this.fail(err.error?.Message); });
  }
  fail(message: string) {
    this.dataLoading = false; this.Loaded = false; this.Rows = []; this.Totals = {};
    this.Error = message || 'Unable to load this report'; this.toastr.error(this.Error);
  }
  page(change: number) { this.PageNumber += change; this.load(); }
  printDayBook() { window.print(); }
  toggleGroup(group: any) {
    if (group) group.collapsed = !group.collapsed;
  }
  expandAllGroups(expand: boolean) {
    if (this.Checks?.DayBook?.Receipts) {
      this.Checks.DayBook.Receipts.forEach((g: any) => g.collapsed = !expand);
    }
    if (this.Checks?.DayBook?.Payments) {
      this.Checks.DayBook.Payments.forEach((g: any) => g.collapsed = !expand);
    }
  }
  balance(value: number) {
    if (this.Report == 'CashBank') {
      return `${Math.abs(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${value >= 0 ? ' Cr' : ' Dr'}`;
    }
    return `${Math.abs(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${value > 0 ? ' Dr' : value < 0 ? ' Cr' : ''}`;
  }
  sum(arr: number[], count?: number): number {
    if (!arr || !arr.length) return 0;
    const items = count !== undefined ? arr.slice(0, count) : arr;
    return items.reduce((a, b) => a + (b || 0), 0);
  }
  getReceiptsRowCount(): number {
    if (!this.Checks?.DayBook?.Receipts || !this.Checks.DayBook.Receipts.length) return 2;
    return this.Checks.DayBook.Receipts.reduce((sum: number, g: any) => sum + 2 + (g.collapsed ? 0 : (g.Rows?.length || 0)), 0) + 1;
  }
  getPaymentsRowCount(): number {
    if (!this.Checks?.DayBook?.Payments || !this.Checks.DayBook.Payments.length) return 2;
    return this.Checks.DayBook.Payments.reduce((sum: number, g: any) => sum + 2 + (g.collapsed ? 0 : (g.Rows?.length || 0)), 0) + 1;
  }
  get isBalance() { return this.Report == 'TrialBalance' || this.Report == 'MemberBalances'; }
  get showMember() { return this.Report == 'DayBook' || this.Report == 'HeadLedger' || this.Report == 'CashBank' || this.Report == 'MemberBalances'; }
  get pageCount() { return Math.max(1, Math.ceil(this.Total / this.PageSize)); }
  matches(row: any) { return row.ActiveRows == row.ImportedRows && row.OpeningRows == row.ImportedOpenings && row.SourceDebit == row.ImportedDebit && row.SourceCredit == row.ImportedCredit && row.SourceOpening == row.ImportedOpening; }
  private download(rows: any[]) {
    const columns = this.Report == 'LoanApplications'
      ? ['YearId', 'ApplicationNumber', 'MemberNo', 'StaffNo', 'MemberName', 'LoanType', 'Requested', 'Sanctioned', 'Payable', 'Instalment', 'CheckedDate', 'VerifiedDate', 'Passed', 'Deleted', 'SourceRowId']
      : ['Kind', 'HeadCode', 'HeadName', 'EntryDate', 'VoucherNumber', 'ReferenceNumber', 'ChequeNumber', 'MemberNo', 'StaffNo', 'MemberName', 'Narration', 'Opening', 'Debit', 'Credit', 'Closing', 'SourceRowId'];
    // Prevent spreadsheet formulas when source narrations or names start with special characters.
    const quote = (value: any) => { let text = value == null ? '' : String(value); if (typeof value == 'string' && /^[\s]*[=+\-@]/.test(text)) text = "'" + text; return '"' + text.replace(/"/g, '""') + '"'; };
    const csv = columns.join(',') + '\r\n' + rows.map(row => columns.map(column => quote(row[column])).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = `${this.Report}-${this.YearId}-${this.FromDate}-${this.ToDate}.csv`; link.click(); URL.revokeObjectURL(url);
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

  downloadPdf() {
    if (this.Report !== 'TrialBalance') return;
    this.dataLoading = true;
    this.service.accessReport(this.request('Data', { Export: true })).subscribe((r: any) => {
      this.dataLoading = false;
      if (r.Message != ConstantData.SuccessMessage) {
        this.toastr.error(r.Message || 'Unable to fetch report data for PDF');
        return;
      }
      const allRows: any[] = r.Rows || [];
      const company = r.Company || this.Company || {};

      const isClearingHead = (name: string) => (name || '').toUpperCase().includes('RECOVERY FROM');

      // Separate into Non-Bank/Cash heads and Bank/Cash heads
      const nonBankRows = allRows.filter((row: any) => {
        const isBankOrCash = row.HeadType === 'B' || row.HeadType === 'C';
        if (isBankOrCash) return false;
        if (isClearingHead(row.HeadName)) return false;
        const credit = Number(row.Credit || 0);
        const debit = Number(row.Debit || 0);
        return Math.abs(credit) > 0.001 || Math.abs(debit) > 0.001;
      }).sort((a: any, b: any) => (a.HeadName || '').localeCompare(b.HeadName || ''));

      const bankRows = allRows.filter((row: any) => {
        const isBankOrCash = row.HeadType === 'B' || row.HeadType === 'C';
        if (!isBankOrCash) return false;
        const opening = Number(row.Opening || 0);
        const closing = Number(row.Closing || 0);
        const credit = Number(row.Credit || 0);
        const debit = Number(row.Debit || 0);
        return Math.abs(opening) > 0.001 || Math.abs(closing) > 0.001 || Math.abs(credit) > 0.001 || Math.abs(debit) > 0.001;
      }).sort((a: any, b: any) => (a.HeadName || '').localeCompare(b.HeadName || ''));

      const body: any[] = [];
      let slNo = 1;
      let totalReceipts = 0;
      let totalPayments = 0;

      for (const row of nonBankRows) {
        const receipts = Number(row.Credit || 0);
        const payments = Number(row.Debit || 0);
        totalReceipts += receipts;
        totalPayments += payments;
        body.push([
          `${slNo++}. ${(row.HeadName || '').toUpperCase()}`,
          receipts.toFixed(2),
          payments.toFixed(2)
        ]);
      }

      if (bankRows.length > 0) {
        body.push([
          {
            content: 'Cash and Banks',
            colSpan: 3,
            styles: { fontStyle: 'bold', fontSize: 8.5, cellPadding: { top: 3.5, bottom: 2, left: 6 } }
          }
        ]);

        for (const row of bankRows) {
          const receipts = Math.abs(Number(row.Opening || 0));
          const payments = Math.abs(Number(row.Closing || 0));
          totalReceipts += receipts;
          totalPayments += payments;
          body.push([
            `${slNo++}. ${(row.HeadName || '').toUpperCase()}`,
            receipts.toFixed(2),
            payments.toFixed(2)
          ]);
        }
      }

      const totalRowIndex = body.length;
      body.push([
        { content: 'Total:', styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
        { content: totalReceipts.toFixed(2), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
        { content: totalPayments.toFixed(2), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }
      ]);

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const centerX = pageWidth / 2;

      const fromDateStr = this.formatDateDDMMMYYYY(this.FromDate || r.FromDate);
      const toDateStr = this.formatDateDDMMMYYYY(this.ToDate || r.ToDate);
      const todayStr = this.formatDateDDMMMYYYY(new Date());

      // Header drawing (Page 1)
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
      doc.setFontSize(12);
      const reportTitle = 'Receipts & Expenditures';
      doc.text(reportTitle, centerX, nextY + 3.5, { align: 'center' });
      const titleW = doc.getTextWidth(reportTitle);
      doc.setLineWidth(0.4);
      doc.line(centerX - titleW / 2, nextY + 4.5, centerX + titleW / 2, nextY + 4.5);
      nextY += 9;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      const periodText = `From: ${fromDateStr} To: ${toDateStr}`;
      doc.text(periodText, centerX, nextY + 2, { align: 'center' });
      nextY += 6;

      autoTable(doc, {
        head: [
          [
            { content: 'Sl. Head', styles: { halign: 'left' } },
            { content: 'Receipts (Cr)', styles: { halign: 'right' } },
            { content: 'Payments (Dr)', styles: { halign: 'right' } }
          ]
        ],
        body: body,
        startY: nextY + 1,
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
          0: { cellWidth: 104, halign: 'left' },
          1: { cellWidth: 38, halign: 'right' },
          2: { cellWidth: 38, halign: 'right' }
        },
        didParseCell: (data) => {
          if (data.column.index === 1 || data.column.index === 2) {
            data.cell.styles.halign = 'right';
          }
        },
        didDrawCell: (data) => {
          if (data.row.index === totalRowIndex) {
            doc.setDrawColor(0);
            doc.setLineWidth(0.35);
            // Single top line above total row
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
        doc.text(`Report Date: ${todayStr}`, pageWidth - 15, pageHeight - 7, { align: 'right' });
      }

      const fileName = `Receipts_and_Expenditures_${this.FromDate}_to_${this.ToDate}.pdf`;
      doc.save(fileName);
      this.toastr.success('PDF downloaded successfully');
    }, err => {
      this.dataLoading = false;
      this.toastr.error(err.error?.Message || 'Failed to download PDF');
    });
  }
}





