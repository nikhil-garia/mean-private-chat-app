import { FirstCharsPipe } from './first-chars.pipe';

describe('FirstCharsPipe', () => {
  it('create an instance', () => {
    const pipe = new FirstCharsPipe();
    expect(pipe).toBeTruthy();
  });
});
