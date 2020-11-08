import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ElrondAddrComponent } from './elrond-addr.component';

describe('ElrondAddrComponent', () => {
  let component: ElrondAddrComponent;
  let fixture: ComponentFixture<ElrondAddrComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ElrondAddrComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ElrondAddrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
