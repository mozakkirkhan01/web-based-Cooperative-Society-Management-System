import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RtgsNeftAdviceComponent } from './rtgs-neft-advice.component';

describe('RtgsNeftAdviceComponent', () => {
  let component: RtgsNeftAdviceComponent;
  let fixture: ComponentFixture<RtgsNeftAdviceComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RtgsNeftAdviceComponent]
    });
    fixture = TestBed.createComponent(RtgsNeftAdviceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
