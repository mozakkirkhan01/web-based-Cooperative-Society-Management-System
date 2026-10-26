import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription, interval } from 'rxjs';
import { AppService } from './app.service';
import { LocalService } from './local.service';
import { ConstantData } from './constant-data';

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  public pendingCount$ = new BehaviorSubject<number>(0);
  public pendingNotifications$ = new BehaviorSubject<any[]>([]);
  private pollSub: Subscription | null = null;
  private isRequesting = false;

  constructor(private service: AppService, private localService: LocalService) {
    this.initPolling();
  }

  private initPolling() {
    this.refresh();
    // Poll every 30 seconds for background transaction updates
    this.pollSub = interval(30000).subscribe(() => {
      this.refresh();
    });
  }

  public refresh() {
    const user = this.localService.getEmployeeDetail();
    if (!user || !user.StaffLoginId) return;
    if (this.isRequesting) return;

    this.isRequesting = true;
    const payload = {
      StaffLoginId: user.StaffLoginId,
      SourceType: 'JOURNAL'
    };

    const req = {
      request: this.localService.encrypt(JSON.stringify(payload)).toString()
    };

    this.service.accounting('NotificationSummary', req).subscribe({
      next: (response: any) => {
        this.isRequesting = false;
        if (response && response.Message === ConstantData.SuccessMessage) {
          this.pendingCount$.next(response.PendingCount || 0);
          this.pendingNotifications$.next(response.Recent || []);
        }
      },
      error: () => {
        this.isRequesting = false;
      }
    });
  }

  ngOnDestroy() {
    if (this.pollSub) {
      this.pollSub.unsubscribe();
      this.pollSub = null;
    }
  }
}
