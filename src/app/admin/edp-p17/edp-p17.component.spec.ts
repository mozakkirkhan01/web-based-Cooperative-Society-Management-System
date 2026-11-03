import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EdpP17Component } from './edp-p17.component';

describe('EdpP17Component', () => {
  let component: EdpP17Component;
  let fixture: ComponentFixture<EdpP17Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EdpP17Component]
    });
    fixture = TestBed.createComponent(EdpP17Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
