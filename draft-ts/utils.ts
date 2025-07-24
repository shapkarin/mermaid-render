/**
 * Functional utility functions for the Mermaid processor
 */

import { createHash } from 'crypto';

/**
 * Pipe function for composing operations
 */
export const pipe = <T>(...fns: Array<(arg: T) => T>) => (value: T): T =>
  fns.reduce((acc, fn) => fn(acc), value);

/**
 * Compose function for right-to-left function composition
 */
export const compose = <T>(...fns: Array<(arg: T) => T>) => (value: T): T =>
  fns.reduceRight((acc, fn) => fn(acc), value);

/**
 * Curry function for partial application
 */
export const curry = <T, U, V>(fn: (a: T, b: U) => V) => (a: T) => (b: U): V => fn(a, b);

/**
 * Maybe monad for handling nullable values
 */
export class Maybe<T> {
  constructor(private value: T | null | undefined) {}

  static of<T>(value: T | null | undefined): Maybe<T> {
    return new Maybe(value);
  }

  static none<T>(): Maybe<T> {
    return new Maybe<T>(null);
  }

  map<U>(fn: (value: T) => U): Maybe<U> {
    return this.value != null ? Maybe.of(fn(this.value)) : Maybe.none<U>();
  }

  flatMap<U>(fn: (value: T) => Maybe<U>): Maybe<U> {
    return this.value != null ? fn(this.value) : Maybe.none<U>();
  }

  filter(predicate: (value: T) => boolean): Maybe<T> {
    return this.value != null && predicate(this.value) ? this : Maybe.none<T>();
  }

  getOrElse(defaultValue: T): T {
    return this.value != null ? this.value : defaultValue;
  }

  isSome(): boolean {
    return this.value != null;
  }

  isNone(): boolean {
    return this.value == null;
  }
}

/**
 * Either monad for error handling
 */
export abstract class Either<L, R> {
  abstract map<U>(fn: (value: R) => U): Either<L, U>;
  abstract flatMap<U>(fn: (value: R) => Either<L, U>): Either<L, U>;
  abstract fold<U>(leftFn: (left: L) => U, rightFn: (right: R) => U): U;
  abstract isLeft(): boolean;
  abstract isRight(): boolean;
}

export class Left<L, R> extends Either<L, R> {
  constructor(private value: L) {
    super();
  }

  map<U>(_fn: (value: R) => U): Either<L, U> {
    return new Left<L, U>(this.value);
  }

  flatMap<U>(_fn: (value: R) => Either<L, U>): Either<L, U> {
    return new Left<L, U>(this.value);
  }

  fold<U>(leftFn: (left: L) => U, _rightFn: (right: R) => U): U {
    return leftFn(this.value);
  }

  isLeft(): boolean {
    return true;
  }

  isRight(): boolean {
    return false;
  }
}

export class Right<L, R> extends Either<L, R> {
  constructor(private value: R) {
    super();
  }

  map<U>(fn: (value: R) => U): Either<L, U> {
    return new Right<L, U>(fn(this.value));
  }

  flatMap<U>(fn: (value: R) => Either<L, U>): Either<L, U> {
    return fn(this.value);
  }

  fold<U>(_leftFn: (left: L) => U, rightFn: (right: R) => U): U {
    return rightFn(this.value);
  }

  isLeft(): boolean {
    return false;
  }

  isRight(): boolean {
    return true;
  }
}

/**
 * Create hash from string content
 */
export const createContentHash = (content: string): string =>
  createHash('sha256').update(content).digest('hex');

/**
 * Safe JSON parse that returns Maybe
 */
export const safeJsonParse = <T>(json: string): Maybe<T> => {
  try {
    return Maybe.of(JSON.parse(json));
  } catch {
    return Maybe.none<T>();
  }
};

/**
 * Async pipe for Promise-based operations
 */
export const asyncPipe = <T>(...fns: Array<(arg: T) => Promise<T>>) => 
  async (value: T): Promise<T> => {
    let result = value;
    for (const fn of fns) {
      result = await fn(result);
    }
    return result;
  };