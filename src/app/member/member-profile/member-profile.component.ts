import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ConstantData } from '../../utils/constant-data';
import { Gender, NomineeRelation, PsuUnit } from '../../utils/enum';
import { MemberPortalService } from '../services/member-portal.service';

@Component({
  selector: 'app-member-profile',
  templateUrl: './member-profile.component.html',
  styleUrls: ['./member-profile.component.css']
})
export class MemberProfileComponent implements OnInit {
  isLoading: boolean = false;
  errorMessage: string = '';

  profile: any = null;
  helpdesk: any = null;

  imageUrl: string = ConstantData.getBaseUrl();
  noImageUrl: string = ConstantData.getNoImage();

  constructor(
    private memberService: MemberPortalService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.memberService.getMyProfile().subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res && res.Message === ConstantData.SuccessMessage && res.Profile) {
          this.profile = res.Profile;
          this.helpdesk = res.SocietyHelpdesk || null;
        } else {
          this.errorMessage = (res && res.Message) ? res.Message : 'Unable to load profile details.';
          this.toastr.error(this.errorMessage);
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.Message || 'Failed to load profile.';
        this.toastr.error(this.errorMessage);
      }
    });
  }

  getPhotoUrl(): string {
    if (this.profile && this.profile.MemberPhoto) {
      return this.imageUrl + this.profile.MemberPhoto;
    }
    return this.noImageUrl;
  }

  onPhotoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && img.src !== this.noImageUrl) {
      img.src = this.noImageUrl;
    }
  }

  getGenderLabel(val: number): string {
    return val ? (Gender[val] || 'N/A') : 'N/A';
  }

  getPsuUnitLabel(val: number): string {
    if (!val) return 'SAIL';
    return (PsuUnit[val] || 'SAIL').toUpperCase();
  }

  getNomineeRelationLabel(val: number): string {
    return val ? (NomineeRelation[val] || 'N/A') : 'N/A';
  }
}
