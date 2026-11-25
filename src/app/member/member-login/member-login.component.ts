import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ConstantData } from '../../utils/constant-data';
import { LocalService } from '../../utils/local.service';
import { MemberPortalService } from '../services/member-portal.service';

@Component({
  selector: 'app-member-login',
  templateUrl: './member-login.component.html',
  styleUrls: ['./member-login.component.css']
})
export class MemberLoginComponent implements OnInit {
  dataLoading: boolean = false;
  submitted: boolean = false;
  hidePassword: boolean = true;
  errorMessage: string = '';

  staffNo: string = '';
  dateOfBirth: string = '';

  company: any = {};
  imageUrl: string = '';

  constructor(
    private memberService: MemberPortalService,
    private localService: LocalService,
    private toastr: ToastrService,
    private router: Router
  ) {
    this.imageUrl = this.memberService.getImageUrl();
  }

  ngOnInit(): void {
    this.loadLoginMeta();
  }

  loadLoginMeta(): void {
    this.memberService.getLoginMeta().subscribe({
      next: (res: any) => {
        if (res && res.Message === ConstantData.SuccessMessage && res.Company) {
          this.company = res.Company;
        }
      },
      error: () => {
        // Fallback branding is rendered cleanly in template if metadata fails
      }
    });
  }

  onStaffNoInput(): void {
    this.staffNo = (this.staffNo || '').replace(/\D/g, '');
  }

  private normalizeDob(raw: string): string {
    const trimmed = (raw || '').trim();
    if (!trimmed) return '';
    return trimmed.replace(/[\s\/\-\.]/g, '');
  }

  private isValidCalendarDob(ddmmyyyy: string): boolean {
    if (!/^\d{8}$/.test(ddmmyyyy)) return false;
    const day = parseInt(ddmmyyyy.substring(0, 2), 10);
    const month = parseInt(ddmmyyyy.substring(2, 4), 10);
    const year = parseInt(ddmmyyyy.substring(4, 8), 10);

    if (year < 1920 || year > new Date().getFullYear() || month < 1 || month > 12 || day < 1 || day > 31) {
      return false;
    }

    const dt = new Date(year, month - 1, day);
    return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day;
  }

  memberLogin(form: NgForm): void {
    this.submitted = true;
    this.errorMessage = '';

    const cleanStaffNo = (this.staffNo || '').trim();
    const normalizedDob = this.normalizeDob(this.dateOfBirth);

    if (form.invalid || !cleanStaffNo || !normalizedDob) {
      this.errorMessage = 'Please enter both Staff Number and Date of Birth (DDMMYYYY).';
      this.toastr.error(this.errorMessage, 'Validation Error');
      return;
    }

    if (!this.isValidCalendarDob(normalizedDob)) {
      this.errorMessage = 'Enter Date of Birth in DDMMYYYY format (e.g., 21011984 for 21 Jan 1984).';
      this.toastr.error(this.errorMessage, 'Invalid Date Format');
      return;
    }

    this.dataLoading = true;
    this.memberService.memberLogin(cleanStaffNo, normalizedDob).subscribe({
      next: (res: any) => {
        this.dataLoading = false;
        if (res && res.Message === ConstantData.SuccessMessage && res.Token && res.MemberDetail) {
          this.localService.setMemberSession(res.Token, res.MemberDetail);
          this.submitted = false;
          this.toastr.success(`Welcome, ${res.MemberDetail.MemberName}`, 'Login Successful');
          this.router.navigate(['/member/dashboard']);
        } else {
          this.errorMessage = (res && res.Message) ? res.Message : 'Invalid Staff Number or Date of Birth.';
          this.toastr.error(this.errorMessage);
        }
      },
      error: (err: any) => {
        this.dataLoading = false;
        this.errorMessage = err?.error?.Message || 'Unable to connect to the server. Please try again.';
        this.toastr.error(this.errorMessage);
      }
    });
  }
}
