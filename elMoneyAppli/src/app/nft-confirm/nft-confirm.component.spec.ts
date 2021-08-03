import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NftConfirmComponent } from './nft-confirm.component';

describe('NftConfirmComponent', () => {
  let component: NftConfirmComponent;
  let fixture: ComponentFixture<NftConfirmComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NftConfirmComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NftConfirmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
