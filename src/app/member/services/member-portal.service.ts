import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ConstantData } from '../../utils/constant-data';
import { LocalService } from '../../utils/local.service';
import { RequestModel } from '../../utils/interface';

@Injectable({
  providedIn: 'root'
})
export class MemberPortalService {
  private readonly apiUrl: string = ConstantData.getApiUrl() + 'MemberLogin/';
  private readonly noticeApiUrl: string = ConstantData.getApiUrl() + 'Notice/';

  private unreadNoticeSubject = new BehaviorSubject<number>(0);
  public unreadNoticeCount$ = this.unreadNoticeSubject.asObservable();

  constructor(
    private http: HttpClient,
    private localService: LocalService,
    private router: Router
  ) {}

  getImageUrl(): string {
    return ConstantData.getBaseUrl();
  }

  setUnreadNoticeCount(count: number): void {
    this.unreadNoticeSubject.next(Math.max(0, count || 0));
  }

  private getPublicHeaders(): HttpHeaders {
    return new HttpHeaders({
      'AppKey': ConstantData.getMemberKey()
    });
  }

  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'AppKey': ConstantData.getMemberKey(),
      'Authorization': 'Bearer ' + this.localService.getMemberToken()
    });
  }

  private postAuthenticated<T = any>(fullUrl: string, payload?: any): Observable<T> {
    const body: RequestModel = {
      request: payload
        ? this.localService.encrypt(JSON.stringify(payload)).toString()
        : ''
    };

    return this.http.post<T>(fullUrl, body, { headers: this.getAuthHeaders() }).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          this.localService.clearMemberSession();
          this.unreadNoticeSubject.next(0);
          this.router.navigate(['/member/login']);
        }
        return throwError(() => err);
      })
    );
  }

  getLoginMeta(): Observable<any> {
    return this.http.post(this.apiUrl + 'GetLoginMeta', {}, { headers: this.getPublicHeaders() });
  }

  memberLogin(staffNo: string, dateOfBirth: string): Observable<any> {
    const req: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({
        StaffNo: staffNo,
        DateOfBirth: dateOfBirth
      })).toString()
    };
    return this.http.post(this.apiUrl + 'MemberLogin', req, { headers: this.getPublicHeaders() });
  }

  logout(): Observable<any> {
    return this.postAuthenticated(this.apiUrl + 'Logout').pipe(
      tap(() => this.unreadNoticeSubject.next(0))
    );
  }

  getMyDashboard(yearId?: number): Observable<any> {
    return this.postAuthenticated(this.apiUrl + 'GetMyDashboard', { YearId: yearId || 0 });
  }

  getMyProfile(): Observable<any> {
    return this.postAuthenticated(this.apiUrl + 'GetMyProfile');
  }

  // Notice Portal APIs
  getMyNotices(filter: string = 'ALL', category: string = ''): Observable<any> {
    return this.postAuthenticated(this.noticeApiUrl + 'GetMyNotices', {
      Filter: filter,
      Category: category
    }).pipe(
      tap((res: any) => {
        if (res && res.Message === ConstantData.SuccessMessage && typeof res.UnreadCount === 'number') {
          this.unreadNoticeSubject.next(res.UnreadCount);
        }
      })
    );
  }

  getUnreadNoticeCount(): Observable<any> {
    return this.postAuthenticated(this.noticeApiUrl + 'GetUnreadCount').pipe(
      tap((res: any) => {
        if (res && res.Message === ConstantData.SuccessMessage && typeof res.UnreadCount === 'number') {
          this.unreadNoticeSubject.next(res.UnreadCount);
        }
      })
    );
  }

  markNoticeAsRead(noticeId: number): Observable<any> {
    return this.postAuthenticated(this.noticeApiUrl + 'MarkAsRead', { NoticeId: noticeId }).pipe(
      tap((res: any) => {
        if (res && res.Message === ConstantData.SuccessMessage && typeof res.UnreadCount === 'number') {
          this.unreadNoticeSubject.next(res.UnreadCount);
        }
      })
    );
  }

  downloadNoticeAttachment(noticeId: number): Observable<any> {
    return this.postAuthenticated(this.noticeApiUrl + 'DownloadAttachment', { NoticeId: noticeId });
  }
}
