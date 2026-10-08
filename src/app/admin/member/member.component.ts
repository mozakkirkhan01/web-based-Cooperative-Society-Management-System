import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { LoadDataService } from '../../utils/load-data.service';
import { Status, MemberType, Gender, NomineeRelation, PsuUnit } from '../../utils/enum';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
import { LocalService } from '../../utils/local.service';
import { Router } from '@angular/router';
import { DateAdapter } from '@angular/material/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
declare var $: any;

@Component({
  selector: 'app-member',
  templateUrl: './member.component.html',
  styleUrls: ['./member.component.css']
})
export class MemberComponent {
  dataLoading: boolean = false
  MemberList: any = []
  DepartmentList: any = []
  Member: any = {}
  isSubmitted = false
  StatusList = this.loadData.GetEnumList(Status);
  NomineeRelationList = this.loadData.GetEnumList(NomineeRelation);
  GenderList = this.loadData.GetEnumList(Gender);
  PsuUnitList = this.loadData.GetEnumList(PsuUnit);
  MemberTypeList = this.loadData.GetEnumList(MemberType);
  PageSize = ConstantData.PageSizes;
  p: number = 1;
  Search: string = '';
  reverse: boolean = false;
  sortKey: string = '';
  itemPerPage: number = this.PageSize[0];
  action: ActionModel = {} as ActionModel;
  staffLogin: StaffLoginModel = {} as StaffLoginModel;
  AllStatusList = Status;
  AllPsuUnit = PsuUnit;
  AllNomineeRelationList = NomineeRelation;
  AllGenderList = Gender;
  AllMemberTypeList = MemberType;
  selectedMember: any = {};
  filterStatus: number = 0;        // 0 = All
filterDepartmentId: number = 0;  // 0 = All
filterPsuUnit: number = 0;       // 0 = All
  constructor(
    private service: AppService,
    private toastr: ToastrService,
    private loadData: LoadDataService,
    private localService: LocalService,
    private router: Router,
    private dateAdapter: DateAdapter<any>
  ) { }

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.validiateMenu();
    this.getMemberList();
    this.getDepartmentList()
    this.resetForm();
  }

  validiateMenu() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ Url: this.router.url, StaffLoginId: this.staffLogin.StaffLoginId })).toString()
    }
    this.dataLoading = true
    this.service.validiateMenu(obj).subscribe((response: any) => {
      this.action = this.loadData.validiateMenu(response, this.toastr, this.router)
      this.dataLoading = false;
    }, (err => {
      this.toastr.error("Error while fetching records")
      this.dataLoading = false;
    }))
  }

  @ViewChild('formMember') formMember: NgForm;
  resetForm() {
    this.Member = {}
    if (this.formMember) {
      this.formMember.control.markAsPristine();
      this.formMember.control.markAsUntouched();
    }
    this.isSubmitted = false
    // this.Member.Status = 1
  }

  sort(key: any) {
    this.sortKey = key;
    this.reverse = !this.reverse;
  }

  onTableDataChange(p: any) {
    this.p = p
  }

  viewMember(item: any) {
    this.selectedMember = item;
  }

  getDepartmentList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    }
    this.dataLoading = true
    this.service.getDepartmentList(obj).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        this.DepartmentList = response.DepartmentList;
      } else {
        this.toastr.error(response.Message)
      }
      this.dataLoading = false
    }, (err => {
      this.toastr.error("Error while fetching records")
      this.dataLoading = false;
    }))
  }

  sameAddress: boolean = false;

  copyAddress() {
    if (this.sameAddress) {
      this.Member.PermanentAddress = this.Member.PresentAddress;
    } else {
      this.Member.PermanentAddress = '';
    }
  }

  // getMemberList() {
  //   var obj: RequestModel = {
  //     request: this.localService.encrypt(JSON.stringify({})).toString()
  //   }
  //   this.dataLoading = true
  //   this.service.getMemberList(obj).subscribe(r1 => {
  //     let response = r1 as any
  //     if (response.Message == ConstantData.SuccessMessage) {
  //       this.MemberList = response.MemberList;
  //       // console.log(this.MemberList);
  //       // console.log(this.MemberList[0].MembershipDate);
  //       // console.log(typeof this.MemberList[0].MembershipDate);
  //     } else {
  //       this.toastr.error(response.Message)
  //     }
  //     this.dataLoading = false
  //   }, (err => {
  //     this.toastr.error("Error while fetching records")
  //   }))
  // }
  onDepartmentChange(departmentId: any) {

    let department = this.DepartmentList.find(
      (x: any) => x.DepartmentId == departmentId
    );

    if (department) {
      this.Member.DeptSecCode = department.DepartmentCode;
    }
  }
  saveMember() {
    this.isSubmitted = true;
    this.formMember.control.markAllAsTouched();
    if (this.formMember.invalid) {
      this.toastr.error("Fill all the required fields !!")
      return
    }
    let saveData = { ...this.Member };
    saveData.MembershipDate =
      this.loadData.loadDateTime(saveData.MembershipDate);

    saveData.JoiningDate =
      this.loadData.loadDateTime(saveData.JoiningDate);

    saveData.RetirementDate =
      this.loadData.loadDateTime(saveData.RetirementDate);

    saveData.DateofBirth =
      this.loadData.loadDateTime(saveData.DateofBirth);

    saveData.UpdatedBy = this.staffLogin.StaffLoginId;
    saveData.CreatedBy = this.staffLogin.StaffLoginId;
    // this.Member.MembershipDate = this.loadData.loadDateTime(this.Member.MembershipDate);
    // this.Member.JoiningDate = this.loadData.loadDateTime(this.Member.JoiningDate);
    // this.Member.RetirementDate = this.loadData.loadDateTime(this.Member.RetirementDate);
    // this.Member.DateofBirth = this.loadData.loadDateTime(this.Member.DateofBirth);
    // this.Member.UpdatedBy = this.staffLogin.StaffLoginId;
    // this.Member.CreatedBy = this.staffLogin.StaffLoginId;
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(saveData)).toString()
    }
    this.service.saveMember(obj).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        if (this.Member.MemberId > 0) {
          this.toastr.success("Member detail updated successfully")
          $('#staticBackdrop').modal('hide')
        } else {
          this.toastr.success("Member added successfully")
        }
        this.resetForm()
        this.getMemberList()
      } else {
        this.toastr.error(response.Message)
      }
    }, (err => {
      this.toastr.error("Error occured while submitting data")
    }))
  }

  formatRetirementDate() {
    if (!this.Member.RetirementDate) return;
    const date = this.parseMemberDate(this.Member.RetirementDate);
    if (date) {
      this.Member.RetirementDate = date;
    }
  }
  formatMembershipDate() {
    if (!this.Member.MembershipDate) return;
    const date = this.parseMemberDate(this.Member.MembershipDate);
    if (date) {
      this.Member.MembershipDate = date;
    }
  }
  formatJoiningDate() {
    if (!this.Member.JoiningDate) return;
    const date = this.parseMemberDate(this.Member.JoiningDate);
    if (date) {
      this.Member.JoiningDate = date;
    }
  }

  formatDateofBirth() {
    if (!this.Member.DateofBirth) {
      this.Member.RetirementDate = null;
      return;
    }

    const dateOfBirth = this.parseMemberDate(this.Member.DateofBirth);
    if (!dateOfBirth) return;

    this.Member.DateofBirth = dateOfBirth;

    const birthYear = this.dateAdapter.getYear(dateOfBirth);
    const birthMonth = this.dateAdapter.getMonth(dateOfBirth);
    const birthDay = this.dateAdapter.getDate(dateOfBirth);
    const retirementYear = birthYear + 60;

    if (birthDay === 1) {
      // Employees born on the 1st of any month retire on the last day of the preceding month
      const firstDayOfBirthMonth = this.dateAdapter.createDate(retirementYear, birthMonth, 1);
      this.Member.RetirementDate = this.dateAdapter.addCalendarDays(firstDayOfBirthMonth, -1);
    } else {
      // Employees born on any other day retire on the last day of the birth month
      const firstDayOfBirthMonth = this.dateAdapter.createDate(retirementYear, birthMonth, 1);
      const daysInMonth = this.dateAdapter.getNumDaysInMonth(firstDayOfBirthMonth);
      this.Member.RetirementDate = this.dateAdapter.createDate(retirementYear, birthMonth, daysInMonth);
    }
  }

  private parseMemberDate(value: any): any | null {
    let date = this.dateAdapter.isDateInstance(value) ? value : null;
    if (!date && typeof value == 'string') {
      date = this.dateAdapter.parse(value, ['DD/MM/YYYY', 'DD-MM-YYYY', 'YYYY-MM-DD']) ||
        this.dateAdapter.deserialize(value);
    } else if (!date) {
      date = this.dateAdapter.deserialize(value);
    }
    return date && this.dateAdapter.isValid(date) ? date : null;
  }


  formatDate(date: any): string {

    if (!date) return '';

    const d = new Date(date);

    const day = ('0' + d.getDate()).slice(-2);
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  }


  downloadMemberPDF(item: any) {
    const pageWidth = 210;
    const pageHeight = 297;
    const leftX = 10;
    const rightX = 200;
    const boxWidth = 190;
    const centerX = 105;

    let y = 37.5;
    const doc = new jsPDF('p', 'mm', 'a4');

    const formatDate = (date: any) => {
      if (!date) return '';
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Safe printable borders for A4 (6mm outer, 8mm inner margin)
    const drawBorder = () => {
      doc.setDrawColor(0, 55, 150);
      doc.setLineWidth(0.7);
      doc.roundedRect(6, 6, 198, 285, 2, 2);

      doc.setLineWidth(0.3);
      doc.roundedRect(8, 8, 194, 281, 2, 2);
    };

    const drawHeader = () => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 45, 120);
      doc.setFontSize(15);
      doc.text(
        "Bokaro Steel Employees (TA/MED/MAT) Co-operative Society Ltd.",
        centerX,
        16,
        { align: "center" }
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11.5);
      doc.text(
        "Bokaro Steel City (Regd. No. : Bagh-06/78)",
        centerX,
        22,
        { align: "center" }
      );

      doc.setFillColor(36, 90, 190);
      doc.roundedRect(62, 25.5, 86, 8, 2, 2, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(255);
      doc.text(
        "MEMBERSHIP APPLICATION FORM",
        centerX,
        31,
        { align: "center" }
      );
    };

    const drawSection = (title: string, height: number) => {
      doc.setDrawColor(0, 70, 170);
      doc.roundedRect(leftX, y, boxWidth, height, 1.5, 1.5);

      doc.setFillColor(240, 244, 252);
      doc.rect(leftX + 0.5, y + 0.5, boxWidth - 1, 8.5, 'F');

      doc.setFontSize(11);
      doc.setTextColor(0, 45, 120);
      doc.setFont("helvetica", "bold");
      doc.text(title, leftX + 4, y + 6);

      doc.setDrawColor(0, 70, 170);
      doc.setLineWidth(0.3);
      doc.line(leftX, y + 9, rightX, y + 9);

      y += 12.5;
    };

    const drawRow = (
      label1: string,
      value1: any,
      label2: string,
      value2: any,
      valX1: number = 44,
      valX2: number = 136
    ) => {
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text(label1, leftX + 2, y);

      doc.setFont("helvetica", "normal");
      const v1Str = value1 != null ? value1.toString() : "";
      const maxW1 = centerX - 1 - valX1;
      let fs1 = 9.5;
      doc.setFontSize(fs1);
      if (doc.getTextWidth(v1Str) > maxW1 && maxW1 > 0) {
        fs1 = Math.max(7.5, Number(((9.5 * maxW1) / doc.getTextWidth(v1Str)).toFixed(1)));
        doc.setFontSize(fs1);
      }
      doc.text(v1Str, valX1, y, { maxWidth: maxW1 });

      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.text(label2, centerX + 3, y);

      doc.setFont("helvetica", "normal");
      const v2Str = value2 != null ? value2.toString() : "";
      const maxW2 = rightX - 2 - valX2;
      let fs2 = 9.5;
      doc.setFontSize(fs2);
      if (doc.getTextWidth(v2Str) > maxW2 && maxW2 > 0) {
        fs2 = Math.max(7.5, Number(((9.5 * maxW2) / doc.getTextWidth(v2Str)).toFixed(1)));
        doc.setFontSize(fs2);
      }
      doc.text(v2Str, valX2, y, { maxWidth: maxW2 });

      doc.setDrawColor(220);
      doc.setLineWidth(0.2);
      doc.line(leftX, y + 3, rightX, y + 3);
      doc.line(centerX, y - 3.5, centerX, y + 3);
      y += 6.8;
    };

    const drawAddressRow = (label: string, value: any) => {
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text(label, leftX + 2, y);

      doc.setFont("helvetica", "normal");
      const valStr = value != null ? value.toString() : "";
      const maxW = rightX - 2 - 48;
      let fs = 9.5;
      doc.setFontSize(fs);
      if (doc.getTextWidth(valStr) > maxW) {
        fs = Math.max(7.5, Number(((9.5 * maxW) / doc.getTextWidth(valStr)).toFixed(1)));
        doc.setFontSize(fs);
      }
      doc.text(valStr, 48, y, { maxWidth: maxW });

      doc.setDrawColor(220);
      doc.setLineWidth(0.2);
      doc.line(leftX, y + 3, rightX, y + 3);
      y += 6.8;
    };

    drawBorder();
    drawHeader();

    drawSection("MEMBER INFORMATION", 37);
    drawRow("SAIL Personal No", item.SailPersonalNo, "Staff No", item.StaffNo, 45, 126);
    drawRow("Member No", item.MemberNo, "Name", item.MemberName, 36, 122);
    drawRow("Father's Name", item.FatherName, "Member Type", this.AllMemberTypeList[item.MemberType], 38, 134);
    drawRow("Gender", this.AllGenderList[item.Gender], "Date of Birth", formatDate(item.DateofBirth), 30, 134);
    y += 2.5;

    drawSection("DEPARTMENT DETAILS", 37);
    drawRow("Department", item.DepartmentName, "Designation", item.Designation, 38, 132);
    drawRow("Dept Sec Code", item.DeptSecCode, "PS Unit", this.AllPsuUnit[item.PsuUnit], 40, 124);
    drawRow("Joining Date", formatDate(item.JoiningDate), "Retirement Date", formatDate(item.RetirementDate), 38, 136);
    drawRow("Membership Date", formatDate(item.MembershipDate), "", "", 44, 134);
    y += 2.5;

    drawSection("CONTACT DETAILS", 37);
    drawRow("Mobile", item.MobileNo, "Whatsapp", item.WhatsappNo, 28, 128);
    drawRow("Email", item.Email, "", "", 28, 134);
    drawAddressRow("Present Address", item.PresentAddress);
    drawAddressRow("Permanent Address", item.PermanentAddress);
    y += 2.5;

    drawSection("BANK DETAILS", 23.5);
    drawRow("Bank Name", item.BankName, "Account No", item.AccountNo, 36, 132);
    drawRow("IFSC", item.IFSCCode, "Branch", item.BranchName, 26, 124);
    y += 2.5;

    drawSection("NOMINEE DETAILS", 16.5);
    drawRow("Nominee", item.NomineeName, "Relation", this.AllNomineeRelationList[item.NomineeRelation], 30, 126);
    y += 2.5;

    drawSection("DOCUMENT DETAILS", 16.5);
    drawRow("Aadhar", item.AadharNo, "PAN", item.PanNo, 28, 122);
    y += 3;

    // Status and Signatures Footer Box
    const footerY = y;
    const footerHeight = 280 - footerY;
    doc.setDrawColor(0, 70, 170);
    doc.setLineWidth(0.3);
    doc.roundedRect(leftX, footerY, boxWidth, footerHeight, 1.5, 1.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 120, 0);
    doc.text("Status :", leftX + 8, footerY + 8.5);
    doc.text(item.Status == 1 ? "ACTIVE" : "INACTIVE", leftX + 32, footerY + 8.5);

    doc.setTextColor(0, 45, 120);
    doc.text("Print Date :", 115, footerY + 8.5);
    doc.setTextColor(220, 0, 0);
    doc.text(formatDate(new Date()), 148, footerY + 8.5);

    const sigLineY = footerY + 22;
    doc.setDrawColor(120);
    doc.setLineWidth(0.3);
    doc.line(20, sigLineY, 80, sigLineY);
    doc.line(130, sigLineY, 190, sigLineY);

    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Member Signature", 50, sigLineY + 5, { align: "center" });
    doc.text("Authorized Signature", 160, sigLineY + 5, { align: "center" });

    const fileName = `${item.MemberName}_${item.StaffNo}.pdf`;
    doc.save(fileName);
    window.open(doc.output('bloburl'), '_blank');
  }


  deleteMember(obj: any) {
    if (confirm("Are your sure you want to delete this recored")) {
      var request: RequestModel = {
        request: this.localService.encrypt(JSON.stringify(obj)).toString()
      }
      this.dataLoading = true
      this.service.deleteMember(request).subscribe(r1 => {
        let response = r1 as any
        if (response.Message == ConstantData.SuccessMessage) {
          this.toastr.success("Record Deleted successfully")
          this.getMemberList()
        } else {
          this.toastr.error(response.Message)
          this.dataLoading = false
        }
      }, (err => {
        this.toastr.error("Error occured while deleteing the recored")
        this.dataLoading = false
      }))
    }
  }

  editMember(obj: any) {
    this.resetForm()
    this.Member = obj

  }
filteredMemberList: any[] = [];

getMemberList() {
  var obj: RequestModel = {
    request: this.localService.encrypt(JSON.stringify({})).toString()
  }
  this.dataLoading = true
  this.service.getMemberList(obj).subscribe(r1 => {
    let response = r1 as any
    if (response.Message == ConstantData.SuccessMessage) {
      this.MemberList = response.MemberList;
      this.applyFilter();   // apply filter after loading
    } else {
      this.toastr.error(response.Message)
    }
    this.dataLoading = false
  }, (err => {
    this.toastr.error("Error while fetching records")
    this.dataLoading = false
  }))
}

applyFilter() {
  this.filteredMemberList = this.MemberList.filter((item: any) => {
    const matchStatus = this.filterStatus == 0 || item.Status == this.filterStatus;
    const matchDept = this.filterDepartmentId == 0 || item.DepartmentId == this.filterDepartmentId;
    const matchPsu = this.filterPsuUnit == 0 || item.PsuUnit == this.filterPsuUnit;
    return matchStatus && matchDept && matchPsu;
  });
  this.p = 1; // reset to first page
}

clearFilters() {
  this.filterStatus = 0;
  this.filterDepartmentId = 0;
  this.filterPsuUnit = 0;
  this.applyFilter();
}
}
