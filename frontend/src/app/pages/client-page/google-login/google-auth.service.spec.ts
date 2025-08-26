import { TestBed } from '@angular/core/testing';

import { ClientGoogleAuthService } from './google-auth.service';

describe('ClientGoogleAuthService', () => {
  let service: ClientGoogleAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ClientGoogleAuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
