
import { Component,ViewChild } from '@angular/core';
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
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})

export class MenuComponent {
  dataLoading: boolean = false
  MenuList: any = []
  Menu: any = {}
  isSubmitted = false
  StatusList = this.loadData.GetEnumList(Status);
  filterPage: any[] = []
  PageList: any[] = []
  ParentMenuId: any = null;
  action: ActionModel = {} as ActionModel;
  staffLogin: StaffLoginModel = {} as StaffLoginModel;
  Search:any=null;


  constructor(
    private service: AppService,
    private toastr: ToastrService,
    private localService: LocalService,
    private loadData:LoadDataService,
    private router: Router
  ) {

  }

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.validiateMenu();
    this.getMenuList();
    this.getPageList();
  }

  validiateMenu() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ Url: this.router.url,StaffLoginId:this.staffLogin.StaffLoginId })).toString()
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
  
  @ViewChild('formMenu') formMenu: NgForm;
  resetForm() {
    this.Menu = {};
    if (this.formMenu) {
      this.formMenu.control.markAsPristine();
      this.formMenu.control.markAsUntouched();
    }
    this.isSubmitted = false
    this.Menu.Status = 1
  }


  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.MenuList.filter = filterValue.trim().toLowerCase();
  }

  filterPageList(value: any) {
    if (value) {
      const filterValue = value.toLowerCase();
      this.filterPage = this.PageList.filter((option: any) => option.PageName.toLowerCase().includes(filterValue));
    } else {
      this.filterPage = this.PageList;
    }
  }


  getPageList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ })).toString()
    }
    this.dataLoading = true
    this.service.getPageList(obj).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        this.PageList = response.PageList;
        this.filterPage = this.PageList;
      } else {
        this.toastr.error(response.Message)
      }
      this.dataLoading = false
    }, (err => {
      this.toastr.error("Error while fetching records")
      this.dataLoading = false;
    }))
  }

  getMenuList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ })).toString()
    }
    this.dataLoading = true
    this.service.getMenuList(obj).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        this.MenuList = response.MenuList;
      } else {
        this.toastr.error(response.Message)
      }
      this.dataLoading = false
    }, (err => {
      this.toastr.error("Error while fetching records")
      this.dataLoading = false;
    }))
  }

  saveMenu() {
    this.formMenu.control.markAllAsTouched()
    this.isSubmitted = true
    if (this.formMenu.invalid) {
      this.toastr.error("Fill all the required fields !!")
      return
    }

    this.Menu.UpdatedBy = this.staffLogin.StaffLoginId
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(this.Menu)).toString()
    }
    this.dataLoading = true;
    this.service.saveMenu(obj).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        if (this.Menu.MenuId > 0) {
          this.toastr.success("Menu detail updated successfully");
          this.resetForm()
        } else {
          this.toastr.success("Menu added successfully");
          this.Menu.PageName = null;
          this.Menu.MenuTitle = null;
          this.formMenu.control.markAsPristine();
          this.formMenu.control.markAsUntouched();
        }
        $('#staticBackdrop').modal('hide')
        this.getMenuList()
      } else {
        this.toastr.error(response.Message)
        this.dataLoading = false;
      }
    }, (err => {
      this.toastr.error("Error occured while submitting data")
      this.dataLoading = false;
    }))
  }

  deleteMenu(obj: any) {
    if (confirm("Are your sure you want to delete this recored")) {
      var request: RequestModel = {
        request: this.localService.encrypt(JSON.stringify(obj)).toString()
      }
      this.dataLoading = true;
      this.service.deleteMenu(request).subscribe(r1 => {
        let response = r1 as any
        if (response.Message == ConstantData.SuccessMessage) {
          this.toastr.success("Record Deleted successfully")
          this.getMenuList()
        } else {
          this.toastr.error(response.Message)
          this.dataLoading = false;
        }
      }, (err => {
        this.toastr.error("Error occured while deleteing the record")
        this.dataLoading = false;
      }))
    }
  }

  menuDown(obj: any) {
    var data: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(obj)).toString()
    }
    this.dataLoading = true;
    this.service.menuDown(data).subscribe(r1 => {
        let response = r1 as any
        if (response.Message == ConstantData.SuccessMessage) {
          this.toastr.success("Success")
          this.getMenuList()
        } else {
          this.toastr.error(response.Message)
          this.dataLoading = false;
        }
      }, (err => {
        this.toastr.error("Error occured while deleteing the record")
        this.dataLoading = false;
      }))
  }
  

  menuUp(obj: any) {
    var data: RequestModel = {
      request: this.localService.encrypt(JSON.stringify(obj)).toString()
    }
    this.dataLoading = true;
    this.service.menuUp(data).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        this.toastr.success("Success")
        this.getMenuList()
      } else {
        this.toastr.error(response.Message)
        this.dataLoading = false;
      }
    }, (err => {
      this.toastr.error("Error occured while deleteing the record")
      this.dataLoading = false;
    }))
}

  editMenu(obj: any) {
    this.resetForm()
    this.Menu = obj
  }

}
