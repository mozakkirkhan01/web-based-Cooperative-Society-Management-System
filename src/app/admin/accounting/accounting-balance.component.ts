import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { LoadDataService } from '../../utils/load-data.service';
import { ConstantData } from '../../utils/constant-data';

@Component({
  selector: 'app-accounting-balance',
  template: `
    <div class="row">
      <mat-form-field appearance="outline" class="col-12">
        <mat-label>Society</mat-label>
        <mat-select [ngModel]="societyId" [ngModelOptions]="{standalone: true}" (ngModelChange)="selectSociety($event)" [disabled]="disabled">
          <mat-option *ngFor="let s of SocietyList" [value]="s.SocietyId">{{s.SocietyName}}</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="col-sm-6">
        <mat-label>Year opening balance</mat-label>
        <input matInput readonly [value]="format(Balance?.HeadOpeningBalance)">
      </mat-form-field>
      <mat-form-field appearance="outline" class="col-sm-6">
        <mat-label>Head balance at selected date</mat-label>
        <input matInput readonly [value]="format(Balance?.HeadBalance)">
      </mat-form-field>
    </div>
    <p class="small mb-3" aria-live="polite">{{loading ? 'Loading balance...' : message}}</p>
  `
})
export class AccountingBalanceComponent implements OnChanges {
  @Input() headId: any;
  @Input() date: any;
  @Input() societyId: any;
  @Input() sourceType = 'PAYMENT';
  @Input() disabled = false;
  @Input() refresh = 0;
  @Input() memberId: any;
  @Input() bankId: any;
  @Input() bankCashType: any;
  @Output() societyIdChange = new EventEmitter<any>();
  @Output() balanceChange = new EventEmitter<any>();
  SocietyList: any[] = [];
  Balance: any = null;
  message = '';
  loading = false;
  requestNo = 0;
  constructor(private service: AppService, private local: LocalService, private loadData: LoadDataService) { }
  ngOnChanges() { this.load(); }
  selectSociety(value: any) { this.societyId = value; this.societyIdChange.emit(value); this.load(); }
  format(value: any) {
    if (value == null) return 'Not available';
    return Math.abs(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (value > 0 ? ' Dr' : value < 0 ? ' Cr' : '');
  }
  load() {
    const request = ++this.requestNo;
    this.Balance = null; this.loading = true;
    this.balanceChange.emit(null);
    const date = this.date ? this.loadData.loadDateYMD(this.date) : null;
    const obj = { StaffLoginId: this.local.getEmployeeDetail().StaffLoginId, SocietyId: this.societyId || 0, HeadId: this.headId || 0, MemberId: this.memberId || null, BankId: this.bankId || null, BankCashType: this.bankCashType || null, AsOfDate: date && !date.includes('NaN') ? date : null, SourceType: this.sourceType };
    this.service.accounting('PaymentBalances', { request: this.local.encrypt(JSON.stringify(obj)).toString() }).subscribe((r: any) => {
      if (request != this.requestNo) return;
      this.loading = false;
      if (r.Message != ConstantData.SuccessMessage) { this.message = r.Message; return; }
      this.SocietyList = r.SocietyList; this.Balance = r.Balance; this.message = r.Balance?.BalanceMessage;
      this.balanceChange.emit(this.Balance);
      if (!this.societyId && this.SocietyList.length == 1) this.selectSociety(this.SocietyList[0].SocietyId);
    }, err => { if (request != this.requestNo) return; this.loading = false; this.message = err.error?.Message || 'Unable to load head balance.'; });
  }
}
