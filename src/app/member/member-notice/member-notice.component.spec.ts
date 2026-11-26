import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberNoticeComponent } from './member-notice.component';

describe('MemberNoticeComponent', () => {
  let component: MemberNoticeComponent;
  let fixture: ComponentFixture<MemberNoticeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MemberNoticeComponent]
    });
    fixture = TestBed.createComponent(MemberNoticeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
