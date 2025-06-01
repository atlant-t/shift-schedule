import { beforeEach, describe, it, TestContext } from 'node:test';
import { LineMap } from './linemap';
import { AssertionError, deepStrictEqual, ifError, ok, strictEqual } from 'node:assert';

describe('LineMap', () => {
  it('should have zero size for new object', () => {
    const linemap = new LineMap();
    strictEqual(linemap.size, 0);
  });

  it('should be iterable', () => {
    const linemap = new LineMap();
    assertProperty(linemap, Symbol.iterator, 'LineMap has Symbol.iterator');
    const generator = linemap[Symbol.iterator]();
    ok(generator);
    assertProperty(generator, 'next', 'LineMap generator has \'next\'');
    ok(typeof generator['next'] === 'function', 'LineMap generator has \'next\' method');
  });

  it('should be able to insert value with number key (there is no error when inserting)', (t) => {
    const linemap = new LineMap<number>();
    linemap.set(1, 10, 20);
    linemap.set(2, 30, 40);
    linemap.set(3, 15, 35);
  });

  it('should be able to insert value with string key (there is no error when inserting)', () => {
    const linemap = new LineMap<string>();
    linemap.set('one', 10, 20);
    linemap.set('two', 30, 40);
    linemap.set('three', 15, 35);
  });

  it('should be able to insert value with symbol key (there is no error when inserting)', () => {
    const firstSymbol = Symbol('Custom symbol');
    const secondSymbol = Symbol('Second symbol');
    const thirdSymbol = Symbol('Third symbol');

    const linemap = new LineMap<symbol>();
    linemap.set(firstSymbol, 10, 20);
    linemap.set(secondSymbol, 30, 40);
    linemap.set(thirdSymbol, 15, 35);
  });

  it('should be able to insert value with object key (there is no error when inserting)', () => {
    const firstObject = { 'name': 'First object' };
    const secondObject = { 'name': 'Second object' };
    const thirdObject = { 'name': 'Third object' };

    const linemap = new LineMap<object>();
    linemap.set(firstObject, 10, 20);
    linemap.set(secondObject, 30, 40);
    linemap.set(thirdObject, 15, 35);
  });

  it('should increase the size by one after each item is added', () => {
    const linemap = new LineMap<string>();

    strictEqual(linemap.size, 0, 'Initial value should be 0');

    linemap.set('one', 10, 20);
    strictEqual(linemap.size, 1, 'Size should be 1 when the first item is added');

    linemap.set('two', 30, 40);
    strictEqual(linemap.size, 2, 'Size should be 2 when the second item is added');

    linemap.set('three', 15, 35);
    strictEqual(linemap.size, 3, 'Size should be 3 when the third item is added');
  });

  it('should indicate that a key is added', () => {
    const linemap = new LineMap<string>();

    strictEqual(linemap.has('one'), false, 'Result for the first item should be false when no one item is added');
    strictEqual(linemap.has('two'), false, 'Result for the second item should be false when no one item is added');

    linemap.set('one', 10, 20);
    strictEqual(linemap.has('one'), true, 'Result for the first item should be true when it is added');
    strictEqual(linemap.has('two'), false, 'Result for the second item should be false when only the first item is added');

    linemap.set('two', 30, 40);
    strictEqual(linemap.has('one'), true, 'Result for first item should be true when the second item is added');
    strictEqual(linemap.has('two'), true, 'Result for second item should be true when it is item is added');
  });

  it('should indicate that a range is fielled', () => {
    const linemap = new LineMap<string>();

    strictEqual(linemap.filled(10, 20), false, 'Result for the first item range should be false when no one item is added');
    strictEqual(linemap.filled(30, 40), false, 'Result for the second item range should be false when no one item is added');
    strictEqual(linemap.filled(20, 30), false, 'Result for space between items should be false when no one item is added');

    linemap.set('one', 10, 20);
    strictEqual(linemap.filled(10, 20), true, 'Result for the first item should be true when it is added');
    strictEqual(linemap.filled(30, 40), false, 'Result for the second item should be false when only the first item is added');
    strictEqual(linemap.filled(20, 30), false, 'Result for space between items should be false when only the first item is added');

    linemap.set('two', 30, 40);
    strictEqual(linemap.filled(10, 20), true, 'Result for first item should be true when the second item is added');
    strictEqual(linemap.filled(30, 40), true, 'Result for second item should be true when it is item is added');
    strictEqual(linemap.filled(20, 30), false, 'Result for space between items should be false when both items are added');
  });

  it('should return range for added item', () => {
    const linemap = new LineMap<string>();

    linemap.set('one', 10, 20);
    deepStrictEqual(linemap.getRange('one'), { start: 10, end: 20 }, 'First item range should not be changed when it is added only');

    linemap.set('two', 30, 40);
    deepStrictEqual(linemap.getRange('one'), { start: 10, end: 20 }, 'First item range should not be changed when second item is added');
    deepStrictEqual(linemap.getRange('one'), { start: 10, end: 20 }, 'Second item range should not be changed when it is added only');

    linemap.set('three', 15, 35);
    deepStrictEqual(linemap.getRange('one'), { start: 10, end: 20 }, 'First item range should not be changed when second item is added');
    deepStrictEqual(linemap.getRange('one'), { start: 10, end: 20 }, 'Second item range should not be changed when third item is added');
    deepStrictEqual(linemap.getRange('one'), { start: 10, end: 20 }, 'Third item range should be not changed when it is added only');
  });

  it('should return all items on the requested range', () => {
    const linemap = new LineMap<string>();
    linemap.set('one', 10, 20);
    linemap.set('two', 30, 40);
    linemap.set('three', 15, 35);

    deepStrictEqual(linemap.getKeys(11, 14).sort(), ['one'].sort(), 'Result should contain correct items for the range where one item is set');
    deepStrictEqual(linemap.getKeys(16, 19).sort(), ['one', 'three'].sort(), 'Result should contain correct items for the range where two items is set');
    deepStrictEqual(linemap.getKeys(10, 35).sort(), ['one', 'two', 'three'].sort(), 'Result should contain correct items for the entire filled range');

    deepStrictEqual(linemap.getKeys(12).sort(), ['one'].sort(), 'Result should contain correct items for the point where one item is set');
    deepStrictEqual(linemap.getKeys(17).sort(), ['one', 'three'].sort(), 'Result should contain correct items for the point where two items is set');
  });

  it('should be able to remove item', () => {
    const linemap = new LineMap<string>();
    linemap.set('one', 10, 20);

    linemap.remove('one');
    strictEqual(linemap.has('one'), false, 'Check if the item is added should be false');
    strictEqual(linemap.size, 0, 'Size should be 0 after removing a single element');
    deepStrictEqual(linemap.getKeys(10, 20), [], 'Keys result should empty after removing single element');
    ifError(linemap.getRange('one')); // Range result should be empty after removing single element
  });
});

function assertProperty<T extends object, K extends string | symbol>(obj: T, propertyName: K, message?: string): asserts obj is T & { [P in K]: any } {
  if (propertyName in obj === false) {
    throw new AssertionError({
      message: message ?? `Expected property '${propertyName.toString()}' in object '${obj}'`,
      expected: propertyName.toString(),
      operator: assertProperty.name
    });
  }
}

