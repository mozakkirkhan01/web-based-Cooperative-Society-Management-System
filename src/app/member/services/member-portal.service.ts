import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ConstantData } from '../../utils/constant-data';
import { LocalService } from '../../utils/local.service';
import { RequestModel } from '../../utils/interface';

@Injectable({
  providedIn: 'root'
})
export class MemberPortalService {
  private readonly apiUrl: string = ConstantData.getApiUrl() + 'MemberLogin/';

  constructor(
    private http: HttpClient,
    private localService: LocalService,
    private router: Router
  ) {}

  getImageUrl(): string {
    return ConstantData.getBaseUrl();
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

  private postAuthenticated<T = any>(action: string, payload?: any): Observable<T> {
    const body: RequestModel = {
      request: payload
        ? this.localService.encrypt(JSON.stringify(payload)).toString()
        : ''
    };

    return this.http.post<T>(this.apiUrl + action, body, { headers: this.getAuthHeaders() }).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          this.localService.clearMemberSession();
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
    return this.postAuthenticated('Logout');
  }

  getMyDashboard(yearId?: number): Observable<any> {
    return this.postAuthenticated('GetMyDashboard', { YearId: yearId || 0 });
  }

  getMyProfile(): Observable<any> {
    return this.postAuthenticated('GetMyProfile');
  }
}
