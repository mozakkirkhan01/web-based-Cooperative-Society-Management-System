import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminLoginComponent } from './admin/admin-login/admin-login.component';
import { PageNotFoundComponent } from './component/page-not-found/page-not-found.component';
import { AdminMasterComponent } from './admin/admin-master/admin-master.component';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
import { DesignationComponent } from './admin/designation/designation.component';
import { DepartmentComponent } from './admin/department/department.component';
import { StaffComponent } from './admin/staff/staff.component';
import { StaffLoginComponent } from './admin/staff-login/staff-login.component';
import { PageGroupComponent } from './admin/page-group/page-group.component';
import { PageComponent } from './admin/page/page.component';
import { MenuComponent } from './admin/menu/menu.component';
import { RoleComponent } from './admin/role/role.component';
import { RoleMenuComponent } from './admin/role-menu/role-menu.component';
import { StateComponent } from './admin/state/state.component';
import { CityComponent } from './admin/city/city.component';
import { ChangePasswordComponent } from './admin/change-password/change-password.component';
import { CompanyComponent } from './admin/company/company.component';
import { FinancialYearComponent } from './admin/financial-year/financial-year.component';
import { MemberComponent } from './admin/member/member.component';
import { HeadComponent } from './admin/head/head.component';
import { BankComponent } from './admin/bank/bank.component';
import { PaymentComponent } from './admin/payment/payment.component';
import { MemberDocComponent } from './admin/member-doc/member-doc.component';
import { ReceiptComponent } from './admin/receipt/receipt.component';
import { AccessReviewComponent } from './admin/accounting/access-review.component';
import { MemberPassbookComponent } from './admin/member-passbook/member-passbook.component';
import { AccessReportsComponent } from './admin/accounting/access-reports.component';
import { ConstantData } from './utils/constant-data';
import { ContraComponent } from './admin/contra/contra.component';
import { TransferComponent } from './admin/transfer/transfer.component';
import { ScheduleComponent } from './admin/schedule/schedule.component';
const routes: Routes = [
  { path: '', redirectTo: "/admin-login", pathMatch: 'full' },
  { path: 'admin-login', component: AdminLoginComponent },
  {
    path: 'admin', component: AdminMasterComponent, children: [
      { path: 'admin-dashboard', component: AdminDashboardComponent },
      { path: 'designation', component: DesignationComponent },
      { path: 'department', component: DepartmentComponent },
      { path: 'staff', component: StaffComponent },
      { path: 'staffLogin', component: StaffLoginComponent },
      { path: 'page-group', component: PageGroupComponent },
      { path: 'page', component: PageComponent },
      { path: 'menu', component: MenuComponent },
      { path: 'role', component: RoleComponent },
      { path: 'role-menu', component: RoleMenuComponent },
      { path: 'role-menu/:id', component: RoleMenuComponent },
      { path: 'state', component: StateComponent },
      { path: 'city', component: CityComponent },
      { path: 'change-password', component: ChangePasswordComponent },
      { path: 'company', component: CompanyComponent },
      { path: 'financial-year', component: FinancialYearComponent },
      { path: 'access-review', component: AccessReportsComponent, data: { report: 'Checks', title: 'Import Checks' } },
      { path: 'member-passbook', component: MemberPassbookComponent },
      { path: 'member-ledger', component: AccessReportsComponent, data: { report: 'MemberLedger', title: 'Member Ledger' } },
      { path: 'day-book', component: AccessReportsComponent, data: { report: 'DayBook', title: 'Day Book' } },
      { path: 'head-ledger', component: AccessReportsComponent, data: { report: 'HeadLedger', title: 'Head Ledger' } },
      { path: 'cash-bank-book', component: AccessReportsComponent, data: { report: 'CashBank', title: 'Cash / Bank Book' } },
      { path: 'trial-balance', component: AccessReportsComponent, data: { report: 'TrialBalance', title: 'Trial Balance' } },
      { path: 'member-balances', component: AccessReportsComponent, data: { report: 'MemberBalances', title: 'Member Balances' } },
      { path: 'loan-applications', component: AccessReportsComponent, data: { report: 'LoanApplications', title: 'Loan Applications' } },
      ...(ConstantData.AccessReview ? [{ path: 'access-2025-review', component: AccessReviewComponent }] : []),
      { path: 'member', component: MemberComponent },
      { path: 'head', component: HeadComponent },
      { path: 'bank', component: BankComponent },
      { path: 'payment', component: PaymentComponent },
      { path: 'member-doc', component: MemberDocComponent },
      { path: 'receipt', component: ReceiptComponent },
      { path: 'contra', component: ContraComponent },
      { path: 'transfer', component: TransferComponent },
      { path: 'schedule', component: ScheduleComponent },

    ]
  },
  { path: 'page-not-found', component: PageNotFoundComponent },
  { path: '**', component: PageNotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }


