import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NftBuyComponent } from './nft-buy.component';

describe('NftBuyComponent', () => {
  let component: NftBuyComponent;
  let fixture: ComponentFixture<NftBuyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NftBuyComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NftBuyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
