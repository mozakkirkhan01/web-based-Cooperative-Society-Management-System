import {
  REPORT_PAGE_SIZE_OPTIONS,
  MEMBER_CATEGORY_FILTER_OPTIONS,
  SocietyConfig,
  getTodayDisplayDate,
  generateFiscalMonthsForYear
} from '../../utils/constants';
import { formatPlainInt } from '../../utils/formatters';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';

import { ToastrService } from 'ngx-toastr';

import { AppService } from '../../utils/app.service';

import { LocalService } from '../../utils/local.service';

import { ConstantData } from '../../utils/constant-data';

import { RequestModel } from '../../utils/interface';

import jsPDF from 'jspdf';

import autoTable from 'jspdf-autotable';



export interface S06Row {

  LineId?: number;

  SlNo: number;

  PageNo: string;

  StaffNo: string;

  MemberNo?: string;

  MemberName?: string;

  Department?: string;

  Installment: number;

  Code: string;

  VrNo: string;

  VrDate: string;

  AccNo: string;

}



@Component({

  selector: 'app-edp-s06',

  templateUrl: './edp-s06.component.html',

  styleUrls: ['./edp-s06.component.css'],

  encapsulation: ViewEncapsulation.None

})

export class EdpS06Component implements OnInit {



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



  rows: S06Row[] = [];

  filteredRows: S06Row[] = [];

  totals: any = {

    TotalRecords: 0,

    TotalInstallment: 0

  };



  searchText = '';

  currentPage = 1;

  pageSize = 10;

  pageSizeOptions = [...REPORT_PAGE_SIZE_OPTIONS];
  memberCategoryOptions = MEMBER_CATEGORY_FILTER_OPTIONS;



  isEditing = false;

  editIndex = -1;

  formModel: S06Row = this.getEmptyForm();



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
    this.reportDate = getTodayDisplayDate();
  }



  get formattedMonthDisplay(): string {

    const found = this.months.find(m => m.MonthCode === this.selectedMonthCode);

    if (found) return found.MonthName;

    return this.selectedMonthCode;

  }



  getEmptyForm(): S06Row {

    return {

      SlNo: 0,

      PageNo: '001',

      StaffNo: '',

      MemberNo: '',

      MemberName: '',

      Department: '',

      Installment: 0,

      Code: SocietyConfig.Code2,

      VrNo: '',

      VrDate: '',

      AccNo: SocietyConfig.DefaultAccountNo

    };

  }



  get printPages(): { pageIndex: number; pageNumber: string; rows: S06Row[]; isLastPage: boolean }[] {
    const pages: any[] = [];
    const maxRows = 10;
    if (!this.rows || this.rows.length === 0) {
      return [{ pageIndex: 0, pageNumber: '001', rows: [], isLastPage: true }];
    }
    const totalPages = Math.ceil(this.rows.length / maxRows);
    for (let i = 0; i < totalPages; i++) {
      const pageRows = this.rows.slice(i * maxRows, (i + 1) * maxRows);
      const pageNumStr = String(i + 1).padStart(3, '0');
      pageRows.forEach(r => {
        r.PageNo = pageNumStr;
      });
      pages.push({
        pageIndex: i,
        pageNumber: pageNumStr,
        rows: pageRows,
        isLastPage: i === totalPages - 1
      });
    }
    return pages;
  }

  formatPlainInt(val: any, showDashIfZero: boolean = false): string {
    if (val === null || val === undefined || val === '') {
      return showDashIfZero ? '-' : '0';
    }
    const cleanStr = String(val).replace(/,/g, '');
    const n = Math.round(Number(cleanStr) || 0);
    if (n === 0 && showDashIfZero) return '-';
    return String(n);
  }

  formatVrNo(vr: string): string {

    if (!vr) return '';

    const clean = vr.trim().replace(/\D/g, '');

    if (!clean) return vr.trim();

    if (clean.length === 6 && clean.startsWith('05')) {

      return clean;

    }

    if (clean.length <= 4) {

      return '05' + clean.padStart(4, '0');

    }

    if (clean.length === 5) {

      return '0' + clean;

    }

    return '05' + clean.slice(-4);

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

        }

      },

      error: () => {

        this.dataLoading = false;

        this.toastr.error('Server error loading setup.');

      }

    });

  }



    generateMonthsForYear(fyName: string): any[] {
    return generateFiscalMonthsForYear(fyName);
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



  fetchAdviceData(): void {

    const payload = {

      StaffLoginId: this.userDetail?.StaffLoginId || 7,

      AdviceType: 'S06',

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

          const rawRows = res.Rows || [];

          this.rows = rawRows.map((r: any) => ({

            ...r,

            Code: (!r.Code || r.Code === '03') ? '05' : r.Code,

            VrNo: r.VrNo ? this.formatVrNo(r.VrNo) : ''

          }));

          this.applyFilterAndSort();

          this.calculateTotals();

        } else {

          this.toastr.error(res.Message || 'Failed to fetch S06 advice data.');

          this.rows = [];

          this.filteredRows = [];

        }

      },

      error: () => {

        this.dataLoading = false;

        this.isInitialLoad = false;

        this.toastr.error('Server error generating S06 advice.');

      }

    });

  }



  saveDraftBatch(): void {

    const payload = {

      StaffLoginId: this.userDetail?.StaffLoginId || 7,

      AdviceType: 'S06',

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

          this.toastr.success('S06 Advice Batch saved successfully!');

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



    // Automatically set Vr.No. starting with society code '05' + Member No (e.g. 057784)

    if (m.MemberNo) {

      const memStr = String(m.MemberNo).trim().replace(/\D/g, '');

      const paddedMem = memStr.length <= 4 ? memStr.padStart(4, '0') : memStr.slice(-4);

      this.formModel.VrNo = SocietyConfig.Code2 + paddedMem;

    }

  }



  onStaffNoBlur(): void {

    setTimeout(() => {

      if (!this.formModel.MemberName && this.formModel.StaffNo && this.formModel.StaffNo.trim()) {

        const staff = this.formModel.StaffNo.trim();

        const match = this.memberSearchResults.find((m: any) => String(m.StaffNo).trim() === staff);

        if (match) {

          this.selectMember(match);

        } else if (staff.length >= 3) {

          const payload = { SearchTerm: staff };

          const req: RequestModel = {

            request: this.localService.encrypt(JSON.stringify(payload)).toString()

          };

          this.service.edpAdvice('SearchMember', req).subscribe({

            next: (res: any) => {

              if (res.Message === ConstantData.SuccessMessage && res.Members && res.Members.length > 0) {

                const found = res.Members.find((m: any) => String(m.StaffNo).trim() === staff) || res.Members[0];

                if (found) {

                  this.selectMember(found);

                }

              }

            }

          });

        }

      }

      this.showMemberDropdown = false;

    }, 200);

  }



  addOrUpdateEntry(): void {

    if (!this.formModel.StaffNo || this.formModel.StaffNo.trim() === '') {

      this.toastr.warning('Please enter Staff Number.');

      return;

    }



    if (!this.formModel.Code || this.formModel.Code === '03') {

      this.formModel.Code = '05';

    }

    if (this.formModel.VrNo && this.formModel.VrNo.trim() !== '') {

      this.formModel.VrNo = this.formatVrNo(this.formModel.VrNo);

    }

    if (!this.formModel.AccNo) {

      this.formModel.AccNo = '000048';

    }



    if (this.isEditing && this.editIndex >= 0) {

      this.rows[this.editIndex] = { ...this.formModel };

      this.toastr.info('S06 Entry updated.');

      this.cancelEdit();

    } else {

      this.formModel.SlNo = this.rows.length + 1;

      this.rows.push({ ...this.formModel });

      this.toastr.success('S06 Entry added.');

      this.formModel = this.getEmptyForm();

    }



    this.applyFilterAndSort();

    this.calculateTotals();

  }



  editRow(row: S06Row, index: number): void {

    this.isEditing = true;

    this.editIndex = index;

    this.formModel = { ...row };

  }



  deleteRow(index: number): void {

    if (confirm('Are you sure you want to remove this row from the S06 advice?')) {

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
    for (let i = 0; i < this.rows.length; i++) {
      this.rows[i].SlNo = sl++;
      this.rows[i].PageNo = String(Math.floor(i / 10) + 1).padStart(3, '0');
    }
  }



  calculateTotals(): void {

    const list = this.filteredRows;

    this.totals = {

      TotalRecords: list.length,

      TotalInstallment: list.reduce((acc, r) => acc + (r.Installment || 0), 0)

    };

  }



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



  get pagedRows(): S06Row[] {

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

      AdviceType: 'S06',

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

          link.setAttribute('download', res.FileName || `S06_${this.selectedMonthCode}.TXT`);

          document.body.appendChild(link);

          link.click();

          document.body.removeChild(link);

          this.toastr.success('EDP S06 Text File downloaded successfully!');

        } else {

          this.toastr.error(res.Message || 'Failed to generate S06 text file.');

        }

      },

      error: () => {

        this.toastr.error('Server error exporting S06 file.');

      }

    });

  }



  exportCsv(): void {

    if (this.rows.length === 0) {

      this.toastr.warning('No data to export.');

      return;

    }



    const headers = ['SlNo', 'File/Page', 'StaffNo', 'Installment', 'Code', 'VrNo', 'VrDate', 'AccNo'];

    const csvRows: string[] = [];

    csvRows.push(headers.join(','));



    for (const r of this.rows) {

      csvRows.push([

        r.SlNo,

        `"005/${r.PageNo || '001'}"`,

        `"${r.StaffNo}"`,

        r.Installment || 0,

        `"${r.Code || '05'}"`,

        `"${r.VrNo ? this.formatVrNo(r.VrNo) : ''}"`,

        `"${r.VrDate || ''}"`,

        `"${r.AccNo || '000048'}"`

      ].join(','));

    }



    const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);

    link.setAttribute('download', `EDP_S06_${this.selectedMonthCode}.csv`);

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

      const title = 'Loan and Advance Master Changes Advice (S06)';

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

        r.MemberName || '-',

        r.Department || '-',

        r.Installment > 0 ? Number(r.Installment).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00',

        r.VrNo ? this.formatVrNo(r.VrNo) : '-',

        r.VrDate || '-',

        r.Code || '05',

        r.AccNo || '000048'

      ]);



      const foot = [

        [

          { content: `Total (${this.rows.length} Records):`, colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } },

          { content: Number(this.totals.TotalInstallment || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } },

          { content: '', colSpan: 4, styles: { halign: 'left' } }

        ]

      ];



      autoTable(doc, {

        head: [

          [

            { content: '#', styles: { halign: 'center' } },

            { content: 'File/Page', styles: { halign: 'center' } },

            { content: 'Staff No', styles: { halign: 'center' } },

            { content: 'Member Name', styles: { halign: 'left' } },

            { content: 'Dept', styles: { halign: 'left' } },

            { content: 'Installment (₹)', styles: { halign: 'right' } },

            { content: 'Vr. No', styles: { halign: 'center' } },

            { content: 'Vr. Date', styles: { halign: 'center' } },

            { content: 'Code', styles: { halign: 'center' } },

            { content: 'Acc No', styles: { halign: 'center' } }

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



      const fileName = `S06_${this.selectedMonthCode}_Advice.pdf`;

      doc.save(fileName);

      this.toastr.success('S06 PDF downloaded successfully!');

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

