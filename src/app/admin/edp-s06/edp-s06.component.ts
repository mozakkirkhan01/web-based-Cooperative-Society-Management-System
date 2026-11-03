import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { ConstantData } from '../../utils/constant-data';
import { RequestModel } from '../../utils/interface';

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

  months: any[] = [];
  selectedMonthCode = '0426';

  company: any = {
    CompanyName: 'Bokaro Steel Employees (TA/Med./Mat.) Co-op. Cr. Soc. Ltd.',
    CompanyNameHindi: 'बोकारो इस्पात कर्मचारी (टी०ए०/मेड०/मेट०) सहकारी साख समिति लिमिटेड',
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
  pageSize = 25;
  pageSizeOptions = [
    { label: '15 / page', value: 15 },
    { label: '25 / page', value: 25 },
    { label: '50 / page', value: 50 },
    { label: 'All records', value: -1 }
  ];

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

  getEmptyForm(): S06Row {
    return {
      SlNo: 0,
      PageNo: '001',
      StaffNo: '',
      MemberNo: '',
      MemberName: '',
      Department: '',
      Installment: 0,
      Code: '03',
      VrNo: '',
      VrDate: '',
      AccNo: '000048'
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
          this.months = res.Months || [];
          if (res.Months && res.Months.length > 0) {
            this.selectedMonthCode = res.Months[0].MonthCode; // S06 reporting month
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
          this.rows = res.Rows || [];
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
  }

  addOrUpdateEntry(): void {
    if (!this.formModel.StaffNo || this.formModel.StaffNo.trim() === '') {
      this.toastr.warning('Please enter Staff Number.');
      return;
    }

    if (!this.formModel.Code) {
      this.formModel.Code = '03';
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
    for (const r of this.rows) {
      r.SlNo = sl++;
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
        `"003/${r.PageNo || '001'}"`,
        `"${r.StaffNo}"`,
        r.Installment || 0,
        `"${r.Code || '03'}"`,
        `"${r.VrNo || ''}"`,
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

  formatFixedDigits(val: any, digits: number): string {
    const num = Math.round(Number(val) || 0);
    return String(num).padStart(digits, '0');
  }
}
