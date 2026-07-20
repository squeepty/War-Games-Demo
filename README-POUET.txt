WARGAMES: SCREENS REVISITED
===========================

A browser-based audiovisual homage to WarGames (1983), released by Squeepty
on 11 June 2026.

RUNNING
-------

Extract the archive, host the extracted directory with any static HTTP server,
then open index.html in a modern desktop browser. Directly opening index.html
from the filesystem will not load the soundtrack in most browsers.

For example, with Python 3:

    python3 -m http.server

Then visit:

    http://localhost:8000/

Click or press a key to begin. Enable audio and watch from the start.

REQUIREMENTS
------------

- Modern desktop browser with JavaScript and Web Audio enabled
- A static HTTP server (no installation or build step required)

CREDITS
-------

Demo: Squeepty
Music: "Eclipse" by Matthew "4mat" Simmonds

Built with TypeScript, HTML5 Canvas, Vite, Web Audio API, and a custom
ProTracker MOD parser/player.

This is an independent, non-commercial fan homage. It is not affiliated
with or endorsed by the filmmakers, cast, studios, distributors, or
rights holders of WarGames.
