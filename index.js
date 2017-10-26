#!/usr/bin/env node

const os = require('os');
const vm = require('vm');
const cp = require('child_process');
const util = require('util');

function writePrompt() {
  process.stdout.write(`~${os.userInfo().username}$ `);
}

function write(x) {
  if (typeof x === 'string' && !x.length) return;
  const p = util.inspect(x, {
    colors: true,
  });
  process.stdout.write(`${p}\n`);
}

const CONTEXT = { require };
const COMMANDS = {
  exit: (code) => process.exit(+code || 0),
};

for (const name of require('repl')._builtinLibs) {
  const setReal = (val) => {
    delete CONTEXT[name];
    CONTEXT[name] = val;
  };
  Object.defineProperty(CONTEXT, name, {
    get: () => {
      const lib = require(name);
      delete CONTEXT[name];
      Object.defineProperty(CONTEXT, name, {
        get: () => lib,
        set: setReal,
        configurable: true,
        enumerable: false,
      });
      return lib;
    },
    set: setReal,
    configurable: true,
    enumerable: false,
  });
}

let running = false;
process.stdin.on('data', (chunk) => {
  if (running) return;
  running = true;
  betterEval(chunk.toString().trim(), (out) => {
    write(out);
    writePrompt();
    running = false;
  });
});

writePrompt();

function betterEval(input, callback) {
  if (input.split(' ')[0] in COMMANDS) {
    const [command, ...args] = input.split(' ');
    return callback(COMMANDS[command](...args));
  }
  try {
    let copy = String(input);
    if (copy.startsWith('{')) copy = `(${copy})`;
    const script = new vm.Script(copy);
    const ret = script.runInNewContext(CONTEXT, { displayErrors: false });
    return callback(ret);
  } catch (err) {
    runScript(input, callback);
  }
}

function runScript(input, callback) {
  const child = cp.spawn(input, [], {
    shell: process.env.SHELL,
    stdio: [0, 1, 2],
  });
  child.on('exit', () => callback());
}
