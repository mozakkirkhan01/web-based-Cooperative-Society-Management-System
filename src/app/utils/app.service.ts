import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { ConstantData } from './constant-data';

@Injectable({
  providedIn: 'root'
})
export class AppService {
  private readonly apiUrl: string = ConstantData.getApiUrl();
  private readonly baseUrl: string = ConstantData.getBaseUrl();
  private readonly headers: HttpHeaders = new HttpHeaders({ 'AppKey': ConstantData.getAdminKey() });

  constructor(private http: HttpClient) {
  }

  getImageUrl(): string {
    return ConstantData.getBaseUrl();
  }

  //Receipt
  getReceiptTransactionNo(obj: any) {
    return this.http.post(this.apiUrl + "Receipt/getReceiptTransactionNo", obj, { headers: this.headers });
  }
  getReceiptList(obj: any) {
    return this.http.post(this.apiUrl + "Receipt/ReceiptList", obj, { headers: this.headers })
  }

  saveReceipt(obj: any) {
    return this.http.post(this.apiUrl + "Receipt/saveReceipt", obj, { headers: this.headers })
  }
  deleteReceipt(obj: any) {
    return this.http.post(this.apiUrl + "Receipt/deleteReceipt", obj, { headers: this.headers })
  }

  //MemberDoc
  getMemberImageList(obj: any) {
    return this.http.post(this.apiUrl + "MemberImage/MemberImageList", obj, { headers: this.headers })
  }

  saveMemberDoc(obj: any) {
    return this.http.post(this.apiUrl + "MemberImage/saveMemberImage", obj, { headers: this.headers })
  }

  deleteMemberDoc(obj: any) {
    return this.http.post(this.apiUrl + "MemberImage/deleteMemberImage", obj, { headers: this.headers })
  }

  //Payment
  getTransactionNo(obj: any) {
    return this.http.post(this.apiUrl + "Payment/getTransactionNo", obj, { headers: this.headers });
  }
  getPaymentList(obj: any) {
    return this.http.post(this.apiUrl + "Payment/PaymentList", obj, { headers: this.headers })
  }

  savePayment(obj: any) {
    return this.http.post(this.apiUrl + "Payment/savePayment", obj, { headers: this.headers })
  }
  deletePayment(obj: any) {
    return this.http.post(this.apiUrl + "Payment/deletePayment", obj, { headers: this.headers })
  }

  //Bank
  getBankList(obj: any) {
    return this.http.post(this.apiUrl + "Bank/BankList", obj, { headers: this.headers })
  }

  saveBank(obj: any) {
    return this.http.post(this.apiUrl + "Bank/saveBank", obj, { headers: this.headers })
  }

  deleteBank(obj: any) {
    return this.http.post(this.apiUrl + "Bank/deleteBank", obj, { headers: this.headers })
  }



  //Head
  getHeadList(obj: any) {
    return this.http.post(this.apiUrl + "Head/HeadList", obj, { headers: this.headers })
  }

  saveHead(obj: any) {
    return this.http.post(this.apiUrl + "Head/saveHead", obj, { headers: this.headers })
  }

  deleteHead(obj: any) {
    return this.http.post(this.apiUrl + "Head/deleteHead", obj, { headers: this.headers })
  }
  //Member
  getMemberList(obj: any) {
    return this.http.post(this.apiUrl + "Member/MemberList", obj, { headers: this.headers })
  }

  saveMember(obj: any) {
    return this.http.post(this.apiUrl + "Member/saveMember", obj, { headers: this.headers })
  }

  deleteMember(obj: any) {
    return this.http.post(this.apiUrl + "Member/deleteMember", obj, { headers: this.headers })
  }
  //FinancialYear
  getFinancialYearList(obj: any) {
    return this.http.post(this.apiUrl + "FinancialYear/FinancialYearList", obj, { headers: this.headers })
  }

  saveFinancialYear(obj: any) {
    return this.http.post(this.apiUrl + "FinancialYear/saveFinancialYear", obj, { headers: this.headers })
  }

  deleteFinancialYear(obj: any) {
    return this.http.post(this.apiUrl + "FinancialYear/deleteFinancialYear", obj, { headers: this.headers })
  }

  // District
  getDistrictList(obj: any) {
    return this.http.post(this.apiUrl + "District/DistrictList", obj, { headers: this.headers })
  }

  saveDistrict(obj: any) {
    return this.http.post(this.apiUrl + "District/saveDistrict", obj, { headers: this.headers })
  }

  deleteDistrict(obj: any) {
    return this.http.post(this.apiUrl + "District/deleteDistrict", obj, { headers: this.headers })
  }

  // Company
  getCompanyList(obj: any) {
    return this.http.post(this.apiUrl + "Company/CompanyList", obj, { headers: this.headers })
  }

  saveCompany(obj: any) {
    return this.http.post(this.apiUrl + "Company/saveCompany", obj, { headers: this.headers })
  }

  deleteCompany(obj: any) {
    return this.http.post(this.apiUrl + "Company/deleteCompany", obj, { headers: this.headers })
  }

  // Designation 
  getDesignationList(obj: any) {
    return this.http.post(this.apiUrl + "Designation/DesignationList", obj, { headers: this.headers })
  }

  saveDesignation(obj: any) {
    return this.http.post(this.apiUrl + "Designation/saveDesignation", obj, { headers: this.headers })
  }

  deleteDesignation(obj: any) {
    return this.http.post(this.apiUrl + "Designation/deleteDesignation", obj, { headers: this.headers })
  }

  /* ---------------------------------------------------------------------- */

  //Department
  getDepartmentList(obj: any) {
    return this.http.post(this.apiUrl + "Department/DepartmentList", obj, { headers: this.headers })
  }

  saveDepartment(obj: any) {
    return this.http.post(this.apiUrl + "Department/saveDepartment", obj, { headers: this.headers })
  }

  deleteDepartment(obj: any) {
    return this.http.post(this.apiUrl + "Department/deleteDepartment", obj, { headers: this.headers })
  }

  /* ---------------------------------------------------------------------- */

  // Staff
  getStaffList(obj: any) {
    return this.http.post(this.apiUrl + "Staff/StaffList", obj, { headers: this.headers })
  }

  saveStaff(obj: any) {
    return this.http.post(this.apiUrl + "Staff/saveStaff", obj, { headers: this.headers })
  }

  deleteStaff(obj: any) {
    return this.http.post(this.apiUrl + "Staff/deleteStaff", obj, { headers: this.headers })
  }

  /* ---------------------------------------------------------------------- */

  // Staff Login
  StaffLogin(obj: any) {
    return this.http.post(this.apiUrl + "StaffLogin/StaffLogin", obj, { headers: this.headers })
  }

  getStaffLoginList(obj: any) {
    return this.http.post(this.apiUrl + "StaffLogin/StaffLoginList", obj, { headers: this.headers })
  }

  saveStaffLogin(obj: any) {
    return this.http.post(this.apiUrl + "StaffLogin/saveStaffLogin", obj, { headers: this.headers })
  }

  deleteStaffLogin(obj: any) {
    return this.http.post(this.apiUrl + "StaffLogin/deleteStaffLogin", obj, { headers: this.headers })
  }

  changePassword(obj: any) {
    return this.http.post(this.apiUrl + "StaffLogin/changePassword", obj, { headers: this.headers })
  }

  /* ---------------------------------------------------------------------- */

  //PageGroup
  getPageGroupList(obj: any) {
    return this.http.post(this.apiUrl + "PageGroup/PageGroupList", obj, { headers: this.headers })
  }

  savePageGroup(obj: any) {
    return this.http.post(this.apiUrl + "PageGroup/savePageGroup", obj, { headers: this.headers })
  }

  deletePageGroup(obj: any) {
    return this.http.post(this.apiUrl + "PageGroup/deletePageGroup", obj, { headers: this.headers })
  }

  /* ---------------------------------------------------------------------- */

  //Page
  getPageList(obj: any) {
    return this.http.post(this.apiUrl + "Page/PageList", obj, { headers: this.headers })
  }

  savePage(obj: any) {
    return this.http.post(this.apiUrl + "Page/savePage", obj, { headers: this.headers })
  }

  deletePage(obj: any) {
    return this.http.post(this.apiUrl + "Page/deletePage", obj, { headers: this.headers })
  }

  /* ---------------------------------------------------------------------- */

  //Menu
  getUserMenuList(obj: any) {
    return this.http.post(this.apiUrl + "Menu/UserMenuList", obj, { headers: this.headers })
  }

  validiateMenu(obj: any) {
    return this.http.post(this.apiUrl + "Menu/ValidiateMenu", obj, { headers: this.headers })
  }

  getMenuList(obj: any) {
    return this.http.post(this.apiUrl + "Menu/MenuList", obj, { headers: this.headers })
  }

  saveMenu(obj: any) {
    return this.http.post(this.apiUrl + "Menu/saveMenu", obj, { headers: this.headers })
  }

  deleteMenu(obj: any) {
    return this.http.post(this.apiUrl + "Menu/deleteMenu", obj, { headers: this.headers })
  }

  menuUp(obj: any) {
    return this.http.post(this.apiUrl + "Menu/MenuUp", obj, { headers: this.headers })
  }

  menuDown(obj: any) {
    return this.http.post(this.apiUrl + "Menu/MenuDown", obj, { headers: this.headers })
  }

  /* ---------------------------------------------------------------------- */

  //Role
  getRoleList(obj: any) {
    return this.http.post(this.apiUrl + "Role/RoleList", obj, { headers: this.headers })
  }

  saveRole(obj: any) {
    return this.http.post(this.apiUrl + "Role/saveRole", obj, { headers: this.headers })
  }

  deleteRole(obj: any) {
    return this.http.post(this.apiUrl + "Role/deleteRole", obj, { headers: this.headers })
  }

  /* ---------------------------------------------------------------------- */

  //RoleMenu
  getRoleMenuList(obj: any) {
    return this.http.post(this.apiUrl + "RoleMenu/AllRoleMenuList", obj, { headers: this.headers })
  }

  saveRoleMenu(obj: any) {
    return this.http.post(this.apiUrl + "RoleMenu/saveRoleMenu", obj, { headers: this.headers })
  }

  /* ---------------------------------------------------------------------- */

  //StaffLoginRole
  getStaffLoginRoleList(obj: any) {
    return this.http.post(this.apiUrl + "StaffLoginRole/StaffLoginRoleList", obj, { headers: this.headers })
  }

  saveStaffLoginRole(obj: any) {
    return this.http.post(this.apiUrl + "StaffLoginRole/saveStaffLoginRole", obj, { headers: this.headers })
  }

  deleteStaffLoginRole(obj: any) {
    return this.http.post(this.apiUrl + "StaffLoginRole/deleteStaffLoginRole", obj, { headers: this.headers })
  }

  //State
  getStateList(obj: any) {
    return this.http.post(this.apiUrl + "State/StateList", obj, { headers: this.headers })
  }

  saveState(obj: any) {
    return this.http.post(this.apiUrl + "State/saveState", obj, { headers: this.headers })
  }

  deleteState(obj: any) {
    return this.http.post(this.apiUrl + "State/deleteState", obj, { headers: this.headers })
  }

  /* ---------------------------------------------------------------------- */

  //City
  getCityList(obj: any) {
    return this.http.post(this.apiUrl + "City/CityList", obj, { headers: this.headers })
  }

  saveCity(obj: any) {
    return this.http.post(this.apiUrl + "City/saveCity", obj, { headers: this.headers })
  }

  deleteCity(obj: any) {
    return this.http.post(this.apiUrl + "City/deleteCity", obj, { headers: this.headers })
  }
}
