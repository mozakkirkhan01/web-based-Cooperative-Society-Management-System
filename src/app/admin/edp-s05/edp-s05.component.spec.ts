import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EdpS05Component } from './edp-s05.component';

describe('EdpS05Component', () => {
  let component: EdpS05Component;
  let fixture: ComponentFixture<EdpS05Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EdpS05Component]
    });
    fixture = TestBed.createComponent(EdpS05Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
