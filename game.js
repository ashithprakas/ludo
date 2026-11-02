/* Pure Ludo rules. No DOM, no network: runs in the browser and in node (test.js).
 *
 * Token position per token:  -1 = in base, 0..50 = on the shared 52-cell track
 * (relative to the owner's start), 51..55 = home column, 56 = finished.
 * Colors: 0 red, 1 green, 2 yellow, 3 blue (clockwise); each starts 13 cells after the last.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Ludo = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const TRACK = 52;
  const FIN = 56;

  const abs = (color, pos) => (color * 13 + pos) % TRACK;
  const isSafe = a => a % 13 === 0 || a % 13 === 8;

  function newGame(players) {
    return {
      players: players.map(p => ({ ...p })),
      tokens: players.map(() => [-1, -1, -1, -1]),
      turn: 0,
      phase: 'roll', // roll | move | over
      dice: null,
      rolls: 0,
      sixes: 0,
      forfeit: false,
      ranking: [],
      msg: `${players[0].name} to roll`,
    };
  }

  function legalMoves(s) {
    if (s.phase !== 'move' || s.forfeit) return [];
    const out = [];
    s.tokens[s.turn].forEach((p, i) => {
      if (p === FIN) return;
      if (p === -1 ? s.dice === 6 : p + s.dice <= FIN) out.push(i);
    });
    return out;
  }

  // Opponent tokens that would be captured by `color` landing on `to`.
  function captures(s, color, to) {
    if (to < 0 || to > 50) return [];
    const a = abs(color, to);
    if (isSafe(a)) return [];
    const hit = [];
    s.players.forEach((pl, pi) => {
      if (pl.color === color) return;
      s.tokens[pi].forEach((p, ti) => {
        if (p >= 0 && p <= 50 && abs(pl.color, p) === a) hit.push([pi, ti]);
      });
    });
    return hit;
  }

  function nextTurn(s) {
    s.sixes = 0;
    s.forfeit = false;
    do s.turn = (s.turn + 1) % s.players.length;
    while (s.ranking.includes(s.turn));
    s.phase = 'roll';
    s.msg = `${s.players[s.turn].name} to roll`;
  }

  function roll(s, v) {
    if (s.phase !== 'roll') return false;
    const name = s.players[s.turn].name;
    s.dice = v;
    s.rolls++;
    s.phase = 'move';
    s.forfeit = false;
    s.msg = `${name} rolled ${v}`;
    if (v === 6 && ++s.sixes >= 3) {
      s.forfeit = true;
      s.msg += ' — three 6s in a row, turn lost';
    } else if (!legalMoves(s).length) {
      s.msg += ' — no move';
    }
    return true;
  }

  // Called after a roll that left nothing to do.
  function pass(s) {
    if (s.phase !== 'move' || (!s.forfeit && legalMoves(s).length)) return false;
    nextTurn(s);
    return true;
  }

  function move(s, i) {
    if (!legalMoves(s).includes(i)) return false;
    const pl = s.players[s.turn];
    const toks = s.tokens[s.turn];
    const to = toks[i] === -1 ? 0 : toks[i] + s.dice;
    toks[i] = to;

    const caught = captures(s, pl.color, to);
    caught.forEach(([pi, ti]) => (s.tokens[pi][ti] = -1));
    s.msg = `${pl.name} moved`;
    if (caught.length) s.msg += ` and sent ${caught.map(([pi]) => s.players[pi].name).join(', ')} home`;
    if (to === FIN) s.msg += ' — token home!';

    const done = toks.every(p => p === FIN);
    if (done) {
      s.ranking.push(s.turn);
      s.msg = `${pl.name} finished #${s.ranking.length}`;
    }
    if (s.players.length - s.ranking.length <= 1) {
      s.players.forEach((_, pi) => { if (!s.ranking.includes(pi)) s.ranking.push(pi); });
      s.phase = 'over';
      s.msg = `${s.players[s.ranking[0]].name} wins!`;
      return true;
    }
    if (!done && (s.dice === 6 || caught.length || to === FIN)) {
      s.phase = 'roll'; // bonus roll
      s.msg += ' — roll again';
    } else {
      nextTurn(s);
    }
    return true;
  }

  function botMove(s) {
    const color = s.players[s.turn].color;
    let best = null, bestScore = -Infinity;
    for (const i of legalMoves(s)) {
      const from = s.tokens[s.turn][i];
      const to = from === -1 ? 0 : from + s.dice;
      let score = to / 10;
      if (to === FIN) score += 100;
      score += captures(s, color, to).length * 50;
      if (from === -1) score += 30;
      if (to > 50) score += 12;
      else if (isSafe(abs(color, to))) score += 8;
      if (from >= 0 && from <= 50 && isSafe(abs(color, from))) score -= 4; // don't abandon safety needlessly
      if (score > bestScore) { bestScore = score; best = i; }
    }
    return best;
  }

  return { TRACK, FIN, abs, isSafe, newGame, legalMoves, captures, roll, pass, move, botMove };
});
