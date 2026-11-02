import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeadBookComponent } from './head-book.component';

describe('HeadBookComponent', () => {
  let component: HeadBookComponent;
  let fixture: ComponentFixture<HeadBookComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [HeadBookComponent]
    });
    fixture = TestBed.createComponent(HeadBookComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
