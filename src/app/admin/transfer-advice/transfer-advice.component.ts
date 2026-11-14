import { Component, OnInit, OnDestroy } from '@angular/core';
import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { ToastrService } from 'ngx-toastr';
import { ConstantData } from '../../utils/constant-data';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface BankOption {
  BankId: number;
  BankName: string;
  AccountHolderName: string;
  AccountNo: string;
  IFSCCode: string;
  Branch: string;
}

export interface CompanyHeader {
  CompanyName: string;
  CompanyNameHindi: string;
  RegistrationNo: string;
  CompanyAddress: string;
  CityName: string;
  PinCode: string;
  MobileNo: string;
  AlternateNo: string;
  Email: string;
  LogoPNG?: string;
}

export interface BankAdviceItem {
  Id: number;
  LoanApplicationId?: number;
  StaffNo: string;
  MemberNo: string;
  MemberName: string;
  AccountNo: string;
  IFSCCode: string;
  BankName: string;
  BranchName: string;
  BankBranch: string;
  Amount: number;
  ApplicationNumber?: string;
  VerifiedDate?: string;
  Remarks?: string;
  Source?: string;
  IsValidIFSC: boolean;
  HasAccountNo: boolean;
}

export interface MemberLookup {
  MemberId: number;
  StaffNo: number;
  MemberNo: number;
  MemberName: string;
  AccountNo: string;
  IFSCCode: string;
  BankName: string;
  BranchName: string;
}

export interface ManualEntryModel {
  StaffNo: string;
  MemberNo: string;
  MemberName: string;
  BankName: string;
  BranchName: string;
  AccountNo: string;
  IFSCCode: string;
  Amount: number | null;
  Remarks: string;
}

@Component({
  selector: 'app-transfer-advice',
  templateUrl: './transfer-advice.component.html',
  styleUrls: ['./transfer-advice.component.css']
})
export class TransferAdviceComponent implements OnInit, OnDestroy {

  // Setup & Master Data
  banks: BankOption[] = [];
  selectedBankId: number | null = null;
  selectedBank: BankOption | null = null;
  company: CompanyHeader = {
    CompanyName: 'Bokaro Steel Employees (TA/Med./Mat.) Co-op. Cr. Soc. Ltd.',
    CompanyNameHindi: 'बोकारो इस्पात कर्मचारी (टी०ए० / मे० / मेट०) सहकारी साख समिति लिमिटेड',
    RegistrationNo: 'BAGH-6/78',
    CompanyAddress: 'Old Admn. Bldg., Bokaro Steel City',
    CityName: 'Bokaro Steel City',
    PinCode: '827001',
    MobileNo: '6205771796',
    AlternateNo: '',
    Email: ''
  };

  // Filter Models
  fromDate: string = '';
  toDate: string = '';
  reportDate: string = '';

  // Data & Rows
  rows: BankAdviceItem[] = [];
  filteredRows: BankAdviceItem[] = [];
  searchText: string = '';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 25;
  pageSizeOptions = [
    { label: '10 / page', value: 10 },
    { label: '25 / page', value: 25 },
    { label: '50 / page', value: 50 },
    { label: '100 / page', value: 100 },
    { label: 'All records', value: 100000 }
  ];

  // Manual Entry Form
  manualModel: ManualEntryModel = this.getEmptyManualForm();
  memberSearchResults: MemberLookup[] = [];
  showMemberDropdown: boolean = false;
  searchingMember: boolean = false;

  // Edit State
  isEditing: boolean = false;
  editingId: number | null = null;

  // Session Draft State
  hasSessionDraft: boolean = false;
  sessionDraftTime: string = '';
  private readonly SESSION_KEY = 'TRANSFER_ADVICE_DRAFT';

  // Loading States
  setupLoading: boolean = false;
  dataLoading: boolean = false;

  constructor(
    private service: AppService,
    private localService: LocalService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    const today = new Date();
    this.reportDate = this.formatDateDisplay(today);
    this.toDate = this.formatDateIso(today);
    // Default from date: 1st of current month
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    this.fromDate = this.formatDateIso(firstDay);

    this.loadSetup();
  }

  ngOnDestroy(): void {
    // Component tear-down
  }

  // ---------------------------------------------------------------------------
  // 1. Setup & Initialization
  // ---------------------------------------------------------------------------
  loadSetup(): void {
    this.setupLoading = true;
    const req = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };

    this.service.bankAdvice('GetSetup', req).subscribe({
      next: (res: any) => {
        this.setupLoading = false;
        if (res.Message === ConstantData.SuccessMessage) {
          this.banks = res.Banks || [];
          if (res.Company) {
            this.company = res.Company;
          }

          // In Transfer Advice, default to State Bank of India if available, else first bank
          if (this.banks.length > 0 && !this.selectedBankId) {
            const sbi = this.banks.find(b => (b.BankName || '').toUpperCase().includes('STATE BANK'));
            const defaultBank = sbi || this.banks[0];
            this.selectedBankId = defaultBank.BankId;
            this.selectedBank = defaultBank;
            this.manualModel.BankName = defaultBank.BankName;
          }

          if (res.DefaultFromDate && !this.fromDate) {
            this.fromDate = res.DefaultFromDate;
          }
          if (res.DefaultToDate && !this.toDate) {
            this.toDate = res.DefaultToDate;
          }

          // Check if there is an active session draft
          if (this.loadFromSession()) {
            this.toastr.info(`Restored ${this.rows.length} records from your browser session draft.`);
          }
        } else {
          this.toastr.error(res.Message || 'Failed to load bank setup.');
        }
      },
      error: () => {
        this.setupLoading = false;
        this.toastr.error('Server error loading setup.');
      }
    });
  }

  onBankChange(): void {
    if (this.selectedBankId) {
      this.selectedBank = this.banks.find(b => b.BankId === Number(this.selectedBankId)) || null;
      if (this.selectedBank && !this.isEditing) {
        this.manualModel.BankName = this.selectedBank.BankName;
      }
      this.saveToSession();
    } else {
      this.selectedBank = null;
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Fetch Verified Loans for Date Range (Same Bank Intra-transfer)
  // ---------------------------------------------------------------------------
  fetchVerifiedLoans(): void {
    if (!this.fromDate || !this.toDate) {
      this.toastr.warning('Please select both From and To dates.');
      return;
    }

    if (new Date(this.fromDate) > new Date(this.toDate)) {
      this.toastr.warning('From Date cannot be later than To Date.');
      return;
    }

    if (!this.selectedBankId) {
      this.toastr.warning('Please select the Society Source Bank.');
      return;
    }

    if (this.hasSessionDraft && this.rows.length > 0) {
      if (!confirm(`You have an active draft with ${this.rows.length} records.\n\nFetching fresh loans will replace your current advice list.\n\nDo you want to proceed?`)) {
        return;
      }
    }

    this.dataLoading = true;
    const payload = {
      FromDate: this.fromDate,
      ToDate: this.toDate,
      BankId: this.selectedBankId,
      IsSameBank: true
    };

    const req = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    this.service.bankAdvice('GetVerifiedLoanAdvices', req).subscribe({
      next: (res: any) => {
        this.dataLoading = false;
        if (res.Message === ConstantData.SuccessMessage) {
          const fetched: BankAdviceItem[] = res.Advices || [];
          this.rows = fetched;
          this.currentPage = 1;
          this.applyFilterAndSort();

          if (this.rows.length > 0) {
            this.saveToSession();
            this.toastr.success(`Loaded ${this.rows.length} same-bank verified loan transfers for advice.`);
          } else {
            this.clearSessionDraft();
            this.toastr.info(`No verified loan applications found for ${this.selectedBank ? this.selectedBank.BankName : 'selected bank'} in this date range.`);
          }
        } else {
          this.toastr.error(res.Message || 'Failed to fetch verified loans.');
        }
      },
      error: () => {
        this.dataLoading = false;
        this.toastr.error('Server error fetching verified loans.');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Manual Entry & Member Search Lookup
  // ---------------------------------------------------------------------------
  getEmptyManualForm(): ManualEntryModel {
    return {
      StaffNo: '',
      MemberNo: '',
      MemberName: '',
      BankName: this.selectedBank ? this.selectedBank.BankName : '',
      BranchName: '',
      AccountNo: '',
      IFSCCode: this.selectedBank ? (this.selectedBank.IFSCCode || '') : '',
      Amount: null,
      Remarks: ''
    };
  }

  onStaffInput(term: string): void {
    if (!term || term.trim().length < 2) {
      this.memberSearchResults = [];
      this.showMemberDropdown = false;
      return;
    }

    const payload = { SearchTerm: term.trim() };
    const req = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    this.searchingMember = true;
    this.service.bankAdvice('SearchMember', req).subscribe({
      next: (res: any) => {
        this.searchingMember = false;
        if (res.Message === ConstantData.SuccessMessage) {
          this.memberSearchResults = res.Members || [];
          this.showMemberDropdown = this.memberSearchResults.length > 0;
        }
      },
      error: () => { this.searchingMember = false; }
    });
  }

  selectMember(m: MemberLookup): void {
    this.manualModel.StaffNo = m.StaffNo.toString();
    this.manualModel.MemberNo = m.MemberNo.toString();
    this.manualModel.MemberName = m.MemberName;
    this.manualModel.BankName = m.BankName || (this.selectedBank ? this.selectedBank.BankName : '');
    this.manualModel.BranchName = m.BranchName || '';
    this.manualModel.AccountNo = m.AccountNo || '';
    this.manualModel.IFSCCode = (m.IFSCCode || (this.selectedBank ? this.selectedBank.IFSCCode : '') || '').toUpperCase();
    this.showMemberDropdown = false;
  }

  editRow(item: BankAdviceItem): void {
    this.isEditing = true;
    this.editingId = item.Id;
    this.manualModel = {
      StaffNo: item.StaffNo || '',
      MemberNo: item.MemberNo || '',
      MemberName: item.MemberName || '',
      BankName: item.BankName || '',
      BranchName: item.BranchName || '',
      AccountNo: item.AccountNo || '',
      IFSCCode: item.IFSCCode || '',
      Amount: item.Amount || null,
      Remarks: item.Remarks || ''
    };
    this.showMemberDropdown = false;

    // Smooth scroll down to the manual entry form
    const el = document.getElementById('manualEntryCard');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingId = null;
    this.manualModel = this.getEmptyManualForm();
    this.showMemberDropdown = false;
  }

  addOrUpdateEntry(): void {
    const m = this.manualModel;
    if (!m.StaffNo || !m.StaffNo.trim()) {
      this.toastr.warning('Please enter Staff Number.');
      return;
    }
    if (!m.MemberName || !m.MemberName.trim()) {
      this.toastr.warning('Please enter Beneficiary Name.');
      return;
    }
    if (!m.AccountNo || !m.AccountNo.trim()) {
      this.toastr.warning('Please enter Bank Account Number.');
      return;
    }
    if (!m.IFSCCode || !m.IFSCCode.trim()) {
      this.toastr.warning('Please enter Bank IFSC Code.');
      return;
    }
    if (!m.Amount || m.Amount <= 0) {
      this.toastr.warning('Please enter a valid transfer amount (> 0).');
      return;
    }

    const cleanStaff = m.StaffNo.trim();
    const cleanAcc = m.AccountNo.trim();
    const ifsc = m.IFSCCode.trim().toUpperCase();
    const bankName = (m.BankName || (this.selectedBank ? this.selectedBank.BankName : '')).trim();
    const branch = (m.BranchName || '').trim();
    const combinedBank = branch ? `${bankName}, ${branch}` : bankName;

    // Edit Existing Row
    if (this.isEditing && this.editingId !== null) {
      const idx = this.rows.findIndex(r => r.Id === this.editingId);
      if (idx !== -1) {
        this.rows[idx].StaffNo = cleanStaff;
        this.rows[idx].MemberNo = m.MemberNo ? m.MemberNo.trim() : '';
        this.rows[idx].MemberName = m.MemberName.trim();
        this.rows[idx].BankName = bankName;
        this.rows[idx].BranchName = branch;
        this.rows[idx].BankBranch = combinedBank;
        this.rows[idx].AccountNo = cleanAcc;
        this.rows[idx].IFSCCode = ifsc;
        this.rows[idx].Amount = Number(m.Amount);
        this.rows[idx].Remarks = m.Remarks ? m.Remarks.trim() : '';
        this.rows[idx].IsValidIFSC = this.validateIFSC(ifsc);
        this.rows[idx].HasAccountNo = cleanAcc.length > 0;

        this.applyFilterAndSort();
        this.saveToSession();
        this.toastr.success(`Updated transfer details for ${this.rows[idx].MemberName}.`);
        this.cancelEdit();
        return;
      }
    }

    // Duplicate check for new entries
    const existing = this.rows.find(r => r.StaffNo === cleanStaff || (cleanAcc && r.AccountNo === cleanAcc));
    if (existing) {
      if (!confirm(`Staff No ${cleanStaff} or Account No ${cleanAcc} is already in the transfer advice list.\n\nDo you still want to add this additional entry?`)) {
        return;
      }
    }

    const newItem: BankAdviceItem = {
      Id: this.rows.length + 1,
      LoanApplicationId: undefined,
      StaffNo: cleanStaff,
      MemberNo: m.MemberNo ? m.MemberNo.trim() : '',
      MemberName: m.MemberName.trim(),
      AccountNo: cleanAcc,
      IFSCCode: ifsc,
      BankName: bankName,
      BranchName: branch,
      BankBranch: combinedBank,
      Amount: Number(m.Amount),
      Remarks: m.Remarks ? m.Remarks.trim() : '',
      Source: 'MANUAL',
      IsValidIFSC: this.validateIFSC(ifsc),
      HasAccountNo: cleanAcc.length > 0
    };

    this.rows.push(newItem);
    this.reindexRows();
    this.applyFilterAndSort();
    this.saveToSession();

    this.manualModel = this.getEmptyManualForm();
    this.toastr.success(`Added transfer advice entry for ${newItem.MemberName} (₹${newItem.Amount.toLocaleString('en-IN')}).`);
  }

  removeRow(item: BankAdviceItem): void {
    const idx = this.rows.findIndex(r => r.Id === item.Id);
    if (idx !== -1) {
      this.rows.splice(idx, 1);
      this.reindexRows();
      this.applyFilterAndSort();
      this.saveToSession();
      this.toastr.info(`Removed ${item.MemberName} from advice.`);
    }
  }

  clearAll(): void {
    if (this.rows.length === 0) return;
    if (confirm(`Are you sure you want to clear all ${this.rows.length} records from this transfer advice?`)) {
      this.rows = [];
      this.filteredRows = [];
      this.clearSessionDraft();
      this.toastr.warning('Transfer advice table cleared.');
    }
  }

  private reindexRows(): void {
    for (let i = 0; i < this.rows.length; i++) {
      this.rows[i].Id = i + 1;
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Filtering, Sorting & Search
  // ---------------------------------------------------------------------------
  applyFilterAndSort(): void {
    let result = [...this.rows];
    if (this.searchText && this.searchText.trim()) {
      const q = this.searchText.trim().toLowerCase();
      result = result.filter(r =>
        (r.StaffNo && r.StaffNo.toLowerCase().includes(q)) ||
        (r.MemberNo && r.MemberNo.toLowerCase().includes(q)) ||
        (r.MemberName && r.MemberName.toLowerCase().includes(q)) ||
        (r.AccountNo && r.AccountNo.toLowerCase().includes(q)) ||
        (r.IFSCCode && r.IFSCCode.toLowerCase().includes(q)) ||
        (r.BankBranch && r.BankBranch.toLowerCase().includes(q))
      );
    }
    this.filteredRows = result;
  }

  get paginatedRows(): BankAdviceItem[] {
    if (this.pageSize >= 10000) {
      return this.filteredRows;
    }
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRows.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    if (this.pageSize >= 10000 || this.filteredRows.length === 0) return 1;
    return Math.ceil(this.filteredRows.length / this.pageSize);
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) {
      this.currentPage = p;
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Calculations & Indian Number-To-Words
  // ---------------------------------------------------------------------------
  get totalAmount(): number {
    return this.rows.reduce((sum, r) => sum + (Number(r.Amount) || 0), 0);
  }

  get invalidIfscCount(): number {
    return this.rows.filter(r => !r.IsValidIFSC).length;
  }

  get missingAccountCount(): number {
    return this.rows.filter(r => !r.HasAccountNo).length;
  }

  amountToWords(amount: number): string {
    if (!amount || isNaN(amount) || amount === 0) {
      return 'Rupees Zero Only';
    }

    const wholePart = Math.floor(amount);
    const fractionPart = Math.round((amount - wholePart) * 100);

    const words = this.convertWholeNumberToWords(wholePart);
    let result = `Rupees ${words}`;

    if (fractionPart > 0) {
      const paiseWords = this.convertWholeNumberToWords(fractionPart);
      result += ` and ${paiseWords} Paise`;
    }

    result += ' Only';
    return result;
  }

  private convertWholeNumberToWords(n: number): string {
    if (n === 0) return 'Zero';

    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const numToWordsLessThanThousand = (num: number): string => {
      let str = '';
      if (num >= 100) {
        str += units[Math.floor(num / 100)] + ' Hundred ';
        num %= 100;
      }
      if (num >= 20) {
        str += tens[Math.floor(num / 10)] + ' ';
        num %= 10;
      }
      if (num > 0) {
        str += units[num] + ' ';
      }
      return str.trim();
    };

    let words = '';
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    const remainder = n;

    if (crore > 0) {
      words += numToWordsLessThanThousand(crore) + ' Crore ';
    }
    if (lakh > 0) {
      words += numToWordsLessThanThousand(lakh) + ' Lakh ';
    }
    if (thousand > 0) {
      words += numToWordsLessThanThousand(thousand) + ' Thousand ';
    }
    if (remainder > 0) {
      words += numToWordsLessThanThousand(remainder);
    }

    return words.replace(/\s+/g, ' ').trim();
  }

  validateIFSC(ifsc: string): boolean {
    if (!ifsc) return false;
    const clean = ifsc.trim().toUpperCase();
    return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(clean);
  }

  // ---------------------------------------------------------------------------
  // 6. Session Storage Management (F5 Refresh Safety)
  // ---------------------------------------------------------------------------
  saveToSession(): void {
    try {
      if (this.rows.length === 0) {
        this.clearSessionDraft();
        return;
      }
      const draft = {
        savedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
        selectedBankId: this.selectedBankId,
        fromDate: this.fromDate,
        toDate: this.toDate,
        rows: this.rows
      };
      this.localService.saveSessionData(this.SESSION_KEY, JSON.stringify(draft));
      this.hasSessionDraft = true;
      this.sessionDraftTime = draft.savedAt;
    } catch (e) {
      console.error('Failed to save session draft', e);
    }
  }

  loadFromSession(): boolean {
    try {
      const raw = this.localService.getSessionData(this.SESSION_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && draft.rows && draft.rows.length > 0) {
          this.rows = draft.rows;
          this.selectedBankId = draft.selectedBankId || this.selectedBankId;
          this.selectedBank = this.banks.find(b => b.BankId === Number(this.selectedBankId)) || this.selectedBank;
          this.fromDate = draft.fromDate || this.fromDate;
          this.toDate = draft.toDate || this.toDate;
          this.hasSessionDraft = true;
          this.sessionDraftTime = draft.savedAt || '';
          this.applyFilterAndSort();
          return true;
        }
      }
    } catch (e) {
      console.error('Failed to parse session draft', e);
    }
    this.hasSessionDraft = false;
    this.sessionDraftTime = '';
    return false;
  }

  clearSessionDraft(): void {
    try {
      this.localService.removeSessionData(this.SESSION_KEY);
    } catch { }
    this.hasSessionDraft = false;
    this.sessionDraftTime = '';
  }

  onDiscardSessionClick(): void {
    if (this.hasSessionDraft) {
      if (confirm(`Are you sure you want to discard the temporary session draft? All ${this.rows.length} uncommitted records will be cleared.`)) {
        this.clearSessionDraft();
        this.rows = [];
        this.filteredRows = [];
        this.toastr.warning('Temporary session draft discarded.');
      }
    } else if (this.rows.length > 0) {
      this.clearAll();
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Print & PDF Generation (100% Fidelity to Image 2)
  // Dynamic Title: Bank Advice - Transfer "<BankName>"
  // ---------------------------------------------------------------------------
  printReport(): void {
    if (!this.rows || this.rows.length === 0) {
      this.toastr.warning('No advice records available to print.');
      return;
    }
    window.print();
  }

  downloadPdf(): void {
    if (!this.rows || this.rows.length === 0) {
      this.toastr.warning('No advice records to generate PDF.');
      return;
    }

    try {
      // Portrait A4: 210mm width x 297mm height
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const centerX = pageWidth / 2;

      // 1. Header (Matching Image 2)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(this.company.CompanyName, centerX, 14, { align: 'center' });
      // Underline company name
      const titleWidth = doc.getTextWidth(this.company.CompanyName);
      doc.setLineWidth(0.3);
      doc.line(centerX - titleWidth / 2, 15, centerX + titleWidth / 2, 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(this.company.CompanyNameHindi || 'बोकारो इस्पात कर्मचारी (टी०ए० / मे० / मेट०) सहकारी साख समिति लिमिटेड', centerX, 20, { align: 'center' });

      doc.setFontSize(8.5);
      const regdText = `(Regd. No.- ${this.company.RegistrationNo || 'BAGH-6/78'})   ${this.company.CompanyAddress || 'Old Admn. Bldg., Bokaro Steel City-827001'}`;
      doc.text(regdText, centerX, 24.5, { align: 'center' });

      if (this.company.MobileNo) {
        doc.text(`Contact No: ${this.company.MobileNo}`, pageWidth - 14, 29, { align: 'right' });
      }

      // 2. Title: Bank Advice - Transfer "<BankName>" (e.g. Bank Advice - Transfer "STATE BANK OF INDIA")
      const bankTitleName = this.selectedBank ? this.selectedBank.BankName : 'STATE BANK OF INDIA';
      const adviceTitle = `Bank Advice - Transfer (${bankTitleName})`;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(adviceTitle, centerX, 36, { align: 'center' });
      const adviceTitleWidth = doc.getTextWidth(adviceTitle);
      doc.line(centerX - adviceTitleWidth / 2, 37, centerX + adviceTitleWidth / 2, 37);

      // 3. Sub-header: Society A/c No and Report Date
      doc.setFontSize(10);
      const socAcc = this.selectedBank ? this.selectedBank.AccountNo : '10225181204';
      doc.text(`Society A/c No: ${socAcc}`, 14, 44);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Report Date: ${this.reportDate}`, pageWidth - 14, 44, { align: 'right' });

      // 4. Data Table (Image 2 structure)
      // Headers: # | StaffNo Name | A/c No. | IFSC | Bank | Amount
      const bodyData = this.rows.map((r, idx) => [
        (idx + 1).toString(),
        `${r.StaffNo}  ${r.MemberName}`,
        r.AccountNo || '-',
        r.IFSCCode || '-',
        r.BankBranch || r.BankName || '-',
        Number(r.Amount || 0).toFixed(2)
      ]);

      const totalStr = this.totalAmount.toFixed(2);
      const wordsStr = this.amountToWords(this.totalAmount);

      autoTable(doc, {
        startY: 47,
        head: [['#', 'StaffNo Name', 'A/c No.', 'IFSC', 'Bank', 'Amount']],
        body: bodyData,
        foot: [
          ['Total:', `${this.rows.length}`, '', '', '', totalStr],
          [{ content: `Amount in Words :  ${wordsStr}`, colSpan: 6, styles: { fontStyle: 'bold', halign: 'left' } }]
        ],
        theme: 'plain',
        headStyles: {
          fontStyle: 'bold',
          textColor: 0,
          lineWidth: { top: 0.3, bottom: 0.3 },
          lineColor: 0,
          fontSize: 8.5,
          halign: 'left',
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 55, fontStyle: 'bold' },
          2: { cellWidth: 38, fontStyle: 'bold' },
          3: { cellWidth: 30, fontStyle: 'bold' },
          4: { cellWidth: 42 },
          5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
        },
        bodyStyles: {
          textColor: 0,
          fontSize: 8.5,
          cellPadding: 2.2
        },
        footStyles: {
          textColor: 0,
          fontSize: 8.5,
          fontStyle: 'bold',
          lineWidth: { top: 0.3, bottom: 0.3 },
          lineColor: 0,
          cellPadding: 2.5
        },
        margin: { left: 14, right: 14 }
      });

      // 5. Signatures & Remarks Block (Fixed at bottom or after table)
      const finalY = (doc as any).lastAutoTable?.finalY || 200;
      let sigY = Math.max(finalY + 28, 245);

      if (sigY > 275) {
        doc.addPage();
        sigY = 60;
      }

      doc.setLineWidth(0.3);
      doc.line(14, sigY - 6, pageWidth - 14, sigY - 6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Comm. Member', 30, sigY, { align: 'center' });
      doc.text('Comm. Member', centerX, sigY, { align: 'center' });
      doc.text('Secretary/Chairman', pageWidth - 35, sigY, { align: 'center' });

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.text('Remarks (if any)', 14, sigY + 8);

      const filename = `Transfer_Advice_${bankTitleName.replace(/[^a-zA-Z0-9]/g, '_')}_${socAcc}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
      this.toastr.success('Transfer Advice PDF generated successfully.');
    } catch (e) {
      console.error('PDF error', e);
      this.toastr.error('Failed to generate PDF document.');
    }
  }

  // ---------------------------------------------------------------------------
  // 8. Excel Export (Exact Columns: Sl No, Name, Account No, Bank Name, Bank IFSC, Amount)
  // ---------------------------------------------------------------------------
  exportExcel(): void {
    if (!this.rows || this.rows.length === 0) {
      this.toastr.warning('No transfer advice records to export.');
      return;
    }

    // Exact 6 columns matching user requirement
    const excelData = this.rows.map((r, idx) => {
      const bankAndBranch = r.BankBranch || (r.BranchName ? `${r.BankName}, ${r.BranchName}` : (r.BankName || ''));
      return {
        'Sl No': String(idx + 1).padStart(3, '0'),
        'Name': r.MemberName || '',
        'Account No': r.AccountNo ? String(r.AccountNo).trim() : '',
        'Bank Name': bankAndBranch,
        'Bank IFSC': (r.IFSCCode || '').toUpperCase(),
        'Amount': Number(r.Amount || 0)
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Ensure text cell types for Sl No, Account No, and IFSC to preserve leading zeros
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:F1');
    for (let R = 1; R <= range.e.r; ++R) {
      const slCell = worksheet[XLSX.utils.encode_cell({ r: R, c: 0 })];
      if (slCell) { slCell.t = 's'; }

      const accCell = worksheet[XLSX.utils.encode_cell({ r: R, c: 2 })];
      if (accCell) { accCell.t = 's'; }

      const ifscCell = worksheet[XLSX.utils.encode_cell({ r: R, c: 4 })];
      if (ifscCell) { ifscCell.t = 's'; }
    }

    // Set practical column widths
    worksheet['!cols'] = [
      { wch: 8 },  // Sl No
      { wch: 28 }, // Name
      { wch: 22 }, // Account No
      { wch: 26 }, // Bank Name
      { wch: 16 }, // Bank IFSC
      { wch: 14 }  // Amount
    ];

    const workbook = XLSX.utils.book_new();
    const sheetName = 'Transfer_Advice';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    const bankSuffix = this.selectedBank ? this.selectedBank.BankName.replace(/[^a-zA-Z0-9]/g, '_') : 'SameBank';
    const filename = `Transfer_Advice_${bankSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, filename);
    this.toastr.success('Excel file exported successfully.');
  }

  // Helper date formatters
  private formatDateIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private formatDateDisplay(d: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const mon = months[d.getMonth()];
    const yr = d.getFullYear();
    return `${day}-${mon}-${yr}`;
  }
}
