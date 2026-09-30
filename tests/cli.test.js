import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const cliPath = join(process.cwd(), 'bin', 'cli.js');

describe('CLI Interface Tests', () => {
  it('should print version when run with --version', () => {
    const output = execSync(`node "${cliPath}" --version`, { encoding: 'utf-8' });
    assert.match(output, /sd-yt-live v1\.0\.0/);
  });

  it('should print help information when run with --help', () => {
    const output = execSync(`node "${cliPath}" --help`, { encoding: 'utf-8' });
    assert.match(output, /Usage:/);
    assert.match(output, /npx sd-yt-live/);
  });
});
