import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewDealerComponent } from './new-dealer.component';

describe('NewDealerComponent', () => {
  let component: NewDealerComponent;
  let fixture: ComponentFixture<NewDealerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NewDealerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NewDealerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
