#!/usr/bin/env node

const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');

const spawnChild = (_args) =>
  spawn(process.execPath, _args, {
    cwd: rootDir,
    stdio: 'inherit',
  });

const apiProcess = spawnChild(['server/index.js']);
const gatsbyProcess = spawnChild(['scripts/run-gatsby.cjs', 'develop']);
const childProcesses = [apiProcess, gatsbyProcess];

let didShutdown = false;

const shutdown = signal => {
  if (didShutdown) {
    return;
  }

  didShutdown = true;
  childProcesses.forEach(child => {
    if (!child.killed) {
      child.kill(signal);
    }
  });
};

['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => shutdown(signal));
});

childProcesses.forEach(child => {
  child.on('exit', code => {
    if (!didShutdown) {
      shutdown('SIGTERM');
      process.exit(code ?? 0);
    }
  });
});
