import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MinicontactsComponent } from './minicontacts.component';

describe('MinicontactsComponent', () => {
  let component: MinicontactsComponent;
  let fixture: ComponentFixture<MinicontactsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MinicontactsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MinicontactsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
