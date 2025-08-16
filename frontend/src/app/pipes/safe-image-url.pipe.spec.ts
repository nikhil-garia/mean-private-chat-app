import { SafeImageUrlPipe } from './safe-image-url.pipe';

describe('SafeImageUrlPipe', () => {
  it('create an instance', () => {
    const pipe = new SafeImageUrlPipe();
    expect(pipe).toBeTruthy();
  });
});
