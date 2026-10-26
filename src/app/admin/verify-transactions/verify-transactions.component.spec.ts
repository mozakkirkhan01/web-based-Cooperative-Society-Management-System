import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerifyTransactionsComponent } from './verify-transactions.component';

describe('VerifyTransactionsComponent', () => {
  let component: VerifyTransactionsComponent;
  let fixture: ComponentFixture<VerifyTransactionsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [VerifyTransactionsComponent]
    });
    fixture = TestBed.createComponent(VerifyTransactionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
