import { Component, ViewChild, } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { LoadDataService } from '../../utils/load-data.service';
import { LocalService } from '../../utils/local.service';
import { Gender, StaffType, Status } from '../../utils/enum';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
import { Router } from '@angular/router';

declare var $: any

@Component({
  selector: 'app-staff',
  templateUrl: './staff.component.html',
  styleUrls: ['./staff.component.css']
})
export class StaffComponent {
  dataLoading: boolean = false
  StaffList: any = []
  Staff: any = {}
  isSubmitted = false
  DepartmentList: any = []
  DesignationList: any = []
  PageSize = ConstantData.PageSizes;
  p: number = 1;
  Search: string = '';
  reverse: boolean = false;
  sortKey: string = '';
  itemPerPage: number = this.PageSize[0];
  action: ActionModel = {} as ActionModel;
  staffLogin: StaffLoginModel = {} as StaffLoginModel;
  StatusList = this.loadDataService.GetEnumList(Status);
  GenderList = this.loadDataService.GetEnumList(Gender);
  StaffTypeList = this.loadDataService.GetEnumList(StaffType);
  AllStatusList = Status;
  AllGenderList = Gender;
  AllStaffTypeList = StaffType;

  sort(key: any) {
    this.sortKey = key;
    this.reverse = !this.reverse;
  }

  onTableDataChange(p: any) {
    this.p = p
  }

  constructor(
    private service: AppService,
    private toastr: ToastrService,
    private loadDataService: LoadDataService,
    private localService: LocalService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.validiateMenu();
    this.getStaffList();
    this.getDepartmentList();
    this.getDesignationList();
  }

  validiateMenu() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ Url: this.router.url,StaffLoginId:this.staffLogin.StaffLoginId })).toString()
    }
    this.dataLoading = true
    this.service.validiateMenu(obj).subscribe((response: any) => {
      this.action = this.loadDataService.validiateMenu(response, this.toastr, this.router)
      this.dataLoading = false;
    }, (err => {
      this.toastr.error("Error while fetching records")
      this.dataLoading = false;
    }))
  }

  @ViewChild('formStaff') formStaff: NgForm;
  resetForm() {
    this.Staff = {};
    this.Staff.JoinDate = new Date();
    this.Staff.Status = 1
    if (this.formStaff) {
      this.formStaff.control.markAsPristine();
      this.formStaff.control.markAsUntouched();
    }
    this.isSubmitted = false
  }

  getDesignationList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ })).toString()
    }
    this.dataLoading = true
    this.service.getDesignationList(obj).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        this.DesignationList = response.DesignationList;
      } else {
        this.toastr.error(response.Message)
      }
      this.dataLoading = false;
    }, (err => {
      this.toastr.error("Error while fetching records")
      this.dataLoading = false;
    }))
  }

  getDepartmentList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ })).toString()
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

  getStaffList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ })).toString()
    }
    this.dataLoading = true
    this.service.getStaffList(obj).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        this.StaffList = response.StaffList;
      } else {
        this.toastr.error(response.Message)
      }
      this.dataLoading = false
    }, (err => {
      this.toastr.error("Error while fetching records")
      this.dataLoading = false;
    }))
  }

  saveStaff() {
    this.isSubmitted = true;
    this.formStaff.control.markAllAsTouched();
    if (this.formStaff.invalid) {
      this.toastr.error("Fill all the required fields !!")
      return
    }

    this.Staff.JoinDate = this.loadDataService.loadDateTime(this.Staff.JoinDate);
    this.Staff.DOB = this.loadDataService.loadDateTime(this.Staff.DOB);
    this.Staff.UpdatedBy = this.staffLogin.StaffLoginId;
    this.Staff.CreatedBy = this.staffLogin.StaffLoginId;
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(this.Staff)).toString()
    }
    this.dataLoading = true;
    this.service.saveStaff(obj).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        if (this.Staff.StaffId > 0) {
          this.toastr.success("Staff detail updated successfully")

        } else {
          this.toastr.success("Staff added successfully")
        }
        $('#staticBackdrop').modal('hide')
        this.resetForm()
        this.getStaffList()
      } else {
        this.toastr.error(response.Message)
        this.dataLoading = false;
        this.Staff.JoinDate = new Date(this.Staff.JoinDate);
        if (this.Staff.DOB)
          this.Staff.DOB = new Date(this.Staff.DOB);
      }
    }, (err => {
      this.toastr.error("Error occured while submitting data")
      this.dataLoading = false;
    }))
  }

  deleteStaff(obj: any) {
    if (confirm("Are your sure you want to delete this recored")) {
      var request: RequestModel = {
        request: this.localService.encrypt(JSON.stringify(obj)).toString()
      }
      this.dataLoading = true;
      this.service.deleteStaff(request).subscribe(r1 => {
        let response = r1 as any
        if (response.Message == ConstantData.SuccessMessage) {
          this.toastr.success("Record Deleted successfully")
          this.getStaffList()
        } else {
          this.toastr.error(response.Message)
        }
        this.dataLoading = false;
      }, (err => {
        this.toastr.error("Error occured while deleteing the recored")
        this.dataLoading = false;
      }))
    }
  }

  editStaff(obj: any) {
    this.resetForm()
    this.Staff = obj;
    this.Staff.JoinDate = new Date(obj.JoinDate);
    if (this.Staff.DOB)
      this.Staff.DOB = new Date(obj.DOB);
  }
}
