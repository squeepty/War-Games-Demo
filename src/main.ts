import "./styles.css";
import { SoundtrackManager } from "./audio/SoundtrackManager";
import { WARGAMES_TIMELINE } from "./config/wargamesTimeline";
import { CanvasRenderer } from "./rendering/CanvasRenderer";
import { SceneManager } from "./runtime/SceneManager";
import { AutoDialerScene } from "./scenes/AutoDialerScene";
import { GlobalDialingMapScene } from "./scenes/GlobalDialingMapScene";
import { InMemoryScene } from "./scenes/InMemoryScene";
import { NoradScene } from "./scenes/NoradScene";
import { SimulationScene } from "./scenes/SimulationScene";
import { StrangeGameScene } from "./scenes/StrangeGameScene";
import { ThermonuclearWarScene } from "./scenes/ThermonuclearWarScene";
import { WoprScene } from "./scenes/WoprScene";
import type { Scene } from "./runtime/Scene";

const canvas = document.querySelector<HTMLCanvasElement>("#demo-canvas");

if (!canvas) {
  throw new Error("Missing #demo-canvas element.");
}

const renderer = new CanvasRenderer(canvas, {
  logicalWidth: 1600,
  logicalHeight: 900,
});

const sceneManager = new SceneManager(renderer);
const soundtrackManager = new SoundtrackManager();
const startOverlay = document.querySelector<HTMLElement>("#audio-start");

type SceneFactory = () => Scene;

let sceneIndex = -1;
let started = false;

const sceneFactories: SceneFactory[] = [
  () => new AutoDialerScene(),
  () => new GlobalDialingMapScene(),
  () => new NoradScene(),
  () => new WoprScene(),
  () => new ThermonuclearWarScene(),
  () => new SimulationScene(),
  () => new StrangeGameScene(),
  () => new InMemoryScene((level) => soundtrackManager.setMusicLevel(level)),
];

const synchronizeScene = (timelineTime: number): number => {
  let nextSceneIndex = 0;
  let sceneStartedAt = 0;

  while (
    nextSceneIndex < WARGAMES_TIMELINE.length - 1 &&
    timelineTime >= sceneStartedAt + WARGAMES_TIMELINE[nextSceneIndex].durationSeconds
  ) {
    sceneStartedAt += WARGAMES_TIMELINE[nextSceneIndex].durationSeconds;
    nextSceneIndex += 1;
  }

  if (nextSceneIndex !== sceneIndex) {
    sceneIndex = nextSceneIndex;
    sceneManager.setScene(sceneFactories[sceneIndex]());
    soundtrackManager.playForScene(WARGAMES_TIMELINE[sceneIndex].sceneId);
  }

  return timelineTime - sceneStartedAt;
};

const startExperience = async () => {
  if (started) {
    return;
  }

  started = true;
  await soundtrackManager.unlock();
  startOverlay?.classList.add("audio-start--hidden");
  sceneManager.start(
    () => soundtrackManager.getPlaybackTime(),
    synchronizeScene,
  );
};

startOverlay?.addEventListener("click", () => {
  void startExperience();
});

window.addEventListener("keydown", (event) => {
  if (!started) {
    event.preventDefault();
    void startExperience();
    return;
  }

});
