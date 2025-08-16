import { FakerImagePipe } from './faker-image.pipe';

describe('FakerImagePipe', () => {
  it('create an instance', () => {
    const pipe = new FakerImagePipe();
    expect(pipe).toBeTruthy();
  });
});
