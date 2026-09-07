
import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { LocalService } from '../../utils/local.service';
import { Status } from '../../utils/enum';
import { LoadDataService } from '../../utils/load-data.service';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
import { Router } from '@angular/router';
declare var $: any;

@Component({
  selector: 'app-staff-login',
  templateUrl: './staff-login.component.html',
  styleUrls: ['./staff-login.component.css']
})
export class StaffLoginComponent {

  dataLoading: boolean = false
  StaffLoginList: any = []
  StaffLogin: any = {}
  isSubmitted = false
  StaffList: any[] = []
  filterStaff: any[] = []
  hide = true
  PageSize = ConstantData.PageSizes;
  p: number = 1;
  Search: string = '';
  reverse: boolean = false;
  sortKey: string = '';
  itemPerPage: number = this.PageSize[0];
  StatusList = this.loadData.GetEnumList(Status);
  AllStatusList = Status;
  StaffLoginRoleList: any[] = [];
  action: ActionModel = {} as ActionModel;
  staffLogin: StaffLoginModel = {} as StaffLoginModel;

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
    private localService: LocalService,
    private loadData: LoadDataService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.validiateMenu();
    this.getStaffLoginList();
    this.getStaffList();
    this.getRoleList();
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

  @ViewChild('formStaffLogin') formStaffLogin: NgForm;
  resetForm() {
    this.StaffLogin = {};
    this.StaffLogin.Status = 1
    if (this.formStaffLogin) {
      this.formStaffLogin.control.markAsPristine();
      this.formStaffLogin.control.markAsUntouched();
    }
    this.isSubmitted = false
  }

  newStaffLogin() {
    this.resetForm();
    this.StaffLoginRoleList.forEach(e1 => {
      e1.IsSelected = false;
      e1.StaffLoginRoleId = null;
    });
    $('#staticBackdrop').modal('show');
  }

  // editStaffLogin(obj: any) {
  //   this.resetForm()
  //   this.StaffLogin = obj;
  //   this.StaffLoginRoleList.forEach(e1 => {
  //     var staffloginRole: any = obj.StaffLoginRoleList.filter((x1: any) => x1.RoleId == e1.RoleId);
  //     if (staffloginRole.length > 0) {
  //       e1.IsSelected = true;
  //       e1.StaffLoginRoleId = staffloginRole[0].StaffLoginRoleId;
  //     }
  //     else {
  //       e1.IsSelected = false;
  //       e1.StaffLoginRoleId = null;
  //     }
  //   });
  //   $('#staticBackdrop').modal('show');
  // }

  editStaffLogin(obj: any) {
    this.resetForm();
    this.StaffLogin = obj;
    this.StaffLoginRoleList.forEach(e1 => {
      var staffloginRole: any = obj.StaffLoginRoleList.filter((x1: any) => x1.RoleId == e1.RoleId);
      if (staffloginRole.length > 0) {
        e1.IsSelected = true;
        e1.StaffLoginRoleId = staffloginRole[0].StaffLoginRoleId ?? 0; // Ensure it is not null
      } else {
        e1.IsSelected = false;
        e1.StaffLoginRoleId = 0; // Assign 0 instead of null
      }
    });
    $('#staticBackdrop').modal('show');
}



  selectAllSection(_class: any) {
    _class.SectionList.forEach((e1: any) => {
      if (_class.IsSelectAll) {
        e1.IsSelected = true;
      }
      else {
        e1.IsSelected = false;
      }
    });
  }



  filterStaffList(value: any) {
    if (value) {
      const filterValue = value.toLowerCase();
      this.filterStaff = this.StaffList.filter((option: any) => option.StaffName.toLowerCase().includes(filterValue));
    } else {
      this.filterStaff = this.StaffList;
    }
  }

  getRoleList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    }
    this.dataLoading = true
    this.service.getRoleList(obj).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        this.StaffLoginRoleList = response.RoleList;
      } else {
        this.toastr.error(response.Message)
      }
      this.dataLoading = false;
    }, (err => {
      this.toastr.error("Error while fetching records")
      this.dataLoading = false;
    }))
  }

  getStaffList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
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

  getStaffLoginList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    }
    this.dataLoading = true
    this.service.getStaffLoginList(obj).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        this.StaffLoginList = response.StaffLoginList;
      } else {
        this.toastr.error(response.Message)
      }
      this.dataLoading = false
    }, (err => {
      this.toastr.error("Error while fetching records")
      this.dataLoading = false;
    }))
  }

  saveStaffLogin() {
    this.isSubmitted = true;
    this.formStaffLogin.control.markAllAsTouched();
    
    if (this.formStaffLogin.invalid) {
      this.toastr.error("Fill all the required fields !!");
      return;
    }

    var staffClassList: any[] = [];

    // Ensure StaffLoginRoleId is set properly
    this.StaffLoginRoleList.forEach(role => {
      if (role.IsSelected && role.StaffLoginRoleId == null) {
        role.StaffLoginRoleId = 0;  // Assign default value
      }
    });

    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({
        StaffLogin: this.StaffLogin,
        StaffLoginRoleList: this.StaffLoginRoleList.filter((x1: any) => x1.IsSelected),
        StaffClassList: staffClassList,
        StaffLoginId: this.staffLogin.StaffLoginId // Fixed from `this.staffLogin.StaffLoginId`
      })).toString()
    }

    console.log("Sending Data:", JSON.parse(this.localService.decrypt(obj.request))); // Debug log

    this.dataLoading = true;
    this.service.saveStaffLogin(obj).subscribe(r1 => {
      let response = r1 as any;
      if (response.Message == ConstantData.SuccessMessage) {
        if (this.StaffLogin.StaffLoginId > 0) {
          this.toastr.success("Staff Login Updated successfully");
        } else {
          this.toastr.success("Staff Login added successfully");
        }
        $('#staticBackdrop').modal('hide');
        this.resetForm();
        this.getStaffLoginList();
      } else {
        this.toastr.error(response.Message);
        this.dataLoading = false;
      }
    }, (err => {
      this.toastr.error("Error occurred while submitting data");
      this.dataLoading = false;
    }));
}


  // saveStaffLogin() {
  //   this.isSubmitted = true;
  //   this.formStaffLogin.control.markAllAsTouched();
  //   if (this.formStaffLogin.invalid) {
  //     this.toastr.error("Fill all the required fields !!")
  //     return
  //   }

  //   var staffClassList: any[] = [];

  //   var obj: RequestModel = {
  //     request: this.localService.encrypt(JSON.stringify({
  //       StaffLogin: this.StaffLogin,
  //       StaffLoginRoleList: this.StaffLoginRoleList.filter((x1: any) => x1.IsSelected),
  //       StaffClassList: staffClassList,
  //       StaffLoginId: this.staffLogin.StaffLoginId
  //     })).toString()
  //   }
  //   this.dataLoading = true;
  //   this.service.saveStaffLogin(obj).subscribe(r1 => {
  //     let response = r1 as any
  //     if (response.Message == ConstantData.SuccessMessage) {
  //       if (this.StaffLogin.StaffLoginId > 0) {
  //         this.toastr.success("Staff Login Updated successfully")
  //       } else {
  //         this.toastr.success("Staff Login added successfully")
  //       }
  //       $('#staticBackdrop').modal('hide')
  //       this.resetForm()
  //       this.getStaffLoginList()
  //     } else {
  //       this.toastr.error(response.Message)
  //       this.dataLoading = false;
  //     }
  //   }, (err => {
  //     this.toastr.error("Error occured while submitting data")
  //     this.dataLoading = false;
  //   }))
  // }

  deleteStaffLogin(obj: any) {
    if (confirm("Are your sure you want to delete this recored")) {
      var request: RequestModel = {
        request: this.localService.encrypt(JSON.stringify(obj)).toString()
      }
      this.dataLoading = true;
      this.service.deleteStaffLogin(request).subscribe(r1 => {
        let response = r1 as any
        if (response.Message == ConstantData.SuccessMessage) {
          this.toastr.success("Record Deleted successfully")
          this.getStaffLoginList()
        } else {
          this.toastr.error(response.Message)
          this.dataLoading = false;
        }
      }, (err => {
        this.toastr.error("Error occured while deleteing the recored")
        this.dataLoading = false;
      }))
    }
  }


}
