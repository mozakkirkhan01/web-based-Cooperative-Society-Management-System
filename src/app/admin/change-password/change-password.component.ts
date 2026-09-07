import { Component, ViewChild } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { NgForm } from '@angular/forms';
import { LocalService } from '../../utils/local.service';
import { RequestModel } from 'src/app/utils/interface';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css']
})
export class ChangePasswordComponent {
  dataLoading: boolean = false
  hideCurrentPassword:boolean = true;
  hideNewPassword:boolean = true;
  hideNewConfirmPassword:boolean = true;
  StaffLogin: any = {}
  userDetail: any = {};

  constructor(
    private service: AppService,
    private toastr: ToastrService,
    private localService: LocalService,
  ) { }

  ngOnInit(): void {
    this.resetForm();
    this.userDetail = this.localService.getEmployeeDetail();
  }

  @ViewChild('formStaffLogin') formStaffLogin: NgForm;

  resetForm() {
    this.StaffLogin = {}
    if (this.formStaffLogin) {
      this.formStaffLogin.control.markAsPristine();
      this.formStaffLogin.control.markAsUntouched();
    }
  }

  changePassword() {
    this.formStaffLogin.control.markAllAsTouched();
    if (this.formStaffLogin.invalid) {
      this.toastr.error("Fill all the required fields !!")
      return
    }
    if(this.StaffLogin.NewPassword != this.StaffLogin.NewConfirmPassword){
      this.toastr.error("Password Mismatched !!");
      return
    }
    this.StaffLogin.Id = this.userDetail.StaffLoginId;
    var request: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(this.StaffLogin)).toString()
    }
    this.dataLoading = true;
    this.service.changePassword(request).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
          this.toastr.success("Login Password Changes successfully");
        this.resetForm()
      } else {
        this.toastr.error(response.Message)
      }
      this.dataLoading = false;
    }, (err => {
      this.toastr.error("Error occured while submitting data")
      this.dataLoading = false;
    }))
  }
}
