import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoticeCategoryComponent } from './notice-category.component';

describe('NoticeCategoryComponent', () => {
  let component: NoticeCategoryComponent;
  let fixture: ComponentFixture<NoticeCategoryComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [NoticeCategoryComponent]
    });
    fixture = TestBed.createComponent(NoticeCategoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
