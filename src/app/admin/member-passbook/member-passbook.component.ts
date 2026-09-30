import { Component, OnDestroy, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { ConstantData } from '../../utils/constant-data';

@Component({
  selector: 'app-member-passbook',
  templateUrl: './member-passbook.component.html',
  styleUrls: ['./member-passbook.component.css']
})
export class MemberPassbookComponent implements OnInit, OnDestroy {
  YearId = 0;
  Years: any[] = [];
  MemberKey = '';
  MemberSearch = '';
  Members: any[] = [];
  Passbook: any = {};
  Rows: any[] = [];
  Totals: any = {};
  dataLoading = false;
  Loaded = false;
  Allowed = false;
  Error = '';
  requestNumber = 0;
  memberRequest = 0;

  constructor(private service: AppService, private localService: LocalService, private toastr: ToastrService) { }

  ngOnInit() {
    this.setup();
  }

  ngOnDestroy() {
    this.requestNumber++;
    this.memberRequest++;
  }

  request(mode: string, search = '') {
    var obj = {
      StaffLoginId: this.localService.getEmployeeDetail().StaffLoginId,
      Report: 'MemberPassbook',
      Mode: mode,
      YearId: this.YearId,
      MemberKey: this.MemberKey,
      Search: search,
      PageNumber: 1,
      PageSize: 20
    };
    return { request: this.localService.encrypt(JSON.stringify(obj)).toString() };
  }

  setup() {
    const current = ++this.requestNumber;
    this.memberRequest++;
    this.dataLoading = true;
    this.Allowed = false;
    this.Error = '';
    this.service.accessReport(this.request('Setup')).subscribe((response: any) => {
      if (current != this.requestNumber) return;
      this.dataLoading = false;
      if (response.Message != ConstantData.SuccessMessage) { this.fail(response.Message); return; }
      this.Years = response.Years;
      this.YearId = response.Year.YearId;
      this.Allowed = true;
    }, error => { if (current == this.requestNumber) this.fail(error.error?.Message); });
  }

  yearChanged() {
    this.MemberKey = '';
    this.MemberSearch = '';
    this.Members = [];
    this.clearPassbook();
    this.setup();
  }

  clearPassbook() {
    this.requestNumber++;
    this.Passbook = {};
    this.Rows = [];
    this.Totals = {};
    this.Loaded = false;
    this.dataLoading = false;
    this.Error = '';
  }

  findMembers() {
    this.MemberKey = '';
    this.clearPassbook();
    const current = ++this.memberRequest;
    if (!this.MemberSearch.trim()) { this.Members = []; return; }
    this.service.accessReport(this.request('Members', this.MemberSearch)).subscribe((response: any) => {
      if (current == this.memberRequest) this.Members = response.Message == ConstantData.SuccessMessage ? response.Rows : [];
    }, () => { if (current == this.memberRequest) this.Members = []; });
  }

  selectMember(member: any) {
    this.memberRequest++;
    this.MemberKey = member.MemberKey;
    this.MemberSearch = `${member.MemberName} — ${member.MemberNo} / ${member.StaffNo}`;
    this.clearPassbook();
    this.show();
  }

  show() {
    if (!this.MemberKey) { this.toastr.error('Select a member first'); return; }
    const current = ++this.requestNumber;
    this.dataLoading = true;
    this.Error = '';
    this.service.accessReport(this.request('Data')).subscribe((response: any) => {
      if (current != this.requestNumber) return;
      this.dataLoading = false;
      if (response.Message != ConstantData.SuccessMessage) { this.fail(response.Message); return; }
      this.Passbook = response;
      this.Rows = response.Rows || [];
      this.Totals = response.Totals || {};
      this.Loaded = true;
    }, error => { if (current == this.requestNumber) this.fail(error.error?.Message); });
  }

  fail(message: string) {
    this.clearPassbook();
    this.Error = message || 'Unable to load member passbook';
    this.toastr.error(this.Error);
  }

  balance(value: number) {
    return `${Math.abs(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${value > 0 ? ' Dr' : value < 0 ? ' Cr' : ''}`;
  }

  printPassbook() {
    window.print();
  }
}
