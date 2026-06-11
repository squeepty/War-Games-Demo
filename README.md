# WARGAMES: Screens Revisited

**WARGAMES: Screens Revisited** is a browser-based audiovisual homage to the
1983 film *WarGames*.

The original film was directed by **John Badham**, written by **Lawrence Lasker**
and **Walter F. Parkes**, and stars **Matthew Broderick**, **Dabney Coleman**,
**John Wood**, and **Ally Sheedy**.

This project revisits the film's terminal interfaces, modem culture, vector
graphics, Cold War tension, and uneasy fascination with intelligent machines.
It is not a game or a direct recreation of the film. It is a small demoscene-like
tribute built around the mood and visual language that made *WarGames* enduring.

## The Experience

The presentation runs as a continuous sequence of canvas-rendered scenes:

- An automated modem dialing sequence
- A global network trace
- A NORAD-inspired vector command display
- The awakening of WOPR
- Global thermonuclear war simulations
- Accelerating strategic outcome analysis
- Game theory, tic-tac-toe, and the final lesson
- A closing memorial to the age of modems, terminals, BBS systems, and bedroom
  hackers

For the intended experience, enable audio and watch the sequence from the
beginning.

## Technology

- TypeScript
- HTML5 Canvas
- Vite
- Web Audio API
- A custom ProTracker MOD parser and player

All interface graphics, CRT effects, animation, text, and vector displays are
rendered in real time.

## Running Locally

Install dependencies:

```sh
npm ci
```

Start the development server:

```sh
npm run dev
```

Create a production build:

```sh
npm run build
```

Preview the production build:

```sh
npm run preview
```

## Music

The soundtrack is:

**“Eclipse” by Matthew “4mat” Simmonds**

The bundled ProTracker module identifies the composition as dated
**June 19, 1990**. Music remains the work of its original composer.

## Acknowledgments

This project exists because *WarGames* made computers feel mysterious,
inviting, dangerous, and full of possibility. It is dedicated to the film's
cast and creators, and to the era of acoustic modems, phosphor displays,
bulletin board systems, tracker music, and curious people learning what might
be waiting on the other end of a telephone line.

## Disclaimer

This is an independent, non-commercial fan homage. It is not affiliated with,
endorsed by, or sponsored by the filmmakers, cast, studios, distributors, or
rights holders of *WarGames*. All film-related names and trademarks belong to
their respective owners.
