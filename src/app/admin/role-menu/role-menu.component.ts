import { Component, ViewChild } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { LocalService } from '../../utils/local.service';
import { Status } from '../../utils/enum';
import { LoadDataService } from '../../utils/load-data.service';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
declare var $: any;

@Component({
  selector: 'app-role-menu',
  templateUrl: './role-menu.component.html',
  styleUrls: ['./role-menu.component.css']
})

export class RoleMenuComponent {

  dataLoading: boolean = false
  RoleMenu: any = {}
  isSubmitted = false
  PageSizes = ConstantData.PageSizes;
  RoleList: any[] = []
  AllRoleMenuList: any[] = []
  filterRole: any[] = []
  action: ActionModel = {} as ActionModel;
  staffLogin: StaffLoginModel = {} as StaffLoginModel;
  Search: any = null;
  StatusList = this.loadData.GetEnumList(Status);

  constructor(
    private service: AppService,
    private toastr: ToastrService,
    private localService: LocalService,
    private loadData: LoadDataService,
    private route: ActivatedRoute,
    private router: Router
  ) { }


  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.validiateMenu();
    this.getRoleList();
    this.route.paramMap.subscribe((params1: any) => {
      var id = params1.get('id');
      if (id) {
        this.RoleMenu.RoleId = id;
        this.getRoleMenuList({ id: id });
      }
    });
    // this.activatedRoute.queryParams.subscribe((x1) => {
    //   if (x1['id']) {
    //     this.RoleMenu.RoleId = x1['id'];
    //     this.getRoleMenuList(x1);
    //     //this.RoleMenu.RoleTitle =this.RoleList.filter(x=>x.RoleId == this.RoleMenu.RoleId)[0];
    //   }
    // })
  }

  validiateMenu() {
    var urls = this.router.url.split("/");
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ Url: `/${urls[1]}` + `/${urls[2]}`, StaffLoginId: this.staffLogin.StaffLoginId })).toString()
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


  @ViewChild('formRoleMenu') formRoleMenu: NgForm;
  resetForm() {
    this.RoleMenu = {};
    this.AllRoleMenuList = [];
    if (this.formRoleMenu) {
      this.formRoleMenu.control.markAsPristine();
      this.formRoleMenu.control.markAsUntouched();
    }
    this.isSubmitted = false;
    this.filterRoleList(null);
  }


  filterRoleList(value: any) {
    if (value) {
      const filterValue = value.toLowerCase();
      this.filterRole = this.RoleList.filter((option: any) => option.RoleTitle.toLowerCase().includes(filterValue));
    } else {
      this.filterRole = this.RoleList;
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
        this.RoleList = response.RoleList;
        this.filterRoleList(null);
        if (this.RoleMenu.RoleId)
          this.RoleMenu.RoleTitle = this.RoleList.filter(x => x.RoleId == this.RoleMenu.RoleId)[0].RoleTitle;
      } else {
        this.toastr.error(response.Message)
      }
      this.dataLoading = false;
    }, (err => {
      this.toastr.error("Error whilte fetching Role list")
      this.dataLoading = false;
    }))
  }

  selectAllMenu(pageGroup: any) {
    pageGroup.RoleMenuList.forEach((e1: any) => {
      if (pageGroup.IsSelectAll) {
        e1.IsSelected = true;
        e1.CanEdit = true;
        e1.CanDelete = true;
        e1.CanCreate = true;
      } else {
        e1.IsSelected = false;
        e1.CanEdit = false;
        e1.CanDelete = false;
        e1.CanCreate = false;
      }
    });
  }

  selectMenu(e1: any) {
    if (e1.IsSelected) {
      e1.CanEdit = true;
      e1.CanDelete = true;
      e1.CanCreate = true;
    } else {
      e1.CanEdit = false;
      e1.CanDelete = false;
      e1.CanCreate = false;
    }
  }

  getRoleMenuList(option: any) {
    this.RoleMenu.RoleId = option.id;
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ RoleId: this.RoleMenu.RoleId, Status: 1 })).toString()
    }
    this.dataLoading = true
    this.service.getRoleMenuList(obj).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        this.AllRoleMenuList = response.AllRoleMenuList;
      } else {
        this.toastr.error(response.Message)
      }
      this.dataLoading = false;
    }, (err => {
      this.toastr.error("Error while fetching records")
      this.dataLoading = false;
    }))
  }

  saveRoleMenu() {
    var RoleMenuList: any[] = [];
    this.AllRoleMenuList.forEach((e1: any) => {
      e1.RoleMenuList.forEach((e2: any) => {
        RoleMenuList.push(e2);
      });
    });

    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({
        RoleId: this.RoleMenu.RoleId,
        StaffLoginId: this.staffLogin.StaffLoginId,
        RoleMenuList: RoleMenuList
      })).toString()
    }
    this.dataLoading = true;
    this.service.saveRoleMenu(obj).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        if (this.RoleMenu.RoleMenuId > 0) {
          this.toastr.success("Role Menu Updated successfully")
        } else {
          this.toastr.success("Role Menu added successfully")
        }
        this.resetForm();
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
