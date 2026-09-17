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
    private router: Router
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

    const [day, month, year] = this.Member.RetirementDate.split('-');

    this.Member.RetirementDate = `${year}-${month}-${day}`;
  }
  formatMembershipDate() {

    if (!this.Member.MembershipDate) return;

    const [day, month, year] = this.Member.MembershipDate.split('-');

    this.Member.MembershipDate = `${year}-${month}-${day}`;
  }
  formatJoiningDate() {

    if (!this.Member.JoiningDate) return;

    const [day, month, year] = this.Member.JoiningDate.split('-');

    this.Member.JoiningDate = `${year}-${month}-${day}`;
  }

  formatDateofBirth() {

    if (!this.Member.DateofBirth) return;

    const [day, month, year] = this.Member.DateofBirth.split('-');

    this.Member.DateofBirth = `${year}-${month}-${day}`;
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

    const margin = 8;
    const innerMargin = 10;

    let y = 38;
    const doc = new jsPDF('p', 'mm', 'a4');



    const formatDate = (date: any) => {

      if (!date) return '';

      const d = new Date(date);

      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();

      return `${day}/${month}/${year}`;
    };
    const drawBorder = () => {

      doc.setDrawColor(0, 55, 150);
      doc.setLineWidth(0.8);
      doc.roundedRect(2, 2, 206, 293, 2, 2);

      doc.setLineWidth(0.3);

      doc.roundedRect(4, 4, 202, 289, 2, 2)

    }
    const drawHeader = () => {

      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 45, 120);

      doc.setFontSize(16);

      doc.text(
        "Bokaro Steel Employees (TA/MED/MAT) Co-operative Society Ltd.",
        105,
        14,
        { align: "center" }
      );
      doc.setFont("helvetica", "normal");
      doc.setFontSize(13);

      doc.text(
        "Bokaro Steel City (Regd. No. : Bagh-06/78)",
        105,
        21,
        { align: "center" }
      );
      doc.setFillColor(36, 90, 190);
      doc.roundedRect(62, 26, 86, 9, 2, 2, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(255);

      doc.text(
        "MEMBERSHIP APPLICATION FORM  ",
        105,
        32,
        { align: "center" }
      );

      y = 42;

    }
    const drawSection = (title: string, height: number) => {

      doc.setDrawColor(0, 70, 170);

      doc.roundedRect(
        8,
        y,
        194,
        height,
        2,
        2
      );

      doc.setFillColor(240, 244, 252);

      doc.rect(
        9,
        y + 1,
        192,
        10,
        'F'
      );

      doc.setFontSize(12);

      doc.setTextColor(0, 45, 120);

      doc.setFont("helvetica", "bold");

      doc.text(title, 14, y + 7);

      doc.line(
        10,
        y + 11,
        200,
        y + 11
      );

      y += 15;

    }
    const drawRow = (

      label1: string,
      value1: any,
      label2: string,
      value2: any

    ) => {

      doc.setFontSize(10);

      doc.setFont("helvetica", "bold");

      doc.setTextColor(0);

      doc.text(label1, 12, y);

      doc.setFont("helvetica", "normal");

      doc.text(value1 ? value1.toString() : "", 65, y);

      doc.setFont("helvetica", "bold");

      doc.text(label2, 110, y);

      doc.setFont("helvetica", "normal");

      doc.text(value2 ? value2.toString() : "", 165, y);

      doc.setDrawColor(220);

      doc.line(10, y + 4, 200, y + 4);

      doc.line(105, y - 4, 105, y + 4);

      y += 8;

    }
    drawSection("MEMBER INFORMATION", 45);
    drawRow(
      "SAIL Personal No",
      item.SailPersonalNo,
      "Staff No",
      item.StaffNo
    );
    drawRow(
      "Member No",
      item.MemberNo,
      "Name",
      item.MemberName,
    );
      drawRow(
      "Father's Name",
      item.FatherName,
      "Member Type",
      this.AllMemberTypeList[item.MemberType],
    );
    drawRow(
      "Gender",
      this.AllGenderList[item.Gender],
      "Date of Birth",
      formatDate(item.DateofBirth)
    );
    
    drawSection("DEPARTMENT DETAILS", 43);

    drawRow(
      "Department",
      item.DepartmentName,
      "Designation",
      item.Designation
    );

    drawRow(
      "Dept Sec Code",
      item.DeptSecCode,
      "PS Unit",
      this.AllPsuUnit[item.PsuUnit]
    );

    drawRow(
      "Joining Date",
      formatDate(item.JoiningDate),
      "Retirement Date",
      formatDate(item.RetirementDate)
    );

    drawRow(
      "Membership Date",
      formatDate(item.MembershipDate),
      "",
      ""
    );
    drawSection("CONTACT DETAILS", 45);

    drawRow(
      "Mobile",
      item.MobileNo,
      "Whatsapp",
      item.WhatsappNo
    );

    drawRow(
      "Email",
      item.Email,
      "",
      ""
    );
    doc.setFont("helvetica", "bold");

    doc.text("Present Address", 12, y);

    doc.setFont("helvetica", "normal");

    doc.text(item.PresentAddress || '', 65, y);

    doc.line(10, y + 4, 200, y + 4);

    y += 8;
    doc.setFont("helvetica", "bold");

    doc.text("Permanent Address", 12, y);

    doc.setFont("helvetica", "normal");

    doc.text(item.PermanentAddress || '', 65, y);

    doc.line(10, y + 4, 200, y + 4);

    y += 8;
    drawSection("BANK DETAILS", 27);

    drawRow(
      "Bank Name",
      item.BankName,
      "Account No",
      item.AccountNo
    );

    drawRow(
      "IFSC",
      item.IFSCCode,
      "Branch",
      item.BranchName
    );
    drawSection("NOMINEE DETAILS", 20);

    drawRow(
      "Nominee",
      item.NomineeName,
      "Relation",
      this.AllNomineeRelationList[item.NomineeRelation]
    );
    drawSection("DOCUMENT DETAILS", 20);

    drawRow(
      "Aadhar",
      item.AadharNo,
      "PAN",
      item.PanNo
    );
    doc.roundedRect(8, 255, 194, 32, 2, 2);

    doc.setFont("helvetica", "bold");

    doc.setFontSize(16);

    doc.setTextColor(0, 120, 0);

    doc.text("Status :", 18, 266);

    doc.text(
      item.Status == 1 ? "ACTIVE" : "INACTIVE",
      48,
      266
    );

    doc.setTextColor(0, 45, 120);

    doc.text(
      "Print Date :",
      120,
      266
    );

    doc.setTextColor(220, 0, 0);

    doc.text(
      formatDate(new Date()),
      155,
      266
    );

    doc.line(20, 278, 75, 278);

    doc.line(135, 278, 190, 278);

    doc.setTextColor(0);

    doc.setFontSize(11);

    doc.text(
      "Member Signature",
      47,
      283,
      { align: "center" }
    );

    doc.text(
      "Authorized Signature",
      162,
      283,
      { align: "center" }
    );
    drawBorder();
    drawHeader();
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
