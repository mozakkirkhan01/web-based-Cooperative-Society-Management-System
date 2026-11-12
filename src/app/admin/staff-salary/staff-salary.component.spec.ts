import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaffSalaryComponent } from './staff-salary.component';

describe('StaffSalaryComponent', () => {
  let component: StaffSalaryComponent;
  let fixture: ComponentFixture<StaffSalaryComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [StaffSalaryComponent]
    });
    fixture = TestBed.createComponent(StaffSalaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
