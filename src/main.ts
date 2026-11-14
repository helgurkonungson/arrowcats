import Phaser from 'phaser';
import { CafeScene } from './game/CafeScene';
import { CollectionScene } from './game/CollectionScene';
import { LevelScene } from './game/LevelScene';
import { MenuScene } from './game/MenuScene';
import { initState } from './game/state';
import { C, H, W } from './game/ui';

initState().then(() => {
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'app',
    width: W,
    height: H,
    backgroundColor: C.bg,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [MenuScene, LevelScene, CafeScene, CollectionScene],
  });
});
