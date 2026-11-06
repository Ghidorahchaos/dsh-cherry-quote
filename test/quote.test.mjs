import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

let definition;
const sandbox = {
  window: {
    __ModuleLoader__: {
      load(value) {
        definition = value;
      },
    },
  },
  document: undefined,
  console,
};
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(new URL('../client.js', import.meta.url), 'utf8'),
  sandbox,
  { filename: 'client.js' },
);

assert.ok(definition, 'client.js should register a module');
const fakeReact = { createElement: () => undefined };
const module = definition.factory((name) => {
  if (name === 'react') return fakeReact;
  throw new Error('unexpected require: ' + name);
});
const api = module.__test;
assert.ok(api, 'client.js should expose test helpers');

assert.equal(
  api.buildPromptText('hello'),
  '<blockquote data-cherry-quote="1">\n\nhello\n\n</blockquote>',
  'buildPromptText should wrap the quote in a marker block',
);

const reference = api.buildReference('a</blockquote>b');
assert.equal(reference.source, '引用消息');
assert.equal(reference.label, '引用');
assert.equal(reference.clipboardText, api.buildPromptText('a</blockquote>b'));
const parsed = api.parseRef(reference.ref);
assert.equal(parsed.text, 'a</blockquote>b');
assert.ok(parsed.promptText.includes('&lt;/blockquote&gt;'), 'closing tag must be escaped');
assert.equal(parsed.truncated, false);

assert.equal(api.parseRef('{not json'), undefined);
assert.equal(api.parseRef('{}'), undefined);

const match = api.nextUserQuote('x' + api.buildPromptText('quoted') + 'y', 0);
assert.ok(match, 'matcher should find a marker block');
assert.equal(match.data.text, 'quoted');
assert.ok(match.start > 0 && match.end > match.start);

const multi = api.buildPromptText('one') + '\n' + api.buildPromptText('two');
const first = api.nextUserQuote(multi, 0);
const second = api.nextUserQuote(multi, first.end);
assert.equal(first.data.text, 'one');
assert.equal(second.data.text, 'two');

assert.equal(api.nextUserQuote('<blockquote>plain</blockquote>', 0), undefined);
assert.equal(api.nextUserQuote(api.buildPromptText('unclosed').slice(0, -12), 0), undefined);

const occurrences = [
  { source: '引用消息', offset: 0, length: 1, ref: 'one' },
  { source: 'other-source', offset: 2, length: 1, ref: 'keep' },
  { source: '引用消息', offset: 3, length: 1, ref: 'two' },
];
const removedFirst = api.removeQuoteFromDraft('abcde', occurrences, 0);
assert.equal(removedFirst.text, 'bcde');
assert.equal(removedFirst.references.length, 2);
assert.equal(removedFirst.references[0].offset, 1);
assert.equal(removedFirst.references[1].offset, 2);

const removedSecond = api.removeQuoteFromDraft('abcde', occurrences, 1);
assert.equal(removedSecond.text, 'abce');
assert.equal(removedSecond.references.length, 2);
assert.equal(removedSecond.references[0].offset, 0);
assert.equal(removedSecond.references[1].offset, 2);

assert.equal(api.removeQuoteFromDraft('abc', occurrences, 9), undefined);
assert.equal(api.normalizeText('  a\r\nb  '), 'a\nb');

const spacedLast = api.insertSpaceAfterQuote('abcde', occurrences, 'two');
assert.equal(spacedLast.text, 'abcd e');
assert.equal(spacedLast.references[0].offset, 0);
assert.equal(spacedLast.references[1].offset, 2);
assert.equal(spacedLast.references[2].offset, 3);

const spacedFirst = api.insertSpaceAfterQuote('abcde', occurrences, 'one');
assert.equal(spacedFirst.text, 'a bcde');
assert.equal(spacedFirst.references[0].offset, 0);
assert.equal(spacedFirst.references[1].offset, 3);
assert.equal(spacedFirst.references[2].offset, 4);

assert.equal(api.insertSpaceAfterQuote('abcde', occurrences, 'missing'), undefined);

console.log('quote tests passed');
