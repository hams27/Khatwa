import { TestBed } from '@angular/core/testing';

import { Marketing } from './marketing';

describe('Marketing', () => {
  let service: Marketing;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Marketing);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
