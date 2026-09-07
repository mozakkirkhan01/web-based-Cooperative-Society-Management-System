import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberDocComponent } from './member-doc.component';

describe('MemberDocComponent', () => {
  let component: MemberDocComponent;
  let fixture: ComponentFixture<MemberDocComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MemberDocComponent]
    });
    fixture = TestBed.createComponent(MemberDocComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
