import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NftStoreComponent } from './nft-store.component';

describe('NftStoreComponent', () => {
  let component: NftStoreComponent;
  let fixture: ComponentFixture<NftStoreComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NftStoreComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NftStoreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
