import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EdpS06Component } from './edp-s06.component';

describe('EdpS06Component', () => {
  let component: EdpS06Component;
  let fixture: ComponentFixture<EdpS06Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EdpS06Component]
    });
    fixture = TestBed.createComponent(EdpS06Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
