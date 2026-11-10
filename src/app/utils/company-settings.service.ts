import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppService } from './app.service';
import { LocalService } from './local.service';
import { SocietyConfig, SocietySettings } from './constants';

const CACHE_KEY = 'SOCIETY_SETTINGS_CACHE';

@Injectable({
  providedIn: 'root'
})
export class CompanySettingsService {
  private settingsSubject = new BehaviorSubject<SocietySettings>({ ...SocietyConfig });
  public settings$: Observable<SocietySettings> = this.settingsSubject.asObservable();

  public get current(): SocietySettings {
    return this.settingsSubject.value;
  }

  // Convenient property getters for instant access with guaranteed fallback
  public get Code3(): string { return this.current.Code3 || SocietyConfig.Code3; }
  public get Code2(): string { return this.current.Code2 || SocietyConfig.Code2; }
  public get DefaultAccountNo(): string { return this.current.DefaultAccountNo || SocietyConfig.DefaultAccountNo; }
  public get DefaultLoanCode(): string { return this.current.DefaultLoanCode || SocietyConfig.DefaultLoanCode; }
  public get MaxLoanTenorMonths(): number { return this.current.MaxLoanTenorMonths || SocietyConfig.MaxLoanTenorMonths; }
  public get DefaultInterestRate(): number { return this.current.DefaultInterestRate || SocietyConfig.DefaultInterestRate; }
  public get MaxPrintRowsPerPage(): number { return this.current.MaxPrintRowsPerPage || SocietyConfig.MaxPrintRowsPerPage; }
  public get OfficialNameEn(): string { return this.current.OfficialNameEn || SocietyConfig.OfficialNameEn; }
  public get OfficialNameHi(): string { return this.current.OfficialNameHi || SocietyConfig.OfficialNameHi; }
  public get RegdNo(): string { return this.current.RegdNo || SocietyConfig.RegdNo; }
  public get Address(): string { return this.current.Address || SocietyConfig.Address; }

  constructor(private appService: AppService, private localService: LocalService) {
    this.hydrateFromCache();
  }

  private hydrateFromCache(): void {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        this.settingsSubject.next({ ...SocietyConfig, ...parsed });
      }
    } catch { }
  }

  public loadSettings(): void {
    const obj = {
      request: this.localService.encrypt(JSON.stringify({})).toString()
    };
    this.appService.getCompanyList(obj).subscribe({
      next: (res: any) => {
        if (res && res.CompanyList && res.CompanyList.length > 0) {
          const comp = res.CompanyList[0];
          const merged: SocietySettings = {
            Code3: comp.SocietyCode3 || SocietyConfig.Code3,
            Code2: comp.SocietyCode2 || SocietyConfig.Code2,
            DefaultAccountNo: comp.DefaultAccountNo || SocietyConfig.DefaultAccountNo,
            DefaultLoanCode: comp.DefaultLoanCode || SocietyConfig.DefaultLoanCode,
            MaxLoanTenorMonths: comp.MaxLoanTenorMonths || SocietyConfig.MaxLoanTenorMonths,
            DefaultInterestRate: comp.DefaultInterestRate || SocietyConfig.DefaultInterestRate,
            MaxPrintRowsPerPage: comp.MaxPrintRowsPerPage || SocietyConfig.MaxPrintRowsPerPage,
            OfficialNameEn: comp.CompanyName || SocietyConfig.OfficialNameEn,
            OfficialNameHi: comp.CompanyNameHindi || SocietyConfig.OfficialNameHi,
            RegdNo: comp.RegistrationNo || SocietyConfig.RegdNo,
            Address: comp.CompanyAddress || SocietyConfig.Address,
            LogoPNG: comp.LogoPNG,
            Logo: comp.Logo,
            Email: comp.Email,
            MobileNo: comp.MobileNo
          };
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(merged));
          } catch { }
          this.settingsSubject.next(merged);
        }
      },
      error: () => {
        // Safe offline mode: SocietyConfig remains active seamlessly
      }
    });
  }

  public refresh(): void {
    try {
      sessionStorage.removeItem(CACHE_KEY);
    } catch { }
    this.loadSettings();
  }
}
