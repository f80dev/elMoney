import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicMinerComponent } from './public-miner.component';

describe('PublicMinerComponent', () => {
  let component: PublicMinerComponent;
  let fixture: ComponentFixture<PublicMinerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PublicMinerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PublicMinerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
