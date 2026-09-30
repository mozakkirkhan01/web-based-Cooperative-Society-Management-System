import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { ConstantData } from '../../utils/constant-data';

@Component({ selector: 'app-access-review', templateUrl: './access-review.component.html' })
export class AccessReviewComponent implements OnInit {
  Summary: any = {};
  Rows: any[] = [];
  Mode = 'Heads';
  Search = '';
  HeadId: any = null;
  MemberId: any = null;
  MemberName = '';
  IncludeDeleted = false;
  PageNumber = 1;
  PageSize = 20;
  Total = 0;
  dataLoading = false;
  requestNumber = 0;
  constructor(private service: AppService, private localService: LocalService, private toastr: ToastrService) { }
  ngOnInit() { this.loadSummary(); }
  request(data: any) {
    return { request: this.localService.encrypt(JSON.stringify({ ...data, StaffLoginId: this.localService.getEmployeeDetail().StaffLoginId })).toString() };
  }
  loadSummary() {
    this.dataLoading = true;
    this.service.accounting('AccessReview', this.request({ Mode: 'Summary' })).subscribe((r: any) => {
      this.dataLoading = false;
      if (r.Message != ConstantData.SuccessMessage) { this.toastr.error(r.Message); return; }
      this.Summary = r; this.load();
    }, err => { this.dataLoading = false; this.toastr.error(err.error?.Message || 'Unable to load the test import'); });
  }
  selectMode(mode: string) {
    this.Mode = mode; this.Search = ''; this.PageNumber = 1; this.HeadId = null; this.MemberId = null; this.MemberName = ''; this.load();
  }
  search() { this.PageNumber = 1; this.load(); }
  load() {
    const requestNumber = ++this.requestNumber;
    this.Rows = []; this.Total = 0;
    if (this.Mode == 'Heads' || this.Mode == 'Checks') { this.dataLoading = false; return; }
    this.dataLoading = true;
    this.service.accounting('AccessReview', this.request({
      Mode: this.Mode, Search: this.Search, HeadId: this.HeadId || 0,
      MemberId: this.MemberId, IncludeDeleted: this.IncludeDeleted, PageNumber: this.PageNumber, PageSize: this.PageSize
    })).subscribe((r: any) => {
      if (requestNumber != this.requestNumber) return;
      this.dataLoading = false;
      if (r.Message != ConstantData.SuccessMessage) { this.toastr.error(r.Message); return; }
      this.Rows = r.Rows; this.Total = r.Total;
    }, err => { if (requestNumber == this.requestNumber) { this.dataLoading = false; this.toastr.error(err.error?.Message || 'Unable to load records'); } });
  }
  get heads() {
    const search = this.Search.toLowerCase().trim();
    return (this.Summary.HeadList || []).filter((x: any) => !search || x.HeadName.toLowerCase().includes(search) || x.HeadCode.includes(search));
  }
  get visibleHeads() { return this.heads.slice((this.PageNumber - 1) * this.PageSize, this.PageNumber * this.PageSize); }
  get totalRecords() { return this.Mode == 'Heads' ? this.heads.length : this.Total; }
  balance(value: any) {
    if (value == null) return 'Unavailable';
    return Math.abs(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (value < 0 ? ' Cr' : value > 0 ? ' Dr' : '');
  }
  ledger(headId: any, member: any = null) {
    this.Mode = 'Ledger'; this.Search = ''; this.HeadId = headId; this.MemberId = member?.MemberId || null;
    this.MemberName = member?.MemberName || ''; this.PageNumber = 1; this.load();
  }
  applications(member: any) {
    this.Mode = 'Applications'; this.Search = ''; this.MemberId = member.MemberId; this.MemberName = member.MemberName;
    this.PageNumber = 1; this.load();
  }
  page(change: number) { this.PageNumber += change; this.load(); }
}
