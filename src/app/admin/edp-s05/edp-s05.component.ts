import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { ConstantData } from '../../utils/constant-data';
import { RequestModel } from '../../utils/interface';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface S05Row {
  LineId?: number;
  SlNo: number;
  PageNo: string;
  StaffNo: string;
  CoopNo: string; // e.g. "00"
  MemberNo?: string;
  MemberName?: string;
  Department?: string;
  ShareAmount: number;
  RDAmount: number;
}

@Component({
  selector: 'app-edp-s05',
  templateUrl: './edp-s05.component.html',
  styleUrls: ['./edp-s05.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class EdpS05Component implements OnInit {

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

  company: any = {
    CompanyName: 'Bokaro Steel Employees (TA/MED/MAT.) C.C.S.Ltd.',
    CompanyNameHindi: 'बोकारो इस्पात कर्मचारी (टी०ए०/मेड०/मैट०) सहकारी साख समिति लिमिटेड',
    RegistrationNo: 'BAGH-6/78',
    CompanyAddress: 'Old Admn. Bldg., Bokaro Steel City-827001'
  };

  rows: S05Row[] = [];
  filteredRows: S05Row[] = [];
  totals: any = {
    TotalRecords: 0,
    TotalShareAmount: 0,
    TotalRDAmount: 0
  };

  searchText = '';
  currentPage = 1;
  pageSize = 25;
  pageSizeOptions = [
    { label: '15 / page', value: 15 },
    { label: '25 / page', value: 25 },
    { label: '50 / page', value: 50 },
    { label: 'All records', value: -1 }
  ];

  isEditing = false;
  editIndex = -1;
  formModel: S05Row = this.getEmptyForm();

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
    return this.selectedMonthCode;
  }

  getEmptyForm(): S05Row {
    return {
      SlNo: 0,
      PageNo: '001',
      StaffNo: '',
      CoopNo: '05',
      MemberNo: '',
      MemberName: '',
      Department: '',
      ShareAmount: 0,
      RDAmount: 0
    };
  }

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
          this.updateMonthsForSelectedFY();

          if (res.DefaultMonthCode && this.months.some(m => m.MonthCode === res.DefaultMonthCode)) {
            this.selectedMonthCode = res.DefaultMonthCode;
          } else if (this.months.length > 0 && !this.months.some(m => m.MonthCode === this.selectedMonthCode)) {
            this.selectedMonthCode = this.months[0].MonthCode;
          }

          this.fetchAdviceData();
        }
      },
      error: () => {
        this.dataLoading = false;
        this.toastr.error('Server error loading setup.');
      }
    });
  }

  onFinancialYearChange(): void {
    this.updateMonthsForSelectedFY();
    this.fetchAdviceData();
  }

  updateMonthsForSelectedFY(): void {
    if (this.selectedFinancialYear === '2026-27') {
      this.months = [
        { MonthCode: '0426', MonthName: 'April 2026' },
        { MonthCode: '0526', MonthName: 'May 2026' },
        { MonthCode: '0626', MonthName: 'June 2026' },
        { MonthCode: '0726', MonthName: 'July 2026' },
        { MonthCode: '0826', MonthName: 'August 2026' },
        { MonthCode: '0926', MonthName: 'September 2026' },
        { MonthCode: '1026', MonthName: 'October 2026' },
        { MonthCode: '1126', MonthName: 'November 2026' },
        { MonthCode: '1226', MonthName: 'December 2026' },
        { MonthCode: '0127', MonthName: 'January 2027' },
        { MonthCode: '0227', MonthName: 'February 2027' },
        { MonthCode: '0327', MonthName: 'March 2027' }
      ];
    } else {
      this.months = [
        { MonthCode: '0425', MonthName: 'April 2025' },
        { MonthCode: '0525', MonthName: 'May 2025' },
        { MonthCode: '0625', MonthName: 'June 2025' },
        { MonthCode: '0725', MonthName: 'July 2025' },
        { MonthCode: '0825', MonthName: 'August 2025' },
        { MonthCode: '0925', MonthName: 'September 2025' },
        { MonthCode: '1025', MonthName: 'October 2025' },
        { MonthCode: '1125', MonthName: 'November 2025' },
        { MonthCode: '1225', MonthName: 'December 2025' },
        { MonthCode: '0126', MonthName: 'January 2026' },
        { MonthCode: '0226', MonthName: 'February 2026' },
        { MonthCode: '0326', MonthName: 'March 2026' }
      ];
    }

    if (this.months.length > 0 && !this.months.some(m => m.MonthCode === this.selectedMonthCode)) {
      this.selectedMonthCode = this.months[0].MonthCode;
    }
  }

  fetchAdviceData(): void {
    const payload = {
      StaffLoginId: this.userDetail?.StaffLoginId || 7,
      AdviceType: 'S05',
      MonthCode: this.selectedMonthCode
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
          this.toastr.error(res.Message || 'Failed to fetch S05 advice data.');
          this.rows = [];
          this.filteredRows = [];
        }
      },
      error: () => {
        this.dataLoading = false;
        this.isInitialLoad = false;
        this.toastr.error('Server error generating S05 advice.');
      }
    });
  }

  saveDraftBatch(): void {
    const payload = {
      StaffLoginId: this.userDetail?.StaffLoginId || 7,
      AdviceType: 'S05',
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
          this.toastr.success('S05 Advice Batch saved successfully!');
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

  addOrUpdateEntry(): void {
    if (!this.formModel.StaffNo || this.formModel.StaffNo.trim() === '') {
      this.toastr.warning('Please enter Staff Number.');
      return;
    }

    if (this.isEditing && this.editIndex >= 0) {
      this.rows[this.editIndex] = { ...this.formModel };
      this.toastr.info('S05 Entry updated.');
      this.cancelEdit();
    } else {
      this.formModel.SlNo = this.rows.length + 1;
      this.rows.push({ ...this.formModel });
      this.toastr.success('S05 Entry added.');
      this.formModel = this.getEmptyForm();
    }

    this.applyFilterAndSort();
    this.calculateTotals();
  }

  editRow(row: S05Row, index: number): void {
    this.isEditing = true;
    this.editIndex = index;
    this.formModel = { ...row };
  }

  deleteRow(index: number): void {
    if (confirm('Are you sure you want to remove this row from the S05 advice?')) {
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
      TotalShareAmount: list.reduce((acc, r) => acc + (r.ShareAmount || 0), 0),
      TotalRDAmount: list.reduce((acc, r) => acc + (r.RDAmount || 0), 0)
    };
  }

  applyFilterAndSort(): void {
    let list = [...this.rows];
    if (this.searchText && this.searchText.trim() !== '') {
      const q = this.searchText.trim().toLowerCase();
      list = list.filter(r =>
        (r.StaffNo && r.StaffNo.toLowerCase().includes(q)) ||
        (r.MemberName && r.MemberName.toLowerCase().includes(q))
      );
    }
    this.filteredRows = list;
    this.currentPage = 1;
  }

  get pagedRows(): S05Row[] {
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

  printReport(): void {
    window.print();
  }

  downloadEdpTextFile(): void {
    const payload = {
      AdviceType: 'S05',
      MonthCode: this.selectedMonthCode,
      Lines: this.rows
    };

    const req: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    this.service.edpAdvice('ExportTextFile', req).subscribe({
      next: (res: any) => {
        if (res.Message === ConstantData.SuccessMessage && res.FileContent) {
          const blob = new Blob([res.FileContent], { type: 'text/plain;charset=utf-8' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.setAttribute('download', res.FileName || `S05_${this.selectedMonthCode}.TXT`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          this.toastr.success('EDP S05 Text File downloaded successfully!');
        } else {
          this.toastr.error(res.Message || 'Failed to generate S05 text file.');
        }
      },
      error: () => {
        this.toastr.error('Server error exporting S05 file.');
      }
    });
  }

  exportCsv(): void {
    if (this.rows.length === 0) {
      this.toastr.warning('No data to export.');
      return;
    }

    const headers = ['SlNo', 'File/Page', 'StaffNo', 'CoopNo', 'ShareAmt', 'RDAmt'];
    const csvRows: string[] = [];
    csvRows.push(headers.join(','));

    for (const r of this.rows) {
      csvRows.push([
        r.SlNo,
        `"005/${r.PageNo || '001'}"`,
        `"${r.StaffNo}"`,
        `"${r.CoopNo || '05'}"`,
        r.ShareAmount || 0,
        r.RDAmount || 0
      ].join(','));
    }

    const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `EDP_S05_${this.selectedMonthCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toastr.success('CSV exported successfully!');
  }

  downloadPdf(): void {
    if (!this.rows || this.rows.length === 0) {
      this.toastr.warning('No data to generate PDF.');
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const centerX = pageWidth / 2;

      // Header drawing
      const companyName = this.company.CompanyName || 'Bokaro Steel Employees (TA/MED/MAT.) C.C.S.Ltd.';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(26, 54, 93);
      doc.text(companyName, centerX, 14, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(45, 55, 72);
      const title = 'Loan Advances - Extra Transaction Advice (FILE NO.- S05)';
      doc.text(title, centerX, 20, { align: 'center' });

      // Subheader meta bar
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(74, 85, 104);
      const monthLabel = `Month: ${this.formattedMonthDisplay} (${this.selectedMonthCode})`;
      doc.text(monthLabel, 14, 27);

      const dateLabel = `Report Date: ${this.reportDate}`;
      doc.text(dateLabel, pageWidth - 14, 27, { align: 'right' });

      // Divider line
      doc.setDrawColor(49, 130, 206);
      doc.setLineWidth(0.5);
      doc.line(14, 29, pageWidth - 14, 29);

      // Data Rows
      const body = this.rows.map(r => [
        r.SlNo,
        `005/${r.PageNo || '001'}`,
        r.StaffNo,
        r.MemberNo || '-',
        r.MemberName || '-',
        r.Department || '-',
        r.CoopNo || '05',
        r.ShareAmount > 0 ? Number(r.ShareAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00',
        r.RDAmount > 0 ? Number(r.RDAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'
      ]);

      const foot = [
        [
          { content: `Total (${this.rows.length} Records):`, colSpan: 7, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: Number(this.totals.TotalShareAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } },
          { content: Number(this.totals.TotalRDAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } }
        ]
      ];

      autoTable(doc, {
        head: [
          [
            { content: '#', styles: { halign: 'center' } },
            { content: 'File/Page', styles: { halign: 'center' } },
            { content: 'Staff No', styles: { halign: 'center' } },
            { content: 'Mem No', styles: { halign: 'center' } },
            { content: 'Member Name', styles: { halign: 'left' } },
            { content: 'Dept', styles: { halign: 'left' } },
            { content: 'Coop', styles: { halign: 'center' } },
            { content: 'Share Amt (₹)', styles: { halign: 'right' } },
            { content: 'RD Amt (₹)', styles: { halign: 'right' } }
          ]
        ],
        body: body as any,
        foot: foot as any,
        startY: 32,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 64, 175],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: 2
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [30, 41, 59],
          cellPadding: 1.8
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontSize: 8,
          fontStyle: 'bold',
          cellPadding: 2
        },
        margin: { left: 12, right: 12, top: 32, bottom: 15 },
        didDrawPage: (data: any) => {
          const str = `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`;
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(str, pageWidth - 14, pageHeight - 8, { align: 'right' });

          const societyNote = 'Bokaro Steel Employees (TA/MED/MAT.) C.C.S.Ltd. - Computerized EDP System';
          doc.text(societyNote, 14, pageHeight - 8);
        }
      } as any);

      const fileName = `S05_${this.selectedMonthCode}_Advice.pdf`;
      doc.save(fileName);
      this.toastr.success('S05 PDF downloaded successfully!');
    } catch (err) {
      console.error('PDF export error:', err);
      this.toastr.error('Failed to export PDF.');
    }
  }

  formatFixedDigits(val: any, digits: number): string {
    const num = Math.round(Number(val) || 0);
    return String(num).padStart(digits, '0');
  }
}
