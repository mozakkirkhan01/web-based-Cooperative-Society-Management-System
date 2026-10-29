import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanApplicationComponent } from './loan-application.component';

describe('LoanApplicationComponent', () => {
  let component: LoanApplicationComponent;
  let fixture: ComponentFixture<LoanApplicationComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LoanApplicationComponent]
    });
    fixture = TestBed.createComponent(LoanApplicationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
