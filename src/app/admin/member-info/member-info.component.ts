import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { LocalService } from '../../utils/local.service';
import { ConstantData } from '../../utils/constant-data';
import { RequestModel } from '../../utils/interface';

declare var $: any;

@Component({
  selector: 'app-member-info',
  templateUrl: './member-info.component.html',
  styleUrls: ['./member-info.component.css']
})
export class MemberInfoComponent implements OnInit {
  searchQuery: string = '807042';
  isLoading: boolean = false;

  member: any = null;
  balances: any[] = [];
  lastLoan: any = null;
  recoveries: any = null;
  settlement: any = null;

  selectedDetailView: string = 'Loan Recoveries';
  detailViewOptions: string[] = ['Surety List', 'Loan Recoveries', 'CD Recoveries', 'RD Recoveries'];

  constructor(
    private service: AppService,
    private localService: LocalService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const qStaff = this.route.snapshot.queryParams['staffNo'] || this.route.snapshot.queryParams['id'];
    if (qStaff) {
      this.searchQuery = qStaff;
    }
    if (this.searchQuery) {
      this.fetchMemberInfo();
    }
  }

  fetchMemberInfo(): void {
    if (!this.searchQuery || !this.searchQuery.trim()) {
      this.toastr.warning('Please enter a Staff No, Member No, or Member Name.');
      return;
    }

    this.isLoading = true;
    const obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({
        Query: this.searchQuery.trim(),
        YearId: 2025
      })).toString()
    };

    this.service.getMemberInfoDetails(obj).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.Message === ConstantData.SuccessMessage) {
          this.member = res.Member;
          this.balances = res.Balances || [];
          this.lastLoan = res.LastLoan;
          this.recoveries = res.Recoveries;
          this.settlement = res.Settlement;
        } else {
          this.toastr.error(res.Message || 'Member information not found.');
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.toastr.error(err?.error?.Message || 'An error occurred while retrieving member details.');
      }
    });
  }

  onSearchKey(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.fetchMemberInfo();
    }
  }

  getTotalSuretyAmount(sureties: any[]): number {
    return (sureties || []).reduce((acc: number, item: any) => acc + (Number(item.Amount) || 0), 0);
  }

  openSettlementModal(): void {
    if (!this.member) {
      this.toastr.warning('Please load a member before opening settlement statement.');
      return;
    }
    if (typeof $ !== 'undefined' && $('#modal_settlement_statement').length) {
      $('#modal_settlement_statement').modal('show');
    }
  }

  printSettlementStatement(): void {
    window.print();
  }

  closePage(): void {
    this.router.navigate(['/admin/admin-dashboard']);
  }
}
