import test from 'node:test';
import assert from 'node:assert/strict';
import { handleUnsavedDialogKey } from '../../src/utils/unsavedDialogKeyboard.js';

function setup() {
  const result = { focused: '', stays: 0, prevented: 0 };
  const first = { focus() { result.focused = 'first'; } };
  const last = { focus() { result.focused = 'last'; } };
  const key = (key, shiftKey = false) => ({ key, shiftKey, preventDefault() { result.prevented++; } });
  const trigger = (event, active) => handleUnsavedDialogKey(event, {
    first, last, active, onStay() { result.stays++; }
  });
  return { first, last, key, trigger, result };
}

test('Escape vuelve al formulario sin descartar lo editado', () => {
  const ctx = setup();
  assert.equal(ctx.trigger(ctx.key('Escape'), ctx.first), true);
  assert.equal(ctx.result.stays, 1);
  assert.equal(ctx.result.prevented, 1);
});
test('Tab circula entre los controles de confirmación', () => {
  const ctx = setup();
  assert.equal(ctx.trigger(ctx.key('Tab'), ctx.last), true);
  assert.equal(ctx.result.focused, 'first');
  assert.equal(ctx.trigger(ctx.key('Tab', true), ctx.first), true);
  assert.equal(ctx.result.focused, 'last');
});
test('El foco externo se recupera sin salir del modal', () => {
  const ctx = setup();
  const outside = {};
  assert.equal(ctx.trigger(ctx.key('Tab'), outside), true);
  assert.equal(ctx.result.focused, 'first');
  assert.equal(ctx.trigger(ctx.key('Tab', true), outside), true);
  assert.equal(ctx.result.focused, 'last');
});
test('Otras teclas y Tab desde el botón inicial no se interceptan', () => {
  const ctx = setup();
  assert.equal(ctx.trigger(ctx.key('Enter'), ctx.first), false);
  assert.equal(ctx.trigger(ctx.key('Tab'), ctx.first), false);
  assert.equal(ctx.trigger(ctx.key('Tab', true), ctx.last), false);
  assert.equal(ctx.result.prevented, 0);
  assert.equal(ctx.result.stays, 0);
});
