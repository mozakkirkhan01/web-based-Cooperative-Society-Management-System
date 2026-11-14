import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransferAdviceComponent } from './transfer-advice.component';

describe('TransferAdviceComponent', () => {
  let component: TransferAdviceComponent;
  let fixture: ComponentFixture<TransferAdviceComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TransferAdviceComponent]
    });
    fixture = TestBed.createComponent(TransferAdviceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
