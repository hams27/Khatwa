import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Community } from './community';

describe('Community', () => {
  let component: Community;
  let fixture: ComponentFixture<Community>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Community]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Community);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
