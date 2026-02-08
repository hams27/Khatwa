import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinancialOverview } from './financial-overview';

describe('FinancialOverview', () => {
  let component: FinancialOverview;
  let fixture: ComponentFixture<FinancialOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinancialOverview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinancialOverview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
