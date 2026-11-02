# Ludo Online

Browser Ludo for 2–4 players, hosted on GitHub Pages.

- **Friends (online):** one player creates a room and shares the 6-character code or invite link. Game messages travel over a public MQTT broker (HiveMQ, falling back to EMQX) using secure WebSockets, so players on different networks, phones on mobile data and restrictive Wi-Fi all work, with no relay server to run.
- **Computer (offline):** 1–3 bots, no network at all. Bots can also be added to any online room.
- Rules: 6 to leave base, capture on non-safe cells, ★ and start cells are safe, exact roll to finish, extra roll on 6 / capture / reaching home, three 6s in a row forfeits the turn.

The host's browser runs the game: if the host closes the tab, the room ends. A dropped player is auto-played by a bot until they reconnect and get their seat back.

Room traffic is on a public broker under the `ludo-ashith-v1/<code>/…` topic prefix. It carries only names and moves, but anyone who knows a room code could read it. Don't treat rooms as private.

`game.js` holds the pure rules (`node test.js` runs the tests); `index.html` is the UI and networking; `mqtt.min.js` is mqtt.js 5.10.4, bundled locally.
