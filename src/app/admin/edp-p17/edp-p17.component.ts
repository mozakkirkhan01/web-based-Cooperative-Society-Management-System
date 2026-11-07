import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { ConstantData } from '../../utils/constant-data';
import { RequestModel } from '../../utils/interface';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface P17Row {
  LineId?: number;
  SlNo: number;
  PageNo: string;
  StaffNo: string;
  MemberNo?: string;
  MemberName?: string;
  Department?: string;
  LoanCode?: string;       // Default '09'
  VrNo: string;            // 6-digit voucher number
  VrDate: string;          // DDMMYY or DD-MM-YYYY
  LoanPaid: number;        // Loan Amount Paid
  LoanRefund: number;      // Loan Refunded
  LoanDeposited?: number;  // Loan Deposited
  LoanReceived: number;    // Compatibility with existing field
  InterestRefund: number;  // Pro-rata interest refund
  InterestRecovered?: number; // Interest Recovered on foreclosure
  InterestReceived: number;// Compatibility with existing field
  Installment: number;     // Monthly deduction
  Remarks?: string;        // PNB, SBI, JSCB, BY JE, 00 CODE, etc.
  ActInstt?: string;
  Err?: string;
  IsRepeatedStaff?: boolean;
  HasPaidAndReceivedSameDate?: boolean;
}

@Component({
  selector: 'app-edp-p17',
  templateUrl: './edp-p17.component.html',
  styleUrls: ['./edp-p17.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class EdpP17Component implements OnInit {

  // Setup & State
  dataLoading = false;
  savingBatch = false;
  isInitialLoad = true;
  userDetail: any = {};
  reportDate = '';

  financialYears: any[] = [
    { FinancialYearName: '2026-27', IsCurrent: true },
    { FinancialYearName: '2025-26', IsCurrent: false }
  ];
  selectedFinancialYear = '2026-27';
  allMonths: any[] = [];
  months: any[] = [];
  selectedMonthCode = '0426';
  selectedCategory = 'BSL';
  selectedSortBy = 'Date';

  company: any = {
    CompanyName: 'Bokaro Steel Employees (TA/MED/MAT.) C.C.S.Ltd.',
    CompanyNameHindi: 'बोकारो इस्पात कर्मचारी (कॉन० सिविल/इलेक्ट०) सहकारी साख समिति लिमिटेड',
    RegistrationNo: 'BAGH-6/78',
    CompanyAddress: 'Old Admn. Bldg., Bokaro Steel City-827001'
  };

  // Data & Results
  rows: P17Row[] = [];
  filteredRows: P17Row[] = [];
  totals: any = {
    TotalRecords: 0,
    TotalLoanPaid: 0,
    TotalLoanRefund: 0,
    TotalLoanReceived: 0,
    TotalInterestRefund: 0,
    TotalInterestReceived: 0,
    TotalInstallment: 0
  };

  // Search & Pagination
  searchText = '';
  currentPage = 1;
  pageSize = 25;
  pageSizeOptions = [
    { label: '15 / page', value: 15 },
    { label: '25 / page', value: 25 },
    { label: '50 / page', value: 50 },
    { label: 'All records', value: -1 }
  ];

  // Edit / Form Model
  isEditing = false;
  editIndex = -1;
  formModel: P17Row = this.getEmptyForm();

  // Member search autocomplete
  memberSearchLoading = false;
  memberSearchResults: any[] = [];
  showMemberDropdown = false;
  Math = Math;

  constructor(
    private service: AppService,
    private localService: LocalService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.userDetail = this.localService.getEmployeeDetail() || {};
    this.initReportDate();
    this.loadSetup();
  }

  initReportDate(): void {
    const today = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dd = String(today.getDate()).padStart(2, '0');
    const mmm = months[today.getMonth()];
    const yyyy = today.getFullYear();
    this.reportDate = `${dd}-${mmm}-${yyyy}`;
  }

  get formattedMonthDisplay(): string {
    const found = this.months.find(m => m.MonthCode === this.selectedMonthCode);
    if (found) return found.MonthName;
    if (this.selectedMonthCode && this.selectedMonthCode.length === 4) {
      return `${this.selectedMonthCode.substring(0, 2)}/20${this.selectedMonthCode.substring(2, 4)}`;
    }
    return this.selectedMonthCode;
  }

  getEmptyForm(): P17Row {
    return {
      SlNo: 0,
      PageNo: '001',
      StaffNo: '',
      MemberNo: '',
      MemberName: '',
      Department: '',
      LoanCode: '09',
      VrNo: '',
      VrDate: '',
      LoanPaid: 0,
      LoanRefund: 0,
      LoanDeposited: 0,
      LoanReceived: 0,
      InterestRefund: 0,
      InterestRecovered: 0,
      InterestReceived: 0,
      Installment: 0,
      Remarks: 'PNB'
    };
  }

  // 1. Setup API
  loadSetup(): void {
    const req: RequestModel = { request: '' };
    this.dataLoading = true;
    this.service.edpAdvice('GetSetup', req).subscribe({
      next: (res: any) => {
        this.dataLoading = false;
        if (res.Message === ConstantData.SuccessMessage) {
          if (res.Company) {
            this.company = { ...this.company, ...res.Company };
          }
          if (res.FinancialYears && res.FinancialYears.length > 0) {
            this.financialYears = res.FinancialYears;
          }
          this.allMonths = res.Months || [];
          if (res.CurrentFinancialYear) {
            this.selectedFinancialYear = res.CurrentFinancialYear;
          }
          this.updateMonthsForSelectedFY();

          if (res.DefaultMonthCode && this.months.some(m => m.MonthCode === res.DefaultMonthCode)) {
            this.selectedMonthCode = res.DefaultMonthCode;
          } else if (this.months.length > 0 && !this.months.some(m => m.MonthCode === this.selectedMonthCode)) {
            this.selectedMonthCode = this.months[0].MonthCode;
          }

          this.fetchAdviceData();
        } else {
          this.toastr.error(res.Message || 'Failed to load EDP setup.');
        }
      },
      error: () => {
        this.dataLoading = false;
        this.toastr.error('Server error loading setup.');
      }
    });
  }

    generateMonthsForYear(fyName: string): any[] {
    const startYear = parseInt((fyName || '').split('-')[0], 10) || new Date().getFullYear();
    const monthNames = [
      'April', 'May', 'June', 'July', 'August', 'September',
      'October', 'November', 'December', 'January', 'February', 'March'
    ];
    return monthNames.map((name, index) => {
      const calMonth = (index + 3) % 12 + 1;
      const calYear = index < 9 ? startYear : startYear + 1;
      const mm = String(calMonth).padStart(2, '0');
      const yy = String(calYear).slice(-2);
      return {
        MonthCode: `${mm}${yy}`,
        MonthName: `${name} ${calYear}`,
        FinancialYearName: fyName
      };
    });
  }

  updateMonthsForSelectedFY(): void {
    if (this.allMonths && this.allMonths.length > 0) {
      this.months = this.allMonths.filter(m => m.FinancialYearName === this.selectedFinancialYear);
    }

    if (!this.months || this.months.length === 0) {
      this.months = this.generateMonthsForYear(this.selectedFinancialYear);
    }

    if (this.months.length > 0 && !this.months.some(m => m.MonthCode === this.selectedMonthCode)) {
      this.selectedMonthCode = this.months[0].MonthCode;
    }
  }

    onFinancialYearChange(): void {
    this.updateMonthsForSelectedFY();
    this.fetchAdviceData();
  }

  // 2. Fetch Advice Data
  fetchAdviceData(): void {
    const payload = {
      StaffLoginId: this.userDetail?.StaffLoginId || 7,
      AdviceType: 'P17',
      MonthCode: this.selectedMonthCode,
      MemberCategory: this.selectedCategory,
      SortBy: this.selectedSortBy
    };

    const req: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    this.dataLoading = true;
    this.service.edpAdvice('GetAdviceData', req).subscribe({
      next: (res: any) => {
        this.dataLoading = false;
        this.isInitialLoad = false;
        if (res.Message === ConstantData.SuccessMessage) {
          this.rows = res.Rows || [];
          this.applyFilterAndSort();
          this.calculateTotals();
        } else {
          this.toastr.error(res.Message || 'Failed to fetch P17 advice data.');
          this.rows = [];
          this.filteredRows = [];
        }
      },
      error: () => {
        this.dataLoading = false;
        this.isInitialLoad = false;
        this.toastr.error('Server error while generating P17 advice.');
      }
    });
  }

  // 3. Save Batch
  saveDraftBatch(): void {
    const payload = {
      StaffLoginId: this.userDetail?.StaffLoginId || 7,
      AdviceType: 'P17',
      MonthCode: this.selectedMonthCode,
      Lines: this.rows
    };

    const req: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    this.savingBatch = true;
    this.service.edpAdvice('SaveBatch', req).subscribe({
      next: (res: any) => {
        this.savingBatch = false;
        if (res.Message === ConstantData.SuccessMessage) {
          this.toastr.success('P17 Advice Batch saved successfully!');
        } else {
          this.toastr.error(res.Message || 'Failed to save batch.');
        }
      },
      error: () => {
        this.savingBatch = false;
        this.toastr.error('Server error saving batch.');
      }
    });
  }

  // 4. Form Actions (Add / Update / Delete)
  onSearchStaff(term: string): void {
    if (!term || term.trim().length < 2) {
      this.memberSearchResults = [];
      this.showMemberDropdown = false;
      return;
    }

    const payload = { SearchTerm: term.trim() };
    const req: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    this.memberSearchLoading = true;
    this.service.edpAdvice('SearchMember', req).subscribe({
      next: (res: any) => {
        this.memberSearchLoading = false;
        if (res.Message === ConstantData.SuccessMessage) {
          this.memberSearchResults = res.Members || [];
          this.showMemberDropdown = this.memberSearchResults.length > 0;
        }
      },
      error: () => { this.memberSearchLoading = false; }
    });
  }

  selectMember(m: any): void {
    this.formModel.StaffNo = m.StaffNo;
    this.formModel.MemberNo = m.MemberNo;
    this.formModel.MemberName = m.MemberName;
    this.formModel.Department = m.Department;
    this.showMemberDropdown = false;
    this.memberSearchResults = [];
  }

  onLoanAmountOrDateChange(): void {
    if (this.formModel.LoanPaid > 0 && this.formModel.VrDate && this.formModel.VrDate.length >= 6) {
      // Parse day from VrDate (DDMMYY)
      const day = parseInt(this.formModel.VrDate.substring(0, 2), 10);
      let daysInMonth = 31;
      if (this.selectedMonthCode && this.selectedMonthCode.length === 4) {
        const m = parseInt(this.selectedMonthCode.substring(0, 2), 10);
        const y = 2000 + parseInt(this.selectedMonthCode.substring(2, 4), 10);
        daysInMonth = new Date(y, m, 0).getDate();
      }

      const daysCharged = Math.max(1, (daysInMonth - day) + 1);
      // Interest formula: (Principal * 6.5 * daysCharged) / 36500
      this.formModel.InterestRefund = Math.round((this.formModel.LoanPaid * 6.5 * daysCharged) / 36500);

      if (!this.formModel.Installment || this.formModel.Installment === 0) {
        this.formModel.Installment = Math.round(this.formModel.LoanPaid / 24);
      }
    }
  }

  addOrUpdateEntry(): void {
    if (!this.formModel.StaffNo || this.formModel.StaffNo.trim() === '') {
      this.toastr.warning('Please enter Staff Number.');
      return;
    }

    if (this.formModel.LoanPaid <= 0 && this.formModel.LoanReceived <= 0) {
      this.toastr.warning('Please enter Loan Paid or Loan Received amount.');
      return;
    }

    if (this.isEditing && this.editIndex >= 0) {
      this.rows[this.editIndex] = { ...this.formModel };
      this.toastr.info('Entry updated.');
      this.cancelEdit();
    } else {
      this.formModel.SlNo = this.rows.length + 1;
      this.rows.push({ ...this.formModel });
      this.toastr.success('Entry added.');
      this.formModel = this.getEmptyForm();
    }

    this.applyFilterAndSort();
    this.calculateTotals();
  }

  editRow(row: P17Row, index: number): void {
    this.isEditing = true;
    this.editIndex = index;
    this.formModel = { ...row };
  }

  deleteRow(index: number): void {
    if (confirm('Are you sure you want to remove this row from the P17 advice?')) {
      this.rows.splice(index, 1);
      this.reIndexRows();
      this.applyFilterAndSort();
      this.calculateTotals();
      this.toastr.warning('Row removed.');
    }
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editIndex = -1;
    this.formModel = this.getEmptyForm();
  }

  reIndexRows(): void {
    let sl = 1;
    for (const r of this.rows) {
      r.SlNo = sl++;
    }
  }

  calculateTotals(): void {
    const list = this.filteredRows;
    this.totals = {
      TotalRecords: list.length,
      TotalLoanPaid: list.reduce((acc, r) => acc + (r.LoanPaid || 0), 0),
      TotalLoanRefund: list.reduce((acc, r) => acc + (r.LoanRefund || 0), 0),
      TotalLoanReceived: list.reduce((acc, r) => acc + (r.LoanReceived || 0), 0),
      TotalInterestRefund: list.reduce((acc, r) => acc + (r.InterestRefund || 0), 0),
      TotalInterestReceived: list.reduce((acc, r) => acc + (r.InterestReceived || 0), 0),
      TotalInstallment: list.reduce((acc, r) => acc + (r.Installment || 0), 0)
    };
  }

  // 5. Filter & Pagination
  applyFilterAndSort(): void {
    let list = [...this.rows];

    if (this.searchText && this.searchText.trim() !== '') {
      const q = this.searchText.trim().toLowerCase();
      list = list.filter(r =>
        (r.StaffNo && r.StaffNo.toLowerCase().includes(q)) ||
        (r.MemberName && r.MemberName.toLowerCase().includes(q)) ||
        (r.VrNo && r.VrNo.toLowerCase().includes(q))
      );
    }

    this.filteredRows = list;
    this.currentPage = 1;
  }

  get pagedRows(): P17Row[] {
    if (this.pageSize === -1) return this.filteredRows;
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRows.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    if (this.pageSize === -1 || this.filteredRows.length === 0) return 1;
    return Math.ceil(this.filteredRows.length / this.pageSize);
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) {
      this.currentPage = p;
    }
  }

  // Formatting Helpers
  formatDisplayDate(raw: string): string {
    if (!raw) return '';
    const clean = String(raw).trim().replace(/[-/]/g, '');
    if (clean.length === 6) {
      // DDMMYY -> DD-MM-20YY
      return `${clean.substring(0, 2)}-${clean.substring(2, 4)}-20${clean.substring(4, 6)}`;
    }
    if (clean.length === 8) {
      // DDMMYYYY -> DD-MM-YYYY
      return `${clean.substring(0, 2)}-${clean.substring(2, 4)}-${clean.substring(4, 8)}`;
    }
    return raw;
  }

  formatCurrency(val: number): string {
    if (!val && val !== 0) return '0.00';
    return Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // 6. Print Report (Browser Print Dialog)
  printReport(): void {
    window.print();
  }

  // 7. Download PDF (Modern, Clean Design with Data Reference)
  downloadPdf(): void {
    if (!this.rows || this.rows.length === 0) {
      this.toastr.warning('No data to generate PDF.');
      return;
    }

    try {
      // Landscape A4: 297mm width x 210mm height
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const centerX = pageWidth / 2;

      // Header drawing
      const companyName = this.company.CompanyName || 'Bokaro Steel Employees (TA/MED/MAT.) C.C.S.Ltd.';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(26, 54, 93); // Dark Navy
      doc.text(companyName, centerX, 13, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(45, 55, 72);
      const title = 'Loan Advances - Extra Transaction Advice (FILE NO.- P17)';
      doc.text(title, centerX, 19, { align: 'center' });

      // Subheader meta bar: Month & Report Date
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(74, 85, 104);
      const monthLabel = `Month: ${this.formattedMonthDisplay} (${this.selectedMonthCode})`;
      doc.text(monthLabel, 14, 25);

      const dateLabel = `Report Date: ${this.reportDate}`;
      doc.text(dateLabel, pageWidth - 14, 25, { align: 'right' });

      // Divider line
      doc.setDrawColor(49, 130, 206);
      doc.setLineWidth(0.5);
      doc.line(14, 27, pageWidth - 14, 27);

      // Data Rows for autoTable
      const body = this.rows.map(r => [
        r.SlNo,
        r.StaffNo,
        r.LoanCode || '09',
        r.VrNo || '',
        this.formatDisplayDate(r.VrDate),
        r.LoanPaid > 0 ? this.formatCurrency(r.LoanPaid) : '-',
        r.LoanRefund > 0 ? this.formatCurrency(r.LoanRefund) : '-',
        (r.LoanDeposited || r.LoanReceived) > 0 ? this.formatCurrency(r.LoanDeposited || r.LoanReceived) : '-',
        r.InterestRefund > 0 ? this.formatCurrency(r.InterestRefund) : '-',
        (r.InterestRecovered || r.InterestReceived) > 0 ? this.formatCurrency(r.InterestRecovered || r.InterestReceived) : '-',
        r.Installment > 0 ? this.formatCurrency(r.Installment) : '-',
        r.Remarks || (r.LoanPaid > 0 ? 'PNB' : ((r.LoanDeposited || r.LoanReceived) > 0 ? 'JSCB' : '-'))
      ]);

      const foot = [
        [
          { content: `Grand Total (${this.rows.length} Records):`, colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: this.formatCurrency(this.totals.TotalLoanPaid), styles: { halign: 'right', fontStyle: 'bold' } },
          { content: this.formatCurrency(this.totals.TotalLoanRefund || 0), styles: { halign: 'right', fontStyle: 'bold' } },
          { content: this.formatCurrency(this.totals.TotalLoanReceived), styles: { halign: 'right', fontStyle: 'bold' } },
          { content: this.formatCurrency(this.totals.TotalInterestRefund), styles: { halign: 'right', fontStyle: 'bold' } },
          { content: this.formatCurrency(this.totals.TotalInterestReceived || 0), styles: { halign: 'right', fontStyle: 'bold' } },
          { content: this.formatCurrency(this.totals.TotalInstallment), styles: { halign: 'right', fontStyle: 'bold' } },
          { content: '', styles: { halign: 'left' } }
        ]
      ];

      autoTable(doc, {
        head: [
          [
            { content: 'Sl No', styles: { halign: 'center' } },
            { content: 'Staff No', styles: { halign: 'center' } },
            { content: 'Loan Code', styles: { halign: 'center' } },
            { content: 'Voucher No.', styles: { halign: 'center' } },
            { content: 'Date', styles: { halign: 'center' } },
            { content: 'Loan Paid (₹)', styles: { halign: 'right' } },
            { content: 'Loan Refund (₹)', styles: { halign: 'right' } },
            { content: 'Loan Deposited (₹)', styles: { halign: 'right' } },
            { content: 'Int. Refund (₹)', styles: { halign: 'right' } },
            { content: 'Int. Recovered (₹)', styles: { halign: 'right' } },
            { content: 'Install. Amount (₹)', styles: { halign: 'right' } },
            { content: 'Remarks', styles: { halign: 'left' } }
          ]
        ],
        body: body as any,
        foot: foot as any,
        startY: 29,
        margin: { top: 29, bottom: 15, left: 14, right: 14 },
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 7.2,
          cellPadding: { top: 1.4, bottom: 1.4, left: 1.2, right: 1.2 },
          textColor: [33, 37, 41],
          lineColor: [222, 226, 230],
          lineWidth: 0.15
        },
        headStyles: {
          fillColor: [30, 64, 175], // Clean Tailwind/Bootstrap Blue
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.6,
          halign: 'center',
          cellPadding: { top: 2, bottom: 2, left: 1.2, right: 1.2 }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // Subtle light zebra tint
        },
        footStyles: {
          fillColor: [224, 231, 255], // Light indigo-blue total bar
          textColor: [30, 58, 138],
          fontStyle: 'bold',
          fontSize: 7.6
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 18, halign: 'center' },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 22, halign: 'center' },
          5: { cellWidth: 28, halign: 'right' },
          6: { cellWidth: 24, halign: 'right' },
          7: { cellWidth: 28, halign: 'right' },
          8: { cellWidth: 24, halign: 'right' },
          9: { cellWidth: 25, halign: 'right' },
          10: { cellWidth: 26, halign: 'right' },
          11: { cellWidth: 'auto', halign: 'left' }
        },
        didDrawPage: (data) => {
          // Bottom footer on every page
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(113, 128, 150);
          const pageStr = `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`;
          doc.text(pageStr, centerX, pageHeight - 6, { align: 'center' });
          doc.text('SAIL/BSL EDP - P17 Monthly Advice', 14, pageHeight - 6);
          doc.text(`Generated on ${this.reportDate}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
        }
      });

      doc.save(`P17_${this.selectedMonthCode}.pdf`);
      this.toastr.success('P17 PDF downloaded successfully!');
    } catch (err: any) {
      console.error('PDF error:', err);
      this.toastr.error('Failed to generate PDF document.');
    }
  }

  // Client-side fallback to generate 100% exact 79-character text file lines
  generateClientP17Text(): string {
    let out = '';
    const monthCode = this.selectedMonthCode || '0426';
    const socCode = '005';

    this.rows.forEach((r, idx) => {
      const pageNum = Math.floor(idx / 20) + 1;
      const page = String(pageNum).padStart(3, '0');
      const staff = String(r.StaffNo || '').trim().padStart(6, '0').slice(-6);
      const loanCode = String(r.LoanCode || '09').trim().padStart(2, '0').slice(-2);
      const vrNo = String(r.VrNo || '').trim().padStart(6, '0').slice(-6);

      let vrDate = String(r.VrDate || '').trim().replace(/[-/]/g, '');
      if (vrDate.length === 8) {
        vrDate = vrDate.substring(0, 4) + vrDate.substring(6, 8);
      } else if (vrDate.length >= 6) {
        vrDate = vrDate.substring(0, 6);
      } else {
        vrDate = vrDate.padStart(6, '0');
      }

      const fmtAmt8 = (v: number) => {
        const n = Math.round(v || 0);
        return n > 0 ? String(n).padStart(8, '0') : ' '.repeat(8);
      };
      const fmtAmt6 = (v: number) => {
        const n = Math.round(v || 0);
        return n > 0 ? String(n).padStart(6, '0') : ' '.repeat(6);
      };

      const lnPaid = fmtAmt8(r.LoanPaid);
      const lnRefund = fmtAmt8(r.LoanRefund);
      const lnDep = fmtAmt8(r.LoanDeposited || r.LoanReceived);
      const intRfnd = fmtAmt8(r.InterestRefund);
      const intRec = fmtAmt8(r.InterestRecovered || r.InterestReceived);
      const instt = fmtAmt6(r.Installment);

      out += `P17${monthCode.padEnd(4)}${socCode}${page}${staff}${loanCode}${vrNo}${vrDate}${lnPaid}${lnRefund}${lnDep}${intRfnd}${intRec}${instt}\r\n`;
    });
    return out;
  }

  // 8. Export .TXT File for SAIL EDP (Exact 79-char specification)
  downloadEdpTextFile(): void {
    if (!this.rows || this.rows.length === 0) {
      this.toastr.warning('No data to export.');
      return;
    }

    const payload = {
      AdviceType: 'P17',
      MonthCode: this.selectedMonthCode,
      Lines: this.rows
    };

    const req: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    const fallbackDownload = () => {
      const text = this.generateClientP17Text();
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `P1705_${this.selectedMonthCode}.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.toastr.success('EDP P17 Text File downloaded successfully!');
    };

    this.service.edpAdvice('ExportTextFile', req).subscribe({
      next: (res: any) => {
        if (res.Message === ConstantData.SuccessMessage && res.FileContent) {
          const blob = new Blob([res.FileContent], { type: 'text/plain;charset=utf-8' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.setAttribute('download', res.FileName || `P1705_${this.selectedMonthCode}.txt`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          this.toastr.success('EDP P17 Text File downloaded successfully!');
        } else {
          fallbackDownload();
        }
      },
      error: () => {
        fallbackDownload();
      }
    });
  }

  // 9. Export CSV
  exportCsv(): void {
    if (this.rows.length === 0) {
      this.toastr.warning('No data to export.');
      return;
    }

    const headers = ['SlNo', 'File/Page', 'StaffNo', 'LoanCode', 'VrNo', 'VrDate', 'LoanPaid', 'LoanRefund', 'LoanDeposited', 'IntRefund', 'IntRecovered', 'Installment', 'Remarks'];
    const csvRows: string[] = [];
    csvRows.push(headers.join(','));

    for (const r of this.rows) {
      const row = [
        r.SlNo,
        `"005/${r.PageNo || '001'}"`,
        `"${r.StaffNo}"`,
        `"${r.LoanCode || '09'}"`,
        `"${r.VrNo}"`,
        `"${this.formatDisplayDate(r.VrDate)}"`,
        r.LoanPaid || 0,
        r.LoanRefund || 0,
        (r.LoanDeposited || r.LoanReceived) || 0,
        r.InterestRefund || 0,
        (r.InterestRecovered || r.InterestReceived) || 0,
        r.Installment || 0,
        `"${r.Remarks || ''}"`
      ];
      csvRows.push(row.join(','));
    }

    const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `P1705_${this.selectedMonthCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toastr.success('CSV exported successfully!');
  }
}
