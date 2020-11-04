import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MoneysComponent } from './moneys.component';

describe('MoneysComponent', () => {
  let component: MoneysComponent;
  let fixture: ComponentFixture<MoneysComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MoneysComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MoneysComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
