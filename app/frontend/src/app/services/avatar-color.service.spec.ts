import { TestBed } from '@angular/core/testing';

import { AvatarColorService } from './avatar-color.service';

describe('AvatarColorService', () => {
  let service: AvatarColorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AvatarColorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
