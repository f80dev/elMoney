import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelDealerComponent } from './sel-dealer.component';

describe('SelDealerComponent', () => {
  let component: SelDealerComponent;
  let fixture: ComponentFixture<SelDealerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SelDealerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SelDealerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
