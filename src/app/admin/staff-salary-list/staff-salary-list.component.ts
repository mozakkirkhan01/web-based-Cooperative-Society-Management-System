import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { LoadDataService } from '../../utils/load-data.service';
import { LocalService } from '../../utils/local.service';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

declare var $: any;

@Component({
  selector: 'app-staff-salary-list',
  templateUrl: './staff-salary-list.component.html',
  styleUrls: ['./staff-salary-list.component.css']
})
export class StaffSalaryListComponent implements OnInit {
  dataLoading: boolean = false;
  action: ActionModel = {} as ActionModel;
  staffLogin: StaffLoginModel = {} as StaffLoginModel;

  // Filter params
  fromDate: string = '';
  toDate: string = '';
  salaryMonth: string = '';
  selectedMemberId: any = null;
  searchText: string = '';

  // Data lists
  StaffList: any[] = [];
  salaryRecords: any[] = [];
  filteredRecords: any[] = [];

  // Summary Metrics
  totalProcessed: number = 0;
  totalDisbursed: number = 0;
  averageSalary: number = 0;

  // Selected item for modal & payslip
  selectedSalary: any = null;

  constructor(
    private service: AppService,
    private toastr: ToastrService,
    private loadDataService: LoadDataService,
    private localService: LocalService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.validiateMenu();
    this.initDefaultDates();
    this.getInitData();
    this.fetchSalaryList();
  }

  initDefaultDates() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    this.fromDate = firstDay.toISOString().substring(0, 10);
    this.toDate = today.toISOString().substring(0, 10);
  }

  validiateMenu() {
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ Url: this.router.url, StaffLoginId: this.staffLogin.StaffLoginId })).toString()
    };
    this.dataLoading = true;
    this.service.validiateMenu(obj).subscribe((response: any) => {
      this.action = this.loadDataService.validiateMenu(response, this.toastr, this.router);
      this.dataLoading = false;
    }, (err: any) => {
      this.dataLoading = false;
      this.toastr.error('Permission check failed');
    });
  }

  getInitData() {
    const payload = {
      StaffLoginId: this.staffLogin.StaffLoginId
    };
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };
    this.service.getStaffSalaryInit(obj).subscribe((res: any) => {
      if (res && res.Message === ConstantData.SuccessMessage) {
        this.StaffList = res.StaffList || [];
      }
    });
  }

  fetchSalaryList() {
    this.dataLoading = true;
    const filterPayload: any = {
      StaffLoginId: this.staffLogin.StaffLoginId
    };
    if (this.fromDate) filterPayload.FromDate = this.fromDate;
    if (this.toDate) filterPayload.ToDate = this.toDate;
    if (this.salaryMonth) filterPayload.SalaryMonth = this.salaryMonth;
    if (this.selectedMemberId) filterPayload.MemberId = Number(this.selectedMemberId);

    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(filterPayload)).toString()
    };

    this.service.getStaffSalaryList(obj).subscribe((res: any) => {
      this.dataLoading = false;
      if (res && res.Message === ConstantData.SuccessMessage) {
        this.salaryRecords = res.SalaryList || [];
        this.applyFilter();
      } else {
        this.salaryRecords = [];
        this.filteredRecords = [];
        this.computeSummary();
      }
    }, (err: any) => {
      this.dataLoading = false;
      this.toastr.error(err?.error?.Message || 'Failed to load salary list');
    });
  }

  applyFilter() {
    if (!this.searchText || !this.searchText.trim()) {
      this.filteredRecords = [...this.salaryRecords];
    } else {
      const q = this.searchText.trim().toLowerCase();
      this.filteredRecords = this.salaryRecords.filter(item =>
        (item.StaffNoFormatted && item.StaffNoFormatted.toLowerCase().includes(q)) ||
        (item.MemberName && item.MemberName.toLowerCase().includes(q)) ||
        (item.Designation && item.Designation.toLowerCase().includes(q)) ||
        (item.ChequeNo && item.ChequeNo.toLowerCase().includes(q)) ||
        (item.BankName && item.BankName.toLowerCase().includes(q))
      );
    }
    this.computeSummary();
  }

  computeSummary() {
    this.totalProcessed = this.filteredRecords.length;
    this.totalDisbursed = this.filteredRecords.reduce((sum, item) => sum + (Number(item.NetPayment) || 0), 0);
    this.averageSalary = this.totalProcessed > 0 ? this.totalDisbursed / this.totalProcessed : 0;
  }

  resetFilters() {
    this.initDefaultDates();
    this.salaryMonth = '';
    this.selectedMemberId = null;
    this.searchText = '';
    this.fetchSalaryList();
  }

  // View Details Modal
  viewDetails(item: any) {
    this.selectedSalary = item;
    $('#modalSalaryDetails').modal('show');
  }

  closeModal() {
    $('#modalSalaryDetails').modal('hide');
  }

  // Print single payslip directly
  printPayslip(item: any) {
    this.selectedSalary = item;
    // Dismiss modal and backdrops before printing so it never overlays on the paper sheet
    $('#modalSalaryDetails').modal('hide');
    $('.modal-backdrop').remove();
    $('body').removeClass('modal-open').css('overflow', '');
    setTimeout(() => {
      window.print();
    }, 300);
  }

  // Helper formatting method for numbers
  num(val: any): string {
    const n = Number(val) || 0;
    return n.toFixed(2);
  }

  // Format Bank Name to wrap nicely if long
  getBankNameParts(bankName: string): { isLong: boolean, line1: string, line2: string } {
    if (!bankName) return { isLong: false, line1: 'N/A', line2: '' };
    const name = bankName.trim();
    if (name.length <= 16) {
      return { isLong: false, line1: name, line2: '' };
    }
    if (name.length <= 30) {
      return { isLong: true, line1: name, line2: '' };
    }
    const words = name.split(' ');
    let line1 = '';
    let line2 = '';
    for (const w of words) {
      if ((line1 + ' ' + w).trim().length <= 28) {
        line1 = (line1 + ' ' + w).trim();
      } else {
        line2 = (line2 + ' ' + w).trim();
      }
    }
    if (!line1) {
      line1 = name.substring(0, 28);
      line2 = name.substring(28);
    }
    return { isLong: true, line1, line2 };
  }

  // Download official payslip matching the modern design
  downloadPayslip(item: any) {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pmt = item.Payments || {};
      const ded = item.Deductions || {};

      // 1. Header Section (Kept identical as requested)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Bokaro Steel Employees (TA/Med./Mat.) Co-op. Cr. Soc. Ltd.', 105, 18, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('(Regd. No.- BAGH-6/78)   Old Admn. Bldg., Bokaro Steel City-827001', 105, 24, { align: 'center' });

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('Staff Payslip', 105, 32, { align: 'center' });
      doc.setLineWidth(0.4);
      doc.line(88, 33.5, 122, 33.5);

      // 2. Staff Info Box (Kept identical as requested)
      const boxX = 20;
      const boxY = 38;
      const boxW = 170;
      const boxH = 17;
      doc.setLineWidth(0.3);
      doc.rect(boxX, boxY, boxW, boxH);

      doc.setFontSize(9.5);
      // Row 1: Staff No. & Name
      doc.setFont('helvetica', 'bold');
      doc.text('Staff No.:', boxX + 4, boxY + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(String(item.StaffNoFormatted || item.StaffNo || ''), boxX + 24, boxY + 6);

      doc.setFont('helvetica', 'bold');
      doc.text('Name:', boxX + 65, boxY + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(String(item.MemberName || '').toUpperCase(), boxX + 80, boxY + 6);

      // Row 2: Salary Dt. & Desig.
      doc.setFont('helvetica', 'bold');
      doc.text('Salary Dt.:', boxX + 4, boxY + 13);
      doc.setFont('helvetica', 'normal');
      doc.text(String(item.SalaryDateDisplay || item.SalaryDate || ''), boxX + 24, boxY + 13);

      doc.setFont('helvetica', 'bold');
      doc.text('Desig.:', boxX + 65, boxY + 13);
      doc.setFont('helvetica', 'normal');
      doc.text(String(item.Designation || '').toUpperCase(), boxX + 80, boxY + 13);

      // 3. Modern Two-Column Earnings & Deductions Table
      autoTable(doc, {
        startY: 58,
        theme: 'plain',
        head: [
          [
            { content: 'EARNINGS / PAYMENTS', colSpan: 2, styles: { halign: 'left', fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [0, 0, 0] } },
            { content: 'DEDUCTIONS & RECOVERIES', colSpan: 2, styles: { halign: 'left', fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [0, 0, 0] } }
          ],
          [
            { content: 'Particulars', styles: { halign: 'left', fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] } },
            { content: 'Amount (Rs)', styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] } },
            { content: 'Particulars', styles: { halign: 'left', fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] } },
            { content: 'Amount (Rs)', styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] } }
          ]
        ],
        body: [
          ['Basic Pay', this.num(pmt.BasicPay), 'CPF Staff Contribution', this.num(ded.CPFStaffCont)],
          ['Fixed D.A.', this.num(pmt.FixedDA), 'Medical Fund (Staff Cont.)', this.num(ded.MedicalCont)],
          ['Variable D.A.', this.num(pmt.VariableDA), 'Staff Loan Principal Recovery', this.num(ded.StaffLoanPrincipal)],
          ['House Rent Allowance (HRA)', this.num(pmt.HouseRent), 'Staff Loan Interest', this.num(ded.StaffLoanInterest)],
          ['Conveyance Allowance', this.num(pmt.Conveyance), 'Quarter / House Rent Recovery', this.num(ded.HouseRentDeduction)],
          ['Medical Allowance', this.num(pmt.Medical), 'Salary Advance Recovery', this.num(ded.SalaryAdvanceRecovery)],
          ['Other Payments', this.num(pmt.OtherPayments), 'Festival Advance Recovery', this.num(ded.FestivalAdvanceRecovery)],
          ['', '', 'Variable D.A. Recovery', this.num(ded.VDARecovery)],
          ['', '', 'Income Tax (TDS)', this.num(ded.IncomeTaxStaff)]
        ],
        foot: [
          [
            { content: 'Total Earnings (Gross)', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
            { content: 'Rs ' + this.num(item.TotalPayments), styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252] } },
            { content: 'Total Deductions', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
            { content: 'Rs ' + this.num(item.TotalDeductions), styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252] } }
          ]
        ],
        styles: {
          font: 'helvetica',
          fontSize: 8.5,
          cellPadding: 2,
          lineColor: [0, 0, 0],
          lineWidth: 0.2
        },
        columnStyles: {
          0: { cellWidth: 55 },
          1: { cellWidth: 30, halign: 'right' },
          2: { cellWidth: 55 },
          3: { cellWidth: 30, halign: 'right' }
        },
        tableLineColor: [0, 0, 0],
        tableLineWidth: 0.3,
        margin: { left: boxX }
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 135;

      // 4. Bottom 3-Card Summary Strip
      const cardY = finalY + 4;
      const cardW = 54;
      const cardH = 34;

      // Card 1: Leaves
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      doc.rect(boxX, cardY, cardW, cardH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('LEAVES USED (MONTH)', boxX + 4, cardY + 5);
      doc.line(boxX, cardY + 6.5, boxX + cardW, cardY + 6.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Earned Leave (EL):', boxX + 4, cardY + 12);
      doc.text(String(item.MonthEL || 0), boxX + cardW - 4, cardY + 12, { align: 'right' });
      doc.text('Casual Leave (CL):', boxX + 4, cardY + 18);
      doc.text(String(item.MonthCL || 0), boxX + cardW - 4, cardY + 18, { align: 'right' });
      doc.text('Half Pay Leave (HPL):', boxX + 4, cardY + 24);
      doc.text(String(item.MonthHPL || 0), boxX + cardW - 4, cardY + 24, { align: 'right' });

      // Card 2: Balances & Dues
      const card2X = boxX + cardW + 4;
      doc.rect(card2X, cardY, cardW, cardH);
      doc.setFont('helvetica', 'bold');
      doc.text('BALANCES & DUES', card2X + 4, cardY + 5);
      doc.line(card2X, cardY + 6.5, card2X + cardW, cardY + 6.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Staff Loan Bal:', card2X + 4, cardY + 11);
      doc.text('Rs ' + this.num(item.LoanBalance), card2X + cardW - 4, cardY + 11, { align: 'right' });
      doc.text('Festival Adv Bal:', card2X + 4, cardY + 17);
      doc.text('Rs ' + this.num(item.FestBalance), card2X + cardW - 4, cardY + 17, { align: 'right' });
      doc.text('Previous Dues:', card2X + 4, cardY + 23);
      doc.text('Rs ' + this.num(item.PrevDues), card2X + cardW - 4, cardY + 23, { align: 'right' });
      doc.text('Next Dues:', card2X + 4, cardY + 29);
      doc.text('Rs ' + this.num(item.NextDues), card2X + cardW - 4, cardY + 29, { align: 'right' });

      // Card 3: Net Salary & Settlement
      const card3X = card2X + cardW + 4;
      doc.rect(card3X, cardY, cardW, cardH);
      doc.setFont('helvetica', 'bold');
      doc.text('NET SALARY & SETTLEMENT', card3X + 4, cardY + 5);
      doc.line(card3X, cardY + 6.5, card3X + cardW, cardY + 6.5);

      // Net salary box inside Card 3
      doc.setFillColor(241, 245, 249);
      doc.rect(card3X + 3, cardY + 8, cardW - 6, 11, 'FD');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('NET SALARY PAYABLE', card3X + cardW / 2, cardY + 12, { align: 'center' });
      doc.setFontSize(10);
      doc.text('Rs ' + this.num(item.NetPayment), card3X + cardW / 2, cardY + 17, { align: 'center' });

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Paid By: ' + (item.PaymentModeText || (item.PaymentMode == 1 ? 'CHEQUE' : 'CASH')), card3X + 4, cardY + 22.5);
      if (item.ChequeNo) {
        doc.text('Cheque No: ' + item.ChequeNo, card3X + 4, cardY + 26);
      }
      if (item.BankName) {
        const splitBank = doc.splitTextToSize('Bank: ' + item.BankName, cardW - 8);
        doc.text(splitBank, card3X + 4, cardY + 29.5);
      }

      // 5. Official Signatures
      const sigY = cardY + cardH + 20;
      doc.setLineWidth(0.3);
      doc.line(boxX + 5, sigY, boxX + 45, sigY);
      doc.text('Employee Signature', boxX + 25, sigY + 4, { align: 'center' });

      doc.line(boxX + 65, sigY, boxX + 105, sigY);
      doc.text('Prepared By / Accountant', boxX + 85, sigY + 4, { align: 'center' });

      doc.line(boxX + 125, sigY, boxX + 165, sigY);
      doc.text('Secretary / Chairman', boxX + 145, sigY + 4, { align: 'center' });

      // Save PDF
      const staffNo = item.StaffNoFormatted || item.StaffNo || 'Staff';
      const salDate = item.SalaryMonth || item.SalaryDate || 'Month';
      doc.save(`Payslip_${staffNo}_${salDate}.pdf`);
      this.toastr.success('Payslip downloaded successfully');
    } catch (err: any) {
      console.error(err);
      this.toastr.error('Error generating payslip PDF');
    }
  }
}
