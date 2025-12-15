import MainScene from "./scenes/MainScene.js";

const GAME_WIDTH = 960;
const GAME_HEIGHT = 640;

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#11151f",
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scene: [MainScene],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);


