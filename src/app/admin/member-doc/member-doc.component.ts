import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../utils/app.service';
import { ConstantData } from '../../utils/constant-data';
import { LoadDataService } from '../../utils/load-data.service';
import { Status, MemberType, Gender, NomineeRelation, PsuUnit } from '../../utils/enum';
import { ActionModel, RequestModel, StaffLoginModel } from '../../utils/interface';
import { LocalService } from '../../utils/local.service';
import { Router } from '@angular/router';
declare var $: any;
@Component({
  selector: 'app-member-doc',
  templateUrl: './member-doc.component.html',
  styleUrls: ['./member-doc.component.css']
})
export class MemberDocComponent {
  dataLoading: boolean = false
  MemberDocList: any = []
  MemberDoc: any = {}
  MemberList: any = []
  MemberImageList: any = []
  isSubmitted = false
  StatusList = this.loadData.GetEnumList(Status);
  PsuUnitList = this.loadData.GetEnumList(PsuUnit);
  PageSize = ConstantData.PageSizes;
  p: number = 1;
  Search: string = '';
  reverse: boolean = false;
  sortKey: string = '';
  itemPerPage: number = this.PageSize[0];
  action: ActionModel = {} as ActionModel;
  staffLogin: StaffLoginModel = {} as StaffLoginModel;
  AllStatusList = Status;
  AllNomineeRelationList = NomineeRelation;
  AllGenderList = Gender;
  AllMemberTypeList = MemberType;
  AllPsuUnitList = PsuUnit;
  selectedMember: any = {};
  constructor(
    private service: AppService,
    private toastr: ToastrService,
    private loadData: LoadDataService,
    private localService: LocalService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.staffLogin = this.localService.getEmployeeDetail();
    this.validiateMenu();
    this.getMemberImageList();
    this.resetForm();
    this.getMemberList();

  }

  validiateMenu() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ Url: this.router.url, StaffLoginId: this.staffLogin.StaffLoginId })).toString()
    }
    this.dataLoading = true
    this.service.validiateMenu(obj).subscribe((response: any) => {
      this.action = this.loadData.validiateMenu(response, this.toastr, this.router)
      this.dataLoading = false;
    }, (err => {
      this.toastr.error("Error while fetching records")
      this.dataLoading = false;
    }))
  }

  @ViewChild('formMemberDoc') formMemberDoc: NgForm;
  resetForm() {
    this.MemberDoc = {}
    this.MemberDoc.MemberId = 0;
    this.MemberDoc.MembershipFormPhoto = '/assets/img/no-image.jpg';
    this.MemberDoc.MemberPhotoPhoto = '/assets/img/no-image.jpg';
    this.MemberDoc.MemberSignaturePhoto = '/assets/img/no-image.jpg';
    this.MemberDoc.SpicemenSignatureCardPhoto = '/assets/img/no-image.jpg';
    this.MemberDoc.LoanApplicationFormPhoto = '/assets/img/no-image.jpg';
    this.MemberDoc.KYCFormPhoto = '/assets/img/no-image.jpg';
    this.MemberDoc.CancelChequePhoto = '/assets/img/no-image.jpg';
    this.MemberDoc.NomineePhotoPhoto = '/assets/img/no-image.jpg';

    this.isSubmitted = false;
    this.MemberDoc.MemberName = '';
    if (this.formMemberDoc) {
      this.formMemberDoc.control.markAsPristine();
      this.formMemberDoc.control.markAsUntouched();
    }
    this.isSubmitted = false
    this.MemberDoc.Status = 1
  }

  sort(key: any) {
    this.sortKey = key;
    this.reverse = !this.reverse;
  }

  onTableDataChange(p: any) {
    this.p = p
  }

  //mat auto complete
  AllMemberList: any[] = [];
  filterMemberList(value: any) {
    if (value) {
      const filterValue = value.toLowerCase();
      this.MemberList = this.AllMemberList.filter((option: any) => option.SearchMember.toLowerCase().includes(filterValue));
    } else {
      this.MemberList = this.AllMemberList;
    }
    this.MemberDoc.MemberId = 0;
  }

  clearMember() {

    this.MemberDoc.MemberId = 0;
    this.MemberDoc.MemberName = '';
    this.MemberDoc.MemberImageId = 0;
    // Clear member details
    this.selectedMember = {};
    this.MemberDoc.MembershipFormName = '';
    this.MemberDoc.MembershipForm = '';
    this.MemberDoc.MemberPhotoName = '';
    this.MemberDoc.MemberPhoto = '';
    this.MemberDoc.MemberSignatureName = '';
    this.MemberDoc.MemberSignature = '';
    this.MemberDoc.SpicemenSignatureCardName = '';
    this.MemberDoc.SpicemenSignatureCard = '';
    this.MemberDoc.LoanApplicationFormName = '';
    this.MemberDoc.LoanApplicationForm = '';
    this.MemberDoc.KYCFormName = '';
    this.MemberDoc.KYCForm = '';
    this.MemberDoc.CancelChequeName = '';
    this.MemberDoc.CancelCheque = '';
    this.MemberDoc.NomineePhotoName = '';
    this.MemberDoc.NomineePhoto = '';

    this.MemberDoc.MembershipFormName = '';
    this.MemberDoc.MembershipForm = '';
    this.MemberDoc.MemberPhotoName = '';
    this.MemberDoc.MemberPhoto = '';
    this.MemberDoc.MemberSignatureName = '';
    this.MemberDoc.MemberSignature = '';
    this.MemberDoc.SpicemenSignatureCardName = '';
    this.MemberDoc.SpicemenSignatureCard = '';
    this.MemberDoc.LoanApplicationFormName = '';
    this.MemberDoc.LoanApplicationForm = '';
    this.MemberDoc.KYCFormName = '';
    this.MemberDoc.KYCForm = '';
    this.MemberDoc.CancelChequeName = '';
    this.MemberDoc.CancelCheque = '';
    this.MemberDoc.NomineePhotoName = '';
    this.MemberDoc.NomineePhoto = '';

    this.MembershipFormPhoto = '/assets/img/no-image.jpg';
    this.MemberPhotoPhoto = '/assets/img/no-image.jpg';
    this.MemberSignaturePhoto = '/assets/img/no-image.jpg';
    this.SpicemenSignatureCardPhoto = '/assets/img/no-image.jpg';
    this.LoanApplicationFormPhoto = '/assets/img/no-image.jpg';
    this.KYCFormPhoto = '/assets/img/no-image.jpg';
    this.CancelChequePhoto = '/assets/img/no-image.jpg';
    this.NomineePhotoPhoto = '/assets/img/no-image.jpg';
    this.filterMemberList('');
  }

  getMemberList() {
    var obj: RequestModel = {
      request: this.localService.encrypt(JSON.stringify({ Status: Status.Active })).toString()
    }
    this.dataLoading = true
    this.service.getMemberList(obj).subscribe(r1 => {
      let response = r1 as any
      if (response.Message == ConstantData.SuccessMessage) {
        this.AllMemberList = response.MemberList;
        this.AllMemberList.map(x1 => x1.SearchMember = `${x1.MemberName} - ${x1.MemberNo} - ${x1.StaffNo}- ${x1.SailPersonalNo}`);
        this.MemberList = this.AllMemberList;
      } else {
        this.toastr.error(response.Message)
      }
      this.dataLoading = false
    }, (err => {
      this.toastr.error("Error while fetching records")
      this.dataLoading = false;
    }))
  }
  clearCustomer() {
    this.MemberList = this.AllMemberList;
    this.MemberDoc.MemberId = null;
    this.MemberDoc = {};
  }

  afterMemberSelected(event: any) {
    this.MemberDoc.MemberId = event.option.id;
    this.MemberDoc.MemberName = event.option.value;
    const member = this.MemberList.find(
      (x: any) => x.MemberId == this.MemberDoc.MemberId
    );
    if (member) {
      this.MemberDoc.MemberName = member.SearchMember;
      this.selectedMember = member;
    }
    this.getMemberImageByMemberId();
  }
  // afterMemberSelected(event: any) {
  //   this.MemberDoc.MemberId = event.option.id;
  //   this.MemberDoc.MemberName = event.option.value;
  //   this.getMemberImageByMemberId();
  // }

  imageUrl = ConstantData.getBaseUrl();
  MembershipFormPhoto: any;
  MemberPhotoPhoto: any;
  MemberSignaturePhoto: any;
  SpicemenSignatureCardPhoto: any;
  LoanApplicationFormPhoto: any;
  KYCFormPhoto: any;
  CancelChequePhoto: any;
  NomineePhotoPhoto: any;



  setMembershipForm(event: any) {
    var file: File = event.target.files[0];
    if (!file) return;
    if (!ConstantData.allowedFileTypes.includes(file.type)) {
      this.toastr.error("Invalid file format !!");
      return;
    }
    if (file.size < 512000) {
      this.MemberDoc.MembershipFormName = file.name;
      this.MemberDoc.FileFormat =
        ConstantData.getFileExtension(file.name);
      var reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e: any) => {
        var dataUrl = e.target.result;
        var base64Data =
          dataUrl.split('base64,')[1];
        this.MemberDoc.MembershipForm =
          base64Data;
        this.MembershipFormPhoto = dataUrl;
      };
    } else {
      this.toastr.error(
        "File size should be less than 500 KB."
      );
    }

  }

  setMemberPhoto(event: any) {
    var file: File = event.target.files[0];
    if (!file) return;
    if (!ConstantData.allowedFileTypes.includes(file.type)) {
      this.toastr.error("Invalid file format !!");
      return;
    }
    if (file.size < 512000) {
      this.MemberDoc.MemberPhotoName = file.name;
      this.MemberDoc.FileFormat =
        ConstantData.getFileExtension(file.name);
      var reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e: any) => {
        var dataUrl = e.target.result;
        var base64Data =
          dataUrl.split('base64,')[1];
        this.MemberDoc.MemberPhoto =
          base64Data;
        this.MemberPhotoPhoto = dataUrl;
      };
    } else {
      this.toastr.error(
        "File size should be less than 500 KB."
      );
    }
  }

  setMemberSignature(event: any) {
    var file: File = event.target.files[0];
    if (!file) return;
    if (!ConstantData.allowedFileTypes.includes(file.type)) {
      this.toastr.error("Invalid file format !!");
      return;
    }
    if (file.size < 512000) {
      this.MemberDoc.MemberSignatureName = file.name;
      this.MemberDoc.FileFormat =
        ConstantData.getFileExtension(file.name);
      var reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e: any) => {
        var dataUrl = e.target.result;
        var base64Data =
          dataUrl.split('base64,')[1];
        this.MemberDoc.MemberSignature =
          base64Data;
        this.MemberSignaturePhoto = dataUrl;
      };
    } else {
      this.toastr.error(
        "File size should be less than 500 KB."
      );
    }
  }

  setSpicemenSignatureCard(event: any) {
    var file: File = event.target.files[0];
    if (!file) return;
    if (!ConstantData.allowedFileTypes.includes(file.type)) {
      this.toastr.error("Invalid file format !!");
      return;
    }
    if (file.size < 512000) {
      this.MemberDoc.SpicemenSignatureCardName = file.name;
      this.MemberDoc.FileFormat =
        ConstantData.getFileExtension(file.name);
      var reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e: any) => {
        var dataUrl = e.target.result;
        var base64Data =
          dataUrl.split('base64,')[1];
        this.MemberDoc.SpicemenSignatureCard =
          base64Data;
        this.SpicemenSignatureCardPhoto = dataUrl;
      };
    } else {
      this.toastr.error(
        "File size should be less than 500 KB."
      );
    }
  }
  setLoanApplicationForm(event: any) {
    var file: File = event.target.files[0];
    if (!file) return;
    if (!ConstantData.allowedFileTypes.includes(file.type)) {
      this.toastr.error("Invalid file format !!");
      return;
    }
    if (file.size < 512000) {
      this.MemberDoc.LoanApplicationFormName = file.name;
      this.MemberDoc.FileFormat =
        ConstantData.getFileExtension(file.name);
      var reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e: any) => {
        var dataUrl = e.target.result;
        var base64Data =
          dataUrl.split('base64,')[1];
        this.MemberDoc.LoanApplicationForm =
          base64Data;
        this.LoanApplicationFormPhoto = dataUrl;
      };
    } else {
      this.toastr.error(
        "File size should be less than 500 KB."
      );
    }
  }
  setKYCForm(event: any) {
    var file: File = event.target.files[0];
    if (!file) return;
    if (!ConstantData.allowedFileTypes.includes(file.type)) {
      this.toastr.error("Invalid file format !!");
      return;
    }
    if (file.size < 512000) {
      this.MemberDoc.KYCFormName = file.name;
      this.MemberDoc.FileFormat =
        ConstantData.getFileExtension(file.name);
      var reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e: any) => {
        var dataUrl = e.target.result;
        var base64Data =
          dataUrl.split('base64,')[1];
        this.MemberDoc.KYCForm =
          base64Data;
        this.KYCFormPhoto = dataUrl;
      };
    } else {
      this.toastr.error(
        "File size should be less than 500 KB."
      );
    }
  }
  setCancelCheque(event: any) {
    var file: File = event.target.files[0];
    if (!file) return;
    if (!ConstantData.allowedFileTypes.includes(file.type)) {
      this.toastr.error("Invalid file format !!");
      return;
    }
    if (file.size < 512000) {
      this.MemberDoc.CancelChequeName = file.name;
      this.MemberDoc.FileFormat =
        ConstantData.getFileExtension(file.name);
      var reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e: any) => {
        var dataUrl = e.target.result;
        var base64Data =
          dataUrl.split('base64,')[1];
        this.MemberDoc.CancelCheque =
          base64Data;
        this.CancelChequePhoto = dataUrl;
      };
    } else {
      this.toastr.error(
        "File size should be less than 500 KB."
      );
    }
  }
  setNomineePhoto(event: any) {
    var file: File = event.target.files[0];
    if (!file) return;
    if (!ConstantData.allowedFileTypes.includes(file.type)) {
      this.toastr.error("Invalid file format !!");
      return;
    }
    if (file.size < 512000) {
      this.MemberDoc.NomineePhotoName = file.name;
      this.MemberDoc.FileFormat =
        ConstantData.getFileExtension(file.name);
      var reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e: any) => {
        var dataUrl = e.target.result;
        var base64Data =
          dataUrl.split('base64,')[1];
        this.MemberDoc.NomineePhoto =
          base64Data;
        this.NomineePhotoPhoto = dataUrl;
      };
    } else {
      this.toastr.error(
        "File size should be less than 500 KB."
      );
    }
  }

  // loadImages() {
  //   if (this.MemberDoc.MembershipForm) {
  //     this.MembershipFormPhoto =
  //       this.imageUrl + this.MemberDoc.MembershipForm;
  //   }
  //   if (this.MemberDoc.MemberPhoto) {
  //     this.MemberPhotoPhoto =
  //       this.imageUrl + this.MemberDoc.MemberPhoto;
  //   }
  // }

  saveMemberDoc() {
    if (this.dataLoading) return;
    this.isSubmitted = true;
    this.formMemberDoc.control.markAllAsTouched();
    if (this.formMemberDoc.invalid) {
      this.toastr.error("Fill all the required fields !!");
      return;
    }
    this.dataLoading = true;
    if (this.MemberDoc.MemberImageId > 0) {
      this.MemberDoc.UpdatedBy =
        this.staffLogin.StaffLoginId;
    } else {
      this.MemberDoc.CreatedBy =
        this.staffLogin.StaffLoginId;
    }
    const obj: RequestModel = {
      request: this.localService
        .encrypt(JSON.stringify(this.MemberDoc))
        .toString()
    };
    this.service.saveMemberDoc(obj).subscribe({
      next: (res: any) => {
        this.dataLoading = false;
        if (res.Message === ConstantData.SuccessMessage) {
          this.toastr.success("Saved successfully");
          this.resetForm();
          this.getMemberImageList();
        } else {
          this.toastr.error(res.Message);
        }
      },
      error: (err) => {
        this.dataLoading = false;
        this.toastr.error("Server error");
      }
    });
  }

  getMemberImageList() {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({
          MemberImageId: this.MemberDoc.MemberImageId
        })
      ).toString()
    };
    this.service.getMemberImageList(obj)
      .subscribe({
        next: (res: any) => {
          if (res.Message == ConstantData.SuccessMessage) {
            if (res.MemberImageList.length > 0) {
              this.MemberDoc = res.MemberImageList[0];
              if (this.MemberDoc.MembershipForm) {
                this.MembershipFormPhoto =
                  this.imageUrl + this.MemberDoc.MembershipForm;
              } else {
                this.MembershipFormPhoto = '/assets/img/no-image.jpg';
              }

              if (this.MemberDoc.MemberPhoto) {
                this.MemberPhotoPhoto =
                  this.imageUrl + this.MemberDoc.MemberPhoto;
              } else {
                this.MemberPhotoPhoto = '/assets/img/no-image.jpg';
              }

              if (this.MemberDoc.MemberSignature) {
                this.MemberSignaturePhoto =
                  this.imageUrl + this.MemberDoc.MemberSignature;
              } else {
                this.MemberSignaturePhoto = '/assets/img/no-image.jpg';
              }

              if (this.MemberDoc.SpicemenSignatureCard) {
                this.SpicemenSignatureCardPhoto =
                  this.imageUrl + this.MemberDoc.SpicemenSignatureCard;
              } else {
                this.SpicemenSignatureCardPhoto = '/assets/img/no-image.jpg';
              }

              if (this.MemberDoc.LoanApplicationForm) {
                this.LoanApplicationFormPhoto =
                  this.imageUrl + this.MemberDoc.LoanApplicationForm;
              } else {
                this.LoanApplicationFormPhoto = '/assets/img/no-image.jpg';
              }

              if (this.MemberDoc.KYCForm) {
                this.KYCFormPhoto =
                  this.imageUrl + this.MemberDoc.KYCForm;
              } else {
                this.KYCFormPhoto = '/assets/img/no-image.jpg';
              }

              if (this.MemberDoc.CancelCheque) {
                this.CancelChequePhoto =
                  this.imageUrl + this.MemberDoc.CancelCheque;
              } else {
                this.CancelChequePhoto = '/assets/img/no-image.jpg';
              }

              if (this.MemberDoc.NomineePhoto) {
                this.NomineePhotoPhoto =
                  this.imageUrl + this.MemberDoc.NomineePhoto;
              } else {
                this.NomineePhotoPhoto = '/assets/img/no-image.jpg';
              }

            }
          } else {
            this.toastr.error(res.Message);
          }
        },
        error: (err: any) => {
          this.toastr.error("Server error");
        }
      });
  }
  getMemberImageByMemberId() {
    const obj: RequestModel = {
      request: this.localService.encrypt(
        JSON.stringify({
          MemberId: this.MemberDoc.MemberId
        })
      ).toString()
    };
    this.service.getMemberImageList(obj)
      .subscribe({
        next: (res: any) => {
          if (res.Message === ConstantData.SuccessMessage) {
            if (res.MemberImageList.length > 0) {
              const data = res.MemberImageList[0];
              this.MemberDoc.MemberImageId = data.MemberImageId;
              this.MemberDoc.MembershipForm = data.MembershipForm;
              this.MemberDoc.MemberPhoto = data.MemberPhoto;
              this.MemberDoc.MemberSignature = data.MemberSignature;
              this.MemberDoc.SpicemenSignatureCard = data.SpicemenSignatureCard;
              this.MemberDoc.LoanApplicationForm = data.LoanApplicationForm;
              this.MemberDoc.KYCForm = data.KYCForm;
              this.MemberDoc.CancelCheque = data.CancelCheque;
              this.MemberDoc.NomineePhoto = data.NomineePhoto;

              this.MembershipFormPhoto = data.MembershipForm ? this.imageUrl + data.MembershipForm : '/assets/img/no-image.jpg';
              this.MemberPhotoPhoto = data.MemberPhoto ? this.imageUrl + data.MemberPhoto : '/assets/img/no-image.jpg';
              this.MemberSignaturePhoto = data.MemberSignature ? this.imageUrl + data.MemberSignature : '/assets/img/no-image.jpg';
              this.SpicemenSignatureCardPhoto = data.SpicemenSignatureCard ? this.imageUrl + data.SpicemenSignatureCard : '/assets/img/no-image.jpg';
              this.LoanApplicationFormPhoto = data.LoanApplicationForm ? this.imageUrl + data.LoanApplicationForm : '/assets/img/no-image.jpg';
              this.KYCFormPhoto = data.KYCForm ? this.imageUrl + data.KYCForm : '/assets/img/no-image.jpg';
              this.CancelChequePhoto = data.CancelCheque ? this.imageUrl + data.CancelCheque : '/assets/img/no-image.jpg';
              this.NomineePhotoPhoto = data.NomineePhoto ? this.imageUrl + data.NomineePhoto : '/assets/img/no-image.jpg';
            } else {

              this.MemberDoc.MemberImageId = 0;
              this.MemberDoc.MembershipForm = '';
              this.MemberDoc.MemberPhoto = '';
              this.MemberDoc.MemberSignature = '';
              this.MemberDoc.SpicemenSignatureCard = '';
              this.MemberDoc.LoanApplicationForm = '';
              this.MemberDoc.KYCForm = '';
              this.MemberDoc.CancelCheque = '';
              this.MemberDoc.NomineePhoto = '';

              this.MembershipFormPhoto = '/assets/img/no-image.jpg';
              this.MemberPhotoPhoto = '/assets/img/no-image.jpg';
              this.MemberSignaturePhoto = '/assets/img/no-image.jpg';
              this.SpicemenSignatureCardPhoto = '/assets/img/no-image.jpg';
              this.LoanApplicationFormPhoto = '/assets/img/no-image.jpg';
              this.KYCFormPhoto = '/assets/img/no-image.jpg';
              this.CancelChequePhoto = '/assets/img/no-image.jpg';
              this.NomineePhotoPhoto = '/assets/img/no-image.jpg';
            }
          }
        },
        error: (err: any) => {
          this.toastr.error("Server error");
        }
      });
  }



  selectedImage: any = '';
  isImageOpen = false;
  currentImageIndex = 0;
  allImages: any[] = [];

  openGallery(images: any[], index: number) {
    this.allImages = [
      this.MembershipFormPhoto,
      this.MemberPhotoPhoto,
      this.MemberSignaturePhoto,
      this.SpicemenSignatureCardPhoto,
      this.LoanApplicationFormPhoto,
      this.KYCFormPhoto,
      this.CancelChequePhoto,
      this.NomineePhotoPhoto

    ].filter(x =>
      x &&
      !x.includes('no-image')
    );
    const clickedImage = images[0];
    this.currentImageIndex =
      this.allImages.indexOf(clickedImage);
    if (this.currentImageIndex < 0) {
      this.currentImageIndex = 0;
    }
    this.selectedImage =
      this.allImages[this.currentImageIndex];
    this.isImageOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeImage() {
    this.isImageOpen = false;
    this.selectedImage = '';
    document.body.style.overflow = 'auto';
  }

  previousImage() {
    if (!this.allImages.length) return;
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
    } else {
      this.currentImageIndex =
        this.allImages.length - 1;
    }
    this.selectedImage =
      this.allImages[this.currentImageIndex];
  }

  nextImage() {
    if (!this.allImages.length) return;
    if (this.currentImageIndex <
      this.allImages.length - 1) {
      this.currentImageIndex++;
    } else {
      this.currentImageIndex = 0;
    }
    this.selectedImage =
      this.allImages[this.currentImageIndex];
  }


  deleteMemberDoc(obj: any) {
    if (confirm("Are your sure you want to delete this recored")) {
      var request: RequestModel = {
        request: this.localService.encrypt(JSON.stringify(obj)).toString()
      }
      this.dataLoading = true
      this.service.deleteMemberDoc(request).subscribe(r1 => {
        let response = r1 as any
        if (response.Message == ConstantData.SuccessMessage) {
          this.toastr.success("Record Deleted successfully")
          this.getMemberImageList()
        } else {
          this.toastr.error(response.Message)
          this.dataLoading = false
        }
      }, (err => {
        this.toastr.error("Error occured while deleteing the recored")
        this.dataLoading = false
      }))
    }
  }

  editMemberDoc(obj: any) {
    this.resetForm()
    this.MemberDoc = obj
  }
}
