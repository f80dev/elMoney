import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SavekeyComponent } from './savekey.component';

describe('SavekeyComponent', () => {
  let component: SavekeyComponent;
  let fixture: ComponentFixture<SavekeyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SavekeyComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SavekeyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
