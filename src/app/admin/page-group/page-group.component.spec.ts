import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageGroupComponent } from './page-group.component';

describe('PageGroupComponent', () => {
  let component: PageGroupComponent;
  let fixture: ComponentFixture<PageGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PageGroupComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PageGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
