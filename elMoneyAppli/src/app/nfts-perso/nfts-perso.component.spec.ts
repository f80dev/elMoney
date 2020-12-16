import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NftsPersoComponent } from './nfts-perso.component';

describe('NftsPersoComponent', () => {
  let component: NftsPersoComponent;
  let fixture: ComponentFixture<NftsPersoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NftsPersoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NftsPersoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
