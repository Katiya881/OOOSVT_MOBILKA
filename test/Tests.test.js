describe('Fake Tests', () => {
  test('Fake Test 1: Always passes', () => {
    expect(true).toBe(true);
  });

  test('Fake Test 2: Number comparison', () => {
    const value = 2 + 2;
    expect(value).toBe(4);
  });

  test('Fake Test 3: String check', () => {
    const greeting = 'Hello, Jest!';
    expect(greeting).toEqual('Hello, Jest!');
  });
});