import Phaser from 'phaser';
import { CafeScene } from './game/CafeScene';
import { PreloadScene } from './game/art';
import { CollectionScene } from './game/CollectionScene';
import { EventScene } from './game/EventScene';
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
    scene: [PreloadScene, MenuScene, LevelScene, CafeScene, CollectionScene, EventScene],
  });
});
