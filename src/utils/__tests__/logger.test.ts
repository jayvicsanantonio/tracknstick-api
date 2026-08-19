// Tests the logger's level gate and child inheritance
// The previous gate read process.env.NODE_ENV, which Workers never defines

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '../logger.js';

describe('Logger', () => {
  let debugSpy: ReturnType<typeof vi.spyOn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("suppresses debug at the default 'info' level", () => {
    const logger = new Logger('test');

    logger.debug('should not appear');
    logger.info('should appear');
    logger.warn('should appear');
    logger.error('should appear');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("emits every level at 'debug'", () => {
    const logger = new Logger('test', {}, 'debug');

    logger.debug('x');
    logger.info('x');

    expect(debugSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledTimes(1);
  });

  it("suppresses everything below 'error' at 'error'", () => {
    const logger = new Logger('test', {}, 'error');

    logger.debug('x');
    logger.info('x');
    logger.warn('x');
    logger.error('x');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('child inherits the parent level', () => {
    const child = new Logger('test', {}, 'debug').child('sub');

    child.debug('x');

    expect(debugSpy).toHaveBeenCalledTimes(1);
  });

  it('child can override the level', () => {
    const child = new Logger('test', {}, 'debug').child('sub', {}, 'warn');

    child.info('x');
    child.warn('x');

    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('error still folds the Error into metadata', () => {
    const logger = new Logger('test');
    logger.error('boom', new Error('inner'), { path: '/x' });

    const line = errorSpy.mock.calls[0][0] as string;
    expect(line).toContain('inner');
    expect(line).toContain('/x');
  });
});
