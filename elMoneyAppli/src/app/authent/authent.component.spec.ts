import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthentComponent } from './authent.component';

describe('AuthentComponent', () => {
  let component: AuthentComponent;
  let fixture: ComponentFixture<AuthentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AuthentComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AuthentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
