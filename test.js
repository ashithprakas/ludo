const assert = require('node:assert/strict');
const L = require('./game.js');

const mk = n => L.newGame(Array.from({ length: n }, (_, i) => ({ name: 'P' + i, color: [0, 2, 1, 3][i] })));
const at = (s, pi, toks) => (s.tokens[pi] = toks);

// 6 needed to leave base
{
  const s = mk(2);
  L.roll(s, 5);
  assert.deepEqual(L.legalMoves(s), []);
  L.pass(s);
  assert.equal(s.turn, 1);
  L.roll(s, 6);
  assert.deepEqual(L.legalMoves(s), [0, 1, 2, 3]);
  L.move(s, 0);
  assert.equal(s.tokens[1][0], 0);
  assert.equal(s.turn, 1, 'six gives another roll');
  assert.equal(s.phase, 'roll');
}

// capture on a non-safe cell, bonus roll
{
  const s = mk(2); // P0 red(0), P1 yellow(2)
  at(s, 0, [3, -1, -1, -1]);           // red abs 3
  at(s, 1, [-1 + 0, -1, -1, -1]);
  s.tokens[1][0] = 29;                 // yellow abs (26+29)%52 = 3
  L.roll(s, 4); // red 3 -> 7 (abs 7), no capture
  L.move(s, 0);
  assert.equal(s.turn, 1);
  s.tokens[0] = [-1, -1, -1, -1]; s.tokens[0][0] = 1; // red abs 1
  s.turn = 0; s.phase = 'roll'; s.sixes = 0;
  s.tokens[1][0] = 29;                 // abs 3
  L.roll(s, 2);
  L.move(s, 0);
  assert.equal(s.tokens[1][0], -1, 'captured');
  assert.equal(s.turn, 0, 'capture grants bonus roll');
}

// safe cell blocks capture (red start, abs 0, and star at abs 8)
{
  const s = mk(2);
  at(s, 0, [-1, -1, -1, -1]);
  s.tokens[1][0] = 26;                 // yellow abs 0 — red's start cell, safe
  assert.deepEqual(L.captures(s, 0, 0), []);
  s.tokens[1][0] = 34;                 // abs 8 — star
  assert.deepEqual(L.captures(s, 0, 8), []);
}

// exact roll to finish
{
  const s = mk(2);
  at(s, 0, [54, -1, -1, -1]);
  L.roll(s, 3);
  assert.deepEqual(L.legalMoves(s), []);
  s.phase = 'roll'; L.roll(s, 2);
  assert.deepEqual(L.legalMoves(s), [0]);
  L.move(s, 0);
  assert.equal(s.tokens[0][0], 56);
  assert.equal(s.turn, 0, 'reaching home grants bonus roll');
}

// three sixes forfeit
{
  const s = mk(2);
  L.roll(s, 6); L.move(s, 0);
  L.roll(s, 6); L.move(s, 1);
  L.roll(s, 6);
  assert.equal(s.forfeit, true);
  assert.deepEqual(L.legalMoves(s), []);
  L.pass(s);
  assert.equal(s.turn, 1);
}

// full games with bots always terminate and stay consistent
for (let g = 0; g < 400; g++) {
  const s = mk(2 + (g % 3));
  let steps = 0;
  while (s.phase !== 'over') {
    assert.ok(++steps < 20000, 'game did not finish');
    if (s.phase === 'roll') L.roll(s, 1 + Math.floor(Math.random() * 6));
    else if (L.legalMoves(s).length) assert.ok(L.move(s, L.botMove(s)));
    else assert.ok(L.pass(s));
    s.tokens.forEach(t => t.forEach(p => assert.ok(p >= -1 && p <= 56)));
  }
  assert.equal(new Set(s.ranking).size, s.players.length);
}
console.log('all tests passed');
