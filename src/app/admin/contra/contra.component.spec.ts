import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContraComponent } from './contra.component';

describe('ContraComponent', () => {
  let component: ContraComponent;
  let fixture: ComponentFixture<ContraComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ContraComponent]
    });
    fixture = TestBed.createComponent(ContraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
