import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoticeMasterComponent } from './notice-master.component';

describe('NoticeMasterComponent', () => {
  let component: NoticeMasterComponent;
  let fixture: ComponentFixture<NoticeMasterComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [NoticeMasterComponent]
    });
    fixture = TestBed.createComponent(NoticeMasterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
