import { escapeLikeWildcards } from './string.utils';

describe('escapeLikeWildcards', () => {
  it('leaves a plain term unchanged', () => {
    expect(escapeLikeWildcards('amina')).toBe('amina');
  });

  it('escapes % so it matches a literal percent sign', () => {
    expect(escapeLikeWildcards('50%off')).toBe('50\\%off');
  });

  it('escapes _ so it matches a literal underscore', () => {
    expect(escapeLikeWildcards('a_b')).toBe('a\\_b');
  });

  it('escapes a literal backslash first so it is not double-escaped', () => {
    expect(escapeLikeWildcards('a\\b')).toBe('a\\\\b');
  });

  it('escapes multiple wildcards in the same term', () => {
    expect(escapeLikeWildcards('50%_off')).toBe('50\\%\\_off');
  });
});
