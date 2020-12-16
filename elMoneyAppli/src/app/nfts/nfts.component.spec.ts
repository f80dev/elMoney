import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NftsComponent } from './nfts.component';

describe('NftsComponent', () => {
  let component: NftsComponent;
  let fixture: ComponentFixture<NftsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NftsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NftsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
