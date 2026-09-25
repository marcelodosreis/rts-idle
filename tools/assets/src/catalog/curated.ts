import type { AssetKind } from '@rts/shared'

/**
 * Curated asset index: the semantic set we ship today, mapping source files in
 * the vendor pack (`tmp/tiny_swords`) to normalized target paths under the
 * assets root. Everything the game does not yet use stays out of this list —
 * see `docs/assets/capabilities.md` for the full pack inventory.
 *
 * Source pack: Tiny Swords (Kay Lousberg / Pixel Frog), license-pending
 * (ADR-015 golden rule).
 */

export interface CuratedSource {
  readonly key: string
  /** Path relative to the vendor pack root (`tmp/tiny_swords`). */
  readonly source: string
  /** Target path relative to the assets root. */
  readonly file: string
  readonly kind: AssetKind
  /** Explicit cell size for `tileset`. */
  readonly cell?: number
  readonly duration?: number
  readonly anchorX: number
  readonly anchorY: number
  readonly flipOnMoveX?: boolean
}

export const CURATED: readonly CuratedSource[] = [
  {
    key: 'terrain.tileset.color1',
    source: 'Terrain/Tileset/Tilemap_color1.png',
    file: 'terrain/tileset/color1.png',
    kind: 'tileset' as const,
    cell: 64,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.tileset.color2',
    source: 'Terrain/Tileset/Tilemap_color2.png',
    file: 'terrain/tileset/color2.png',
    kind: 'tileset' as const,
    cell: 64,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.tileset.color3',
    source: 'Terrain/Tileset/Tilemap_color3.png',
    file: 'terrain/tileset/color3.png',
    kind: 'tileset' as const,
    cell: 64,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.tileset.color4',
    source: 'Terrain/Tileset/Tilemap_color4.png',
    file: 'terrain/tileset/color4.png',
    kind: 'tileset' as const,
    cell: 64,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.tileset.color5',
    source: 'Terrain/Tileset/Tilemap_color5.png',
    file: 'terrain/tileset/color5.png',
    kind: 'tileset' as const,
    cell: 64,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.water.foam',
    source: 'Terrain/Tileset/Water Foam.png',
    file: 'terrain/water/foam.png',
    kind: 'strip' as const,
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.water.background',
    source: 'Terrain/Tileset/Water Background color.png',
    file: 'terrain/water/background.png',
    kind: 'static' as const,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.shadow',
    source: 'Terrain/Tileset/Shadow.png',
    file: 'terrain/shadow.png',
    kind: 'static' as const,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.decorations.rock1',
    source: 'Terrain/Decorations/Rocks/Rock1.png',
    file: 'terrain/decorations/rock1.png',
    kind: 'static' as const,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'fx.explosion_01',
    source: 'Particle FX/Explosion_01.png',
    file: 'fx/explosion_01.png',
    kind: 'strip' as const,
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.bars.smallbar_base',
    source: 'UI Elements/UI Elements/Bars/SmallBar_Base.png',
    file: 'ui/bars/smallbar_base.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.bars.smallbar_fill',
    source: 'UI Elements/UI Elements/Bars/SmallBar_Fill.png',
    file: 'ui/bars/smallbar_fill.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.panels.wood_table',
    source: 'UI Elements/UI Elements/Wood Table/WoodTable.png',
    file: 'ui/panels/wood_table.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.papers.regular',
    source: 'UI Elements/UI Elements/Papers/RegularPaper.png',
    file: 'ui/papers/regular.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.buttons.big_blue',
    source: 'UI Elements/UI Elements/Buttons/BigBlueButton_Regular.png',
    file: 'ui/buttons/big_blue.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.buttons.big_blue_pressed',
    source: 'UI Elements/UI Elements/Buttons/BigBlueButton_Pressed.png',
    file: 'ui/buttons/big_blue_pressed.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.black.archery',
    source: 'Buildings/Black Buildings/Archery.png',
    file: 'black_buildings/archery.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.black.barracks',
    source: 'Buildings/Black Buildings/Barracks.png',
    file: 'black_buildings/barracks.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.black.castle',
    source: 'Buildings/Black Buildings/Castle.png',
    file: 'black_buildings/castle.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.black.house1',
    source: 'Buildings/Black Buildings/House1.png',
    file: 'black_buildings/house1.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.black.house2',
    source: 'Buildings/Black Buildings/House2.png',
    file: 'black_buildings/house2.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.black.house3',
    source: 'Buildings/Black Buildings/House3.png',
    file: 'black_buildings/house3.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.black.monastery',
    source: 'Buildings/Black Buildings/Monastery.png',
    file: 'black_buildings/monastery.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.black.tower',
    source: 'Buildings/Black Buildings/Tower.png',
    file: 'black_buildings/tower.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.blue.archery',
    source: 'Buildings/Blue Buildings/Archery.png',
    file: 'blue_buildings/archery.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.blue.barracks',
    source: 'Buildings/Blue Buildings/Barracks.png',
    file: 'blue_buildings/barracks.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.blue.castle',
    source: 'Buildings/Blue Buildings/Castle.png',
    file: 'blue_buildings/castle.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.blue.house1',
    source: 'Buildings/Blue Buildings/House1.png',
    file: 'blue_buildings/house1.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.blue.house2',
    source: 'Buildings/Blue Buildings/House2.png',
    file: 'blue_buildings/house2.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.blue.house3',
    source: 'Buildings/Blue Buildings/House3.png',
    file: 'blue_buildings/house3.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.blue.monastery',
    source: 'Buildings/Blue Buildings/Monastery.png',
    file: 'blue_buildings/monastery.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.blue.tower',
    source: 'Buildings/Blue Buildings/Tower.png',
    file: 'blue_buildings/tower.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.purple.archery',
    source: 'Buildings/Purple Buildings/Archery.png',
    file: 'purple_buildings/archery.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.purple.barracks',
    source: 'Buildings/Purple Buildings/Barracks.png',
    file: 'purple_buildings/barracks.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.purple.castle',
    source: 'Buildings/Purple Buildings/Castle.png',
    file: 'purple_buildings/castle.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.purple.house1',
    source: 'Buildings/Purple Buildings/House1.png',
    file: 'purple_buildings/house1.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.purple.house2',
    source: 'Buildings/Purple Buildings/House2.png',
    file: 'purple_buildings/house2.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.purple.house3',
    source: 'Buildings/Purple Buildings/House3.png',
    file: 'purple_buildings/house3.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.purple.monastery',
    source: 'Buildings/Purple Buildings/Monastery.png',
    file: 'purple_buildings/monastery.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.purple.tower',
    source: 'Buildings/Purple Buildings/Tower.png',
    file: 'purple_buildings/tower.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.red.archery',
    source: 'Buildings/Red Buildings/Archery.png',
    file: 'red_buildings/archery.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.red.barracks',
    source: 'Buildings/Red Buildings/Barracks.png',
    file: 'red_buildings/barracks.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.red.castle',
    source: 'Buildings/Red Buildings/Castle.png',
    file: 'red_buildings/castle.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.red.house1',
    source: 'Buildings/Red Buildings/House1.png',
    file: 'red_buildings/house1.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.red.house2',
    source: 'Buildings/Red Buildings/House2.png',
    file: 'red_buildings/house2.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.red.house3',
    source: 'Buildings/Red Buildings/House3.png',
    file: 'red_buildings/house3.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.red.monastery',
    source: 'Buildings/Red Buildings/Monastery.png',
    file: 'red_buildings/monastery.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.red.tower',
    source: 'Buildings/Red Buildings/Tower.png',
    file: 'red_buildings/tower.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.yellow.archery',
    source: 'Buildings/Yellow Buildings/Archery.png',
    file: 'yellow_buildings/archery.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.yellow.barracks',
    source: 'Buildings/Yellow Buildings/Barracks.png',
    file: 'yellow_buildings/barracks.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.yellow.castle',
    source: 'Buildings/Yellow Buildings/Castle.png',
    file: 'yellow_buildings/castle.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.yellow.house1',
    source: 'Buildings/Yellow Buildings/House1.png',
    file: 'yellow_buildings/house1.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.yellow.house2',
    source: 'Buildings/Yellow Buildings/House2.png',
    file: 'yellow_buildings/house2.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.yellow.house3',
    source: 'Buildings/Yellow Buildings/House3.png',
    file: 'yellow_buildings/house3.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.yellow.monastery',
    source: 'Buildings/Yellow Buildings/Monastery.png',
    file: 'yellow_buildings/monastery.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'buildings.yellow.tower',
    source: 'Buildings/Yellow Buildings/Tower.png',
    file: 'yellow_buildings/tower.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'fx.dust_01',
    source: 'Particle FX/Dust_01.png',
    file: 'dust_01.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'fx.dust_02',
    source: 'Particle FX/Dust_02.png',
    file: 'dust_02.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'fx.explosion_02',
    source: 'Particle FX/Explosion_02.png',
    file: 'explosion_02.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'fx.fire_01',
    source: 'Particle FX/Fire_01.png',
    file: 'fire_01.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'fx.fire_02',
    source: 'Particle FX/Fire_02.png',
    file: 'fire_02.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'fx.fire_03',
    source: 'Particle FX/Fire_03.png',
    file: 'fire_03.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'fx.water_splash',
    source: 'Particle FX/Water Splash.png',
    file: 'water_splash.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.decorations.bushes.bushe1',
    source: 'Terrain/Decorations/Bushes/Bushe1.png',
    file: 'decorations/bushes/bushe1.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.decorations.bushes.bushe2',
    source: 'Terrain/Decorations/Bushes/Bushe2.png',
    file: 'decorations/bushes/bushe2.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.decorations.bushes.bushe3',
    source: 'Terrain/Decorations/Bushes/Bushe3.png',
    file: 'decorations/bushes/bushe3.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.decorations.bushes.bushe4',
    source: 'Terrain/Decorations/Bushes/Bushe4.png',
    file: 'decorations/bushes/bushe4.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.decorations.clouds.clouds_01',
    source: 'Terrain/Decorations/Clouds/Clouds_01.png',
    file: 'decorations/clouds/clouds_01.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.decorations.clouds.clouds_02',
    source: 'Terrain/Decorations/Clouds/Clouds_02.png',
    file: 'decorations/clouds/clouds_02.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.decorations.clouds.clouds_03',
    source: 'Terrain/Decorations/Clouds/Clouds_03.png',
    file: 'decorations/clouds/clouds_03.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.decorations.clouds.clouds_04',
    source: 'Terrain/Decorations/Clouds/Clouds_04.png',
    file: 'decorations/clouds/clouds_04.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.decorations.clouds.clouds_05',
    source: 'Terrain/Decorations/Clouds/Clouds_05.png',
    file: 'decorations/clouds/clouds_05.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.decorations.clouds.clouds_06',
    source: 'Terrain/Decorations/Clouds/Clouds_06.png',
    file: 'decorations/clouds/clouds_06.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.decorations.clouds.clouds_07',
    source: 'Terrain/Decorations/Clouds/Clouds_07.png',
    file: 'decorations/clouds/clouds_07.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.decorations.clouds.clouds_08',
    source: 'Terrain/Decorations/Clouds/Clouds_08.png',
    file: 'decorations/clouds/clouds_08.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.decorations.rocks_in_the_water.water_rocks_01',
    source: 'Terrain/Decorations/Rocks in the Water/Water Rocks_01.png',
    file: 'decorations/rocks_in_the_water/water_rocks_01.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.decorations.rocks_in_the_water.water_rocks_02',
    source: 'Terrain/Decorations/Rocks in the Water/Water Rocks_02.png',
    file: 'decorations/rocks_in_the_water/water_rocks_02.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.decorations.rocks_in_the_water.water_rocks_03',
    source: 'Terrain/Decorations/Rocks in the Water/Water Rocks_03.png',
    file: 'decorations/rocks_in_the_water/water_rocks_03.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.decorations.rocks_in_the_water.water_rocks_04',
    source: 'Terrain/Decorations/Rocks in the Water/Water Rocks_04.png',
    file: 'decorations/rocks_in_the_water/water_rocks_04.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.decorations.rocks.rock2',
    source: 'Terrain/Decorations/Rocks/Rock2.png',
    file: 'decorations/rocks/rock2.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.decorations.rocks.rock3',
    source: 'Terrain/Decorations/Rocks/Rock3.png',
    file: 'decorations/rocks/rock3.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.decorations.rocks.rock4',
    source: 'Terrain/Decorations/Rocks/Rock4.png',
    file: 'decorations/rocks/rock4.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.decorations.rubber_duck.rubber_duck',
    source: 'Terrain/Decorations/Rubber Duck/Rubber duck.png',
    file: 'decorations/rubber_duck/rubber_duck.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.gold.gold_resource.gold_resource',
    source: 'Terrain/Resources/Gold/Gold Resource/Gold_Resource.png',
    file: 'resources/gold/gold_resource/gold_resource.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.gold.gold_resource.gold_resource_highlight',
    source: 'Terrain/Resources/Gold/Gold Resource/Gold_Resource_Highlight.png',
    file: 'resources/gold/gold_resource/gold_resource_highlight.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.gold.gold_stones.gold_stone_1',
    source: 'Terrain/Resources/Gold/Gold Stones/Gold Stone 1.png',
    file: 'resources/gold/gold_stones/gold_stone_1.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.gold.gold_stones.gold_stone_1_highlight',
    source: 'Terrain/Resources/Gold/Gold Stones/Gold Stone 1_Highlight.png',
    file: 'resources/gold/gold_stones/gold_stone_1_highlight.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.gold.gold_stones.gold_stone_2',
    source: 'Terrain/Resources/Gold/Gold Stones/Gold Stone 2.png',
    file: 'resources/gold/gold_stones/gold_stone_2.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.gold.gold_stones.gold_stone_2_highlight',
    source: 'Terrain/Resources/Gold/Gold Stones/Gold Stone 2_Highlight.png',
    file: 'resources/gold/gold_stones/gold_stone_2_highlight.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.gold.gold_stones.gold_stone_3',
    source: 'Terrain/Resources/Gold/Gold Stones/Gold Stone 3.png',
    file: 'resources/gold/gold_stones/gold_stone_3.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.gold.gold_stones.gold_stone_3_highlight',
    source: 'Terrain/Resources/Gold/Gold Stones/Gold Stone 3_Highlight.png',
    file: 'resources/gold/gold_stones/gold_stone_3_highlight.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.gold.gold_stones.gold_stone_4',
    source: 'Terrain/Resources/Gold/Gold Stones/Gold Stone 4.png',
    file: 'resources/gold/gold_stones/gold_stone_4.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.gold.gold_stones.gold_stone_4_highlight',
    source: 'Terrain/Resources/Gold/Gold Stones/Gold Stone 4_Highlight.png',
    file: 'resources/gold/gold_stones/gold_stone_4_highlight.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.gold.gold_stones.gold_stone_5',
    source: 'Terrain/Resources/Gold/Gold Stones/Gold Stone 5.png',
    file: 'resources/gold/gold_stones/gold_stone_5.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.gold.gold_stones.gold_stone_5_highlight',
    source: 'Terrain/Resources/Gold/Gold Stones/Gold Stone 5_Highlight.png',
    file: 'resources/gold/gold_stones/gold_stone_5_highlight.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.gold.gold_stones.gold_stone_6',
    source: 'Terrain/Resources/Gold/Gold Stones/Gold Stone 6.png',
    file: 'resources/gold/gold_stones/gold_stone_6.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.gold.gold_stones.gold_stone_6_highlight',
    source: 'Terrain/Resources/Gold/Gold Stones/Gold Stone 6_Highlight.png',
    file: 'resources/gold/gold_stones/gold_stone_6_highlight.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.meat.meat_resource.meat_resource',
    source: 'Terrain/Resources/Meat/Meat Resource/Meat Resource.png',
    file: 'resources/meat/meat_resource/meat_resource.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.meat.sheep.sheep_grass',
    source: 'Terrain/Resources/Meat/Sheep/Sheep_Grass.png',
    file: 'resources/meat/sheep/sheep_grass.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.meat.sheep.sheep_idle',
    source: 'Terrain/Resources/Meat/Sheep/Sheep_Idle.png',
    file: 'resources/meat/sheep/sheep_idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.meat.sheep.sheep_move',
    source: 'Terrain/Resources/Meat/Sheep/Sheep_Move.png',
    file: 'resources/meat/sheep/sheep_move.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.tools.tool_01',
    source: 'Terrain/Resources/Tools/Tool_01.png',
    file: 'resources/tools/tool_01.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.tools.tool_02',
    source: 'Terrain/Resources/Tools/Tool_02.png',
    file: 'resources/tools/tool_02.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.tools.tool_03',
    source: 'Terrain/Resources/Tools/Tool_03.png',
    file: 'resources/tools/tool_03.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.tools.tool_04',
    source: 'Terrain/Resources/Tools/Tool_04.png',
    file: 'resources/tools/tool_04.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.wood.trees.stump_1',
    source: 'Terrain/Resources/Wood/Trees/Stump 1.png',
    file: 'resources/wood/trees/stump_1.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.wood.trees.stump_2',
    source: 'Terrain/Resources/Wood/Trees/Stump 2.png',
    file: 'resources/wood/trees/stump_2.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.wood.trees.stump_3',
    source: 'Terrain/Resources/Wood/Trees/Stump 3.png',
    file: 'resources/wood/trees/stump_3.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.wood.trees.stump_4',
    source: 'Terrain/Resources/Wood/Trees/Stump 4.png',
    file: 'resources/wood/trees/stump_4.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.wood.trees.tree1',
    source: 'Terrain/Resources/Wood/Trees/Tree1.png',
    file: 'resources/wood/trees/tree1.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.wood.trees.tree2',
    source: 'Terrain/Resources/Wood/Trees/Tree2.png',
    file: 'resources/wood/trees/tree2.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.wood.trees.tree3',
    source: 'Terrain/Resources/Wood/Trees/Tree3.png',
    file: 'resources/wood/trees/tree3.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.wood.trees.tree4',
    source: 'Terrain/Resources/Wood/Trees/Tree4.png',
    file: 'resources/wood/trees/tree4.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.resources.wood.wood_resource.wood_resource',
    source: 'Terrain/Resources/Wood/Wood Resource/Wood Resource.png',
    file: 'resources/wood/wood_resource/wood_resource.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.banners_store.banner',
    source: 'UI Elements/UI Banners from the store page/Banner/Banner.png',
    file: 'ui_banners_from_the_store_page/banner/banner.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.banners_store.slots',
    source: 'UI Elements/UI Banners from the store page/Banner/Slots.png',
    file: 'ui_banners_from_the_store_page/banner/slots.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.banners_store.ribbon_black',
    source: 'UI Elements/UI Banners from the store page/Ribbons/Ribbon_Black.png',
    file: 'ui_banners_from_the_store_page/ribbons/ribbon_black.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.banners_store.ribbon_blue',
    source: 'UI Elements/UI Banners from the store page/Ribbons/Ribbon_Blue.png',
    file: 'ui_banners_from_the_store_page/ribbons/ribbon_blue.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.banners_store.ribbon_purple',
    source: 'UI Elements/UI Banners from the store page/Ribbons/Ribbon_Purple.png',
    file: 'ui_banners_from_the_store_page/ribbons/ribbon_purple.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.banners_store.ribbon_red',
    source: 'UI Elements/UI Banners from the store page/Ribbons/Ribbon_Red.png',
    file: 'ui_banners_from_the_store_page/ribbons/ribbon_red.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.banners_store.ribbon_yellow',
    source: 'UI Elements/UI Banners from the store page/Ribbons/Ribbon_Yellow.png',
    file: 'ui_banners_from_the_store_page/ribbons/ribbon_yellow.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.banners.banner',
    source: 'UI Elements/UI Elements/Banners/Banner.png',
    file: 'ui_elements/banners/banner.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.banners.banner_slots',
    source: 'UI Elements/UI Elements/Banners/Banner_Slots.png',
    file: 'ui_elements/banners/banner_slots.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.bars.bigbar_base',
    source: 'UI Elements/UI Elements/Bars/BigBar_Base.png',
    file: 'ui_elements/bars/bigbar_base.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.bars.bigbar_fill',
    source: 'UI Elements/UI Elements/Bars/BigBar_Fill.png',
    file: 'ui_elements/bars/bigbar_fill.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.buttons.bigredbutton_pressed',
    source: 'UI Elements/UI Elements/Buttons/BigRedButton_Pressed.png',
    file: 'ui_elements/buttons/bigredbutton_pressed.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.buttons.bigredbutton_regular',
    source: 'UI Elements/UI Elements/Buttons/BigRedButton_Regular.png',
    file: 'ui_elements/buttons/bigredbutton_regular.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.buttons.smallblueroundbutton_pressed',
    source: 'UI Elements/UI Elements/Buttons/SmallBlueRoundButton_Pressed.png',
    file: 'ui_elements/buttons/smallblueroundbutton_pressed.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.buttons.smallblueroundbutton_regular',
    source: 'UI Elements/UI Elements/Buttons/SmallBlueRoundButton_Regular.png',
    file: 'ui_elements/buttons/smallblueroundbutton_regular.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.buttons.smallbluesquarebutton_pressed',
    source: 'UI Elements/UI Elements/Buttons/SmallBlueSquareButton_Pressed.png',
    file: 'ui_elements/buttons/smallbluesquarebutton_pressed.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.buttons.smallbluesquarebutton_regular',
    source: 'UI Elements/UI Elements/Buttons/SmallBlueSquareButton_Regular.png',
    file: 'ui_elements/buttons/smallbluesquarebutton_regular.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.buttons.smallredroundbutton_pressed',
    source: 'UI Elements/UI Elements/Buttons/SmallRedRoundButton_Pressed.png',
    file: 'ui_elements/buttons/smallredroundbutton_pressed.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.buttons.smallredroundbutton_regular',
    source: 'UI Elements/UI Elements/Buttons/SmallRedRoundButton_Regular.png',
    file: 'ui_elements/buttons/smallredroundbutton_regular.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.buttons.smallredsquarebutton_pressed',
    source: 'UI Elements/UI Elements/Buttons/SmallRedSquareButton_Pressed.png',
    file: 'ui_elements/buttons/smallredsquarebutton_pressed.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.buttons.smallredsquarebutton_regular',
    source: 'UI Elements/UI Elements/Buttons/SmallRedSquareButton_Regular.png',
    file: 'ui_elements/buttons/smallredsquarebutton_regular.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.buttons.tinyroundbluebutton',
    source: 'UI Elements/UI Elements/Buttons/TinyRoundBlueButton.png',
    file: 'ui_elements/buttons/tinyroundbluebutton.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.buttons.tinyroundredbutton',
    source: 'UI Elements/UI Elements/Buttons/TinyRoundRedButton.png',
    file: 'ui_elements/buttons/tinyroundredbutton.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.buttons.tinysquarebluebutton',
    source: 'UI Elements/UI Elements/Buttons/TinySquareBlueButton.png',
    file: 'ui_elements/buttons/tinysquarebluebutton.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.buttons.tinysquareredbutton',
    source: 'UI Elements/UI Elements/Buttons/TinySquareRedButton.png',
    file: 'ui_elements/buttons/tinysquareredbutton.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.cursors.cursor_01',
    source: 'UI Elements/UI Elements/Cursors/Cursor_01.png',
    file: 'ui_elements/cursors/cursor_01.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.cursors.cursor_02',
    source: 'UI Elements/UI Elements/Cursors/Cursor_02.png',
    file: 'ui_elements/cursors/cursor_02.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.cursors.cursor_03',
    source: 'UI Elements/UI Elements/Cursors/Cursor_03.png',
    file: 'ui_elements/cursors/cursor_03.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.cursors.cursor_04',
    source: 'UI Elements/UI Elements/Cursors/Cursor_04.png',
    file: 'ui_elements/cursors/cursor_04.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.human_avatars.avatars_01',
    source: 'UI Elements/UI Elements/Human Avatars/Avatars_01.png',
    file: 'ui_elements/human_avatars/avatars_01.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.human_avatars.avatars_02',
    source: 'UI Elements/UI Elements/Human Avatars/Avatars_02.png',
    file: 'ui_elements/human_avatars/avatars_02.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.human_avatars.avatars_03',
    source: 'UI Elements/UI Elements/Human Avatars/Avatars_03.png',
    file: 'ui_elements/human_avatars/avatars_03.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.human_avatars.avatars_04',
    source: 'UI Elements/UI Elements/Human Avatars/Avatars_04.png',
    file: 'ui_elements/human_avatars/avatars_04.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.human_avatars.avatars_05',
    source: 'UI Elements/UI Elements/Human Avatars/Avatars_05.png',
    file: 'ui_elements/human_avatars/avatars_05.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.human_avatars.avatars_06',
    source: 'UI Elements/UI Elements/Human Avatars/Avatars_06.png',
    file: 'ui_elements/human_avatars/avatars_06.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.human_avatars.avatars_07',
    source: 'UI Elements/UI Elements/Human Avatars/Avatars_07.png',
    file: 'ui_elements/human_avatars/avatars_07.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.human_avatars.avatars_08',
    source: 'UI Elements/UI Elements/Human Avatars/Avatars_08.png',
    file: 'ui_elements/human_avatars/avatars_08.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.human_avatars.avatars_09',
    source: 'UI Elements/UI Elements/Human Avatars/Avatars_09.png',
    file: 'ui_elements/human_avatars/avatars_09.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.human_avatars.avatars_10',
    source: 'UI Elements/UI Elements/Human Avatars/Avatars_10.png',
    file: 'ui_elements/human_avatars/avatars_10.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.human_avatars.avatars_11',
    source: 'UI Elements/UI Elements/Human Avatars/Avatars_11.png',
    file: 'ui_elements/human_avatars/avatars_11.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.human_avatars.avatars_12',
    source: 'UI Elements/UI Elements/Human Avatars/Avatars_12.png',
    file: 'ui_elements/human_avatars/avatars_12.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.human_avatars.avatars_13',
    source: 'UI Elements/UI Elements/Human Avatars/Avatars_13.png',
    file: 'ui_elements/human_avatars/avatars_13.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.human_avatars.avatars_14',
    source: 'UI Elements/UI Elements/Human Avatars/Avatars_14.png',
    file: 'ui_elements/human_avatars/avatars_14.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.human_avatars.avatars_15',
    source: 'UI Elements/UI Elements/Human Avatars/Avatars_15.png',
    file: 'ui_elements/human_avatars/avatars_15.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.human_avatars.avatars_16',
    source: 'UI Elements/UI Elements/Human Avatars/Avatars_16.png',
    file: 'ui_elements/human_avatars/avatars_16.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.human_avatars.avatars_17',
    source: 'UI Elements/UI Elements/Human Avatars/Avatars_17.png',
    file: 'ui_elements/human_avatars/avatars_17.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.human_avatars.avatars_18',
    source: 'UI Elements/UI Elements/Human Avatars/Avatars_18.png',
    file: 'ui_elements/human_avatars/avatars_18.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.human_avatars.avatars_19',
    source: 'UI Elements/UI Elements/Human Avatars/Avatars_19.png',
    file: 'ui_elements/human_avatars/avatars_19.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.human_avatars.avatars_20',
    source: 'UI Elements/UI Elements/Human Avatars/Avatars_20.png',
    file: 'ui_elements/human_avatars/avatars_20.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.human_avatars.avatars_21',
    source: 'UI Elements/UI Elements/Human Avatars/Avatars_21.png',
    file: 'ui_elements/human_avatars/avatars_21.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.human_avatars.avatars_22',
    source: 'UI Elements/UI Elements/Human Avatars/Avatars_22.png',
    file: 'ui_elements/human_avatars/avatars_22.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.human_avatars.avatars_23',
    source: 'UI Elements/UI Elements/Human Avatars/Avatars_23.png',
    file: 'ui_elements/human_avatars/avatars_23.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.human_avatars.avatars_24',
    source: 'UI Elements/UI Elements/Human Avatars/Avatars_24.png',
    file: 'ui_elements/human_avatars/avatars_24.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.human_avatars.avatars_25',
    source: 'UI Elements/UI Elements/Human Avatars/Avatars_25.png',
    file: 'ui_elements/human_avatars/avatars_25.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.icons.icon_01',
    source: 'UI Elements/UI Elements/Icons/Icon_01.png',
    file: 'ui_elements/icons/icon_01.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.icons.icon_02',
    source: 'UI Elements/UI Elements/Icons/Icon_02.png',
    file: 'ui_elements/icons/icon_02.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.icons.icon_03',
    source: 'UI Elements/UI Elements/Icons/Icon_03.png',
    file: 'ui_elements/icons/icon_03.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.icons.icon_04',
    source: 'UI Elements/UI Elements/Icons/Icon_04.png',
    file: 'ui_elements/icons/icon_04.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.icons.icon_05',
    source: 'UI Elements/UI Elements/Icons/Icon_05.png',
    file: 'ui_elements/icons/icon_05.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.icons.icon_06',
    source: 'UI Elements/UI Elements/Icons/Icon_06.png',
    file: 'ui_elements/icons/icon_06.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.icons.icon_07',
    source: 'UI Elements/UI Elements/Icons/Icon_07.png',
    file: 'ui_elements/icons/icon_07.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.icons.icon_08',
    source: 'UI Elements/UI Elements/Icons/Icon_08.png',
    file: 'ui_elements/icons/icon_08.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.icons.icon_09',
    source: 'UI Elements/UI Elements/Icons/Icon_09.png',
    file: 'ui_elements/icons/icon_09.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.icons.icon_10',
    source: 'UI Elements/UI Elements/Icons/Icon_10.png',
    file: 'ui_elements/icons/icon_10.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.icons.icon_11',
    source: 'UI Elements/UI Elements/Icons/Icon_11.png',
    file: 'ui_elements/icons/icon_11.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.icons.icon_12',
    source: 'UI Elements/UI Elements/Icons/Icon_12.png',
    file: 'ui_elements/icons/icon_12.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.papers.specialpaper',
    source: 'UI Elements/UI Elements/Papers/SpecialPaper.png',
    file: 'ui_elements/papers/specialpaper.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.ribbons.bigribbons',
    source: 'UI Elements/UI Elements/Ribbons/BigRibbons.png',
    file: 'ui_elements/ribbons/bigribbons.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.ribbons.smallribbons',
    source: 'UI Elements/UI Elements/Ribbons/SmallRibbons.png',
    file: 'ui_elements/ribbons/smallribbons.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.swords.swords',
    source: 'UI Elements/UI Elements/Swords/Swords.png',
    file: 'ui_elements/swords/swords.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.wood_table.woodtable_slots',
    source: 'UI Elements/UI Elements/Wood Table/WoodTable_Slots.png',
    file: 'ui_elements/wood_table/woodtable_slots.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'units.black.archer.archer_idle',
    source: 'Units/Black Units/Archer/Archer_Idle.png',
    file: 'black_units/archer/archer_idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.archer.archer_run',
    source: 'Units/Black Units/Archer/Archer_Run.png',
    file: 'black_units/archer/archer_run.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.archer.archer_shoot',
    source: 'Units/Black Units/Archer/Archer_Shoot.png',
    file: 'black_units/archer/archer_shoot.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.archer.arrow',
    source: 'Units/Black Units/Archer/Arrow.png',
    file: 'black_units/archer/arrow.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'units.black.lancer.downright_attack',
    source: 'Units/Black Units/Lancer/Lancer_DownRight_Attack.png',
    file: 'black_units/lancer/lancer_downright_attack.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.lancer.downright_defence',
    source: 'Units/Black Units/Lancer/Lancer_DownRight_Defence.png',
    file: 'black_units/lancer/lancer_downright_defence.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.lancer.down_attack',
    source: 'Units/Black Units/Lancer/Lancer_Down_Attack.png',
    file: 'black_units/lancer/lancer_down_attack.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.lancer.down_defence',
    source: 'Units/Black Units/Lancer/Lancer_Down_Defence.png',
    file: 'black_units/lancer/lancer_down_defence.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.lancer.idle',
    source: 'Units/Black Units/Lancer/Lancer_Idle.png',
    file: 'black_units/lancer/lancer_idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.lancer.right_attack',
    source: 'Units/Black Units/Lancer/Lancer_Right_Attack.png',
    file: 'black_units/lancer/lancer_right_attack.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.lancer.right_defence',
    source: 'Units/Black Units/Lancer/Lancer_Right_Defence.png',
    file: 'black_units/lancer/lancer_right_defence.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.lancer.run',
    source: 'Units/Black Units/Lancer/Lancer_Run.png',
    file: 'black_units/lancer/lancer_run.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.lancer.upright_attack',
    source: 'Units/Black Units/Lancer/Lancer_UpRight_Attack.png',
    file: 'black_units/lancer/lancer_upright_attack.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.lancer.upright_defence',
    source: 'Units/Black Units/Lancer/Lancer_UpRight_Defence.png',
    file: 'black_units/lancer/lancer_upright_defence.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.lancer.up_attack',
    source: 'Units/Black Units/Lancer/Lancer_Up_Attack.png',
    file: 'black_units/lancer/lancer_up_attack.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.lancer.up_defence',
    source: 'Units/Black Units/Lancer/Lancer_Up_Defence.png',
    file: 'black_units/lancer/lancer_up_defence.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.monk.heal',
    source: 'Units/Black Units/Monk/Heal.png',
    file: 'black_units/monk/heal.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.monk.heal_effect',
    source: 'Units/Black Units/Monk/Heal_Effect.png',
    file: 'black_units/monk/heal_effect.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.monk.idle',
    source: 'Units/Black Units/Monk/Idle.png',
    file: 'black_units/monk/idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.monk.run',
    source: 'Units/Black Units/Monk/Run.png',
    file: 'black_units/monk/run.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.pawn.pawn_idle_axe',
    source: 'Units/Black Units/Pawn/Pawn_Idle Axe.png',
    file: 'black_units/pawn/pawn_idle_axe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.pawn.pawn_idle_gold',
    source: 'Units/Black Units/Pawn/Pawn_Idle Gold.png',
    file: 'black_units/pawn/pawn_idle_gold.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.pawn.pawn_idle_hammer',
    source: 'Units/Black Units/Pawn/Pawn_Idle Hammer.png',
    file: 'black_units/pawn/pawn_idle_hammer.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.pawn.pawn_idle_knife',
    source: 'Units/Black Units/Pawn/Pawn_Idle Knife.png',
    file: 'black_units/pawn/pawn_idle_knife.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.pawn.pawn_idle_meat',
    source: 'Units/Black Units/Pawn/Pawn_Idle Meat.png',
    file: 'black_units/pawn/pawn_idle_meat.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.pawn.pawn_idle_pickaxe',
    source: 'Units/Black Units/Pawn/Pawn_Idle Pickaxe.png',
    file: 'black_units/pawn/pawn_idle_pickaxe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.pawn.pawn_idle_wood',
    source: 'Units/Black Units/Pawn/Pawn_Idle Wood.png',
    file: 'black_units/pawn/pawn_idle_wood.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.pawn.pawn_idle',
    source: 'Units/Black Units/Pawn/Pawn_Idle.png',
    file: 'black_units/pawn/pawn_idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.pawn.pawn_interact_axe',
    source: 'Units/Black Units/Pawn/Pawn_Interact Axe.png',
    file: 'black_units/pawn/pawn_interact_axe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.pawn.pawn_interact_hammer',
    source: 'Units/Black Units/Pawn/Pawn_Interact Hammer.png',
    file: 'black_units/pawn/pawn_interact_hammer.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.pawn.pawn_interact_knife',
    source: 'Units/Black Units/Pawn/Pawn_Interact Knife.png',
    file: 'black_units/pawn/pawn_interact_knife.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.pawn.pawn_interact_pickaxe',
    source: 'Units/Black Units/Pawn/Pawn_Interact Pickaxe.png',
    file: 'black_units/pawn/pawn_interact_pickaxe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.pawn.pawn_run_axe',
    source: 'Units/Black Units/Pawn/Pawn_Run Axe.png',
    file: 'black_units/pawn/pawn_run_axe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.pawn.pawn_run_gold',
    source: 'Units/Black Units/Pawn/Pawn_Run Gold.png',
    file: 'black_units/pawn/pawn_run_gold.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.pawn.pawn_run_hammer',
    source: 'Units/Black Units/Pawn/Pawn_Run Hammer.png',
    file: 'black_units/pawn/pawn_run_hammer.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.pawn.pawn_run_knife',
    source: 'Units/Black Units/Pawn/Pawn_Run Knife.png',
    file: 'black_units/pawn/pawn_run_knife.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.pawn.pawn_run_meat',
    source: 'Units/Black Units/Pawn/Pawn_Run Meat.png',
    file: 'black_units/pawn/pawn_run_meat.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.pawn.pawn_run_pickaxe',
    source: 'Units/Black Units/Pawn/Pawn_Run Pickaxe.png',
    file: 'black_units/pawn/pawn_run_pickaxe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.pawn.pawn_run_wood',
    source: 'Units/Black Units/Pawn/Pawn_Run Wood.png',
    file: 'black_units/pawn/pawn_run_wood.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.pawn.pawn_run',
    source: 'Units/Black Units/Pawn/Pawn_Run.png',
    file: 'black_units/pawn/pawn_run.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.warrior.warrior_attack1',
    source: 'Units/Black Units/Warrior/Warrior_Attack1.png',
    file: 'black_units/warrior/warrior_attack1.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.warrior.warrior_attack2',
    source: 'Units/Black Units/Warrior/Warrior_Attack2.png',
    file: 'black_units/warrior/warrior_attack2.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.warrior.warrior_guard',
    source: 'Units/Black Units/Warrior/Warrior_Guard.png',
    file: 'black_units/warrior/warrior_guard.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.warrior.warrior_idle',
    source: 'Units/Black Units/Warrior/Warrior_Idle.png',
    file: 'black_units/warrior/warrior_idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.black.warrior.warrior_run',
    source: 'Units/Black Units/Warrior/Warrior_Run.png',
    file: 'black_units/warrior/warrior_run.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.archer.archer_idle',
    source: 'Units/Blue Units/Archer/Archer_Idle.png',
    file: 'blue_units/archer/archer_idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.archer.archer_run',
    source: 'Units/Blue Units/Archer/Archer_Run.png',
    file: 'blue_units/archer/archer_run.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.archer.archer_shoot',
    source: 'Units/Blue Units/Archer/Archer_Shoot.png',
    file: 'blue_units/archer/archer_shoot.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.archer.arrow',
    source: 'Units/Blue Units/Archer/Arrow.png',
    file: 'blue_units/archer/arrow.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'units.blue.lancer.downright_attack',
    source: 'Units/Blue Units/Lancer/Lancer_DownRight_Attack.png',
    file: 'blue_units/lancer/lancer_downright_attack.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.lancer.downright_defence',
    source: 'Units/Blue Units/Lancer/Lancer_DownRight_Defence.png',
    file: 'blue_units/lancer/lancer_downright_defence.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.lancer.down_attack',
    source: 'Units/Blue Units/Lancer/Lancer_Down_Attack.png',
    file: 'blue_units/lancer/lancer_down_attack.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.lancer.down_defence',
    source: 'Units/Blue Units/Lancer/Lancer_Down_Defence.png',
    file: 'blue_units/lancer/lancer_down_defence.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.lancer.idle',
    source: 'Units/Blue Units/Lancer/Lancer_Idle.png',
    file: 'blue_units/lancer/lancer_idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.lancer.right_attack',
    source: 'Units/Blue Units/Lancer/Lancer_Right_Attack.png',
    file: 'blue_units/lancer/lancer_right_attack.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.lancer.right_defence',
    source: 'Units/Blue Units/Lancer/Lancer_Right_Defence.png',
    file: 'blue_units/lancer/lancer_right_defence.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.lancer.run',
    source: 'Units/Blue Units/Lancer/Lancer_Run.png',
    file: 'blue_units/lancer/lancer_run.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.lancer.upright_attack',
    source: 'Units/Blue Units/Lancer/Lancer_UpRight_Attack.png',
    file: 'blue_units/lancer/lancer_upright_attack.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.lancer.upright_defence',
    source: 'Units/Blue Units/Lancer/Lancer_UpRight_Defence.png',
    file: 'blue_units/lancer/lancer_upright_defence.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.lancer.up_attack',
    source: 'Units/Blue Units/Lancer/Lancer_Up_Attack.png',
    file: 'blue_units/lancer/lancer_up_attack.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.lancer.up_defence',
    source: 'Units/Blue Units/Lancer/Lancer_Up_Defence.png',
    file: 'blue_units/lancer/lancer_up_defence.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.monk.heal',
    source: 'Units/Blue Units/Monk/Heal.png',
    file: 'blue_units/monk/heal.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.monk.heal_effect',
    source: 'Units/Blue Units/Monk/Heal_Effect.png',
    file: 'blue_units/monk/heal_effect.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.monk.idle',
    source: 'Units/Blue Units/Monk/Idle.png',
    file: 'blue_units/monk/idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.monk.run',
    source: 'Units/Blue Units/Monk/Run.png',
    file: 'blue_units/monk/run.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.pawn.pawn_idle_axe',
    source: 'Units/Blue Units/Pawn/Pawn_Idle Axe.png',
    file: 'blue_units/pawn/pawn_idle_axe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.pawn.pawn_idle_gold',
    source: 'Units/Blue Units/Pawn/Pawn_Idle Gold.png',
    file: 'blue_units/pawn/pawn_idle_gold.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.pawn.pawn_idle_hammer',
    source: 'Units/Blue Units/Pawn/Pawn_Idle Hammer.png',
    file: 'blue_units/pawn/pawn_idle_hammer.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.pawn.pawn_idle_knife',
    source: 'Units/Blue Units/Pawn/Pawn_Idle Knife.png',
    file: 'blue_units/pawn/pawn_idle_knife.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.pawn.pawn_idle_meat',
    source: 'Units/Blue Units/Pawn/Pawn_Idle Meat.png',
    file: 'blue_units/pawn/pawn_idle_meat.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.pawn.pawn_idle_pickaxe',
    source: 'Units/Blue Units/Pawn/Pawn_Idle Pickaxe.png',
    file: 'blue_units/pawn/pawn_idle_pickaxe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.pawn.pawn_idle_wood',
    source: 'Units/Blue Units/Pawn/Pawn_Idle Wood.png',
    file: 'blue_units/pawn/pawn_idle_wood.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.pawn.pawn_idle',
    source: 'Units/Blue Units/Pawn/Pawn_Idle.png',
    file: 'blue_units/pawn/pawn_idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.pawn.pawn_interact_axe',
    source: 'Units/Blue Units/Pawn/Pawn_Interact Axe.png',
    file: 'blue_units/pawn/pawn_interact_axe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.pawn.pawn_interact_hammer',
    source: 'Units/Blue Units/Pawn/Pawn_Interact Hammer.png',
    file: 'blue_units/pawn/pawn_interact_hammer.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.pawn.pawn_interact_knife',
    source: 'Units/Blue Units/Pawn/Pawn_Interact Knife.png',
    file: 'blue_units/pawn/pawn_interact_knife.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.pawn.pawn_interact_pickaxe',
    source: 'Units/Blue Units/Pawn/Pawn_Interact Pickaxe.png',
    file: 'blue_units/pawn/pawn_interact_pickaxe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.pawn.pawn_run_axe',
    source: 'Units/Blue Units/Pawn/Pawn_Run Axe.png',
    file: 'blue_units/pawn/pawn_run_axe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.pawn.pawn_run_gold',
    source: 'Units/Blue Units/Pawn/Pawn_Run Gold.png',
    file: 'blue_units/pawn/pawn_run_gold.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.pawn.pawn_run_hammer',
    source: 'Units/Blue Units/Pawn/Pawn_Run Hammer.png',
    file: 'blue_units/pawn/pawn_run_hammer.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.pawn.pawn_run_knife',
    source: 'Units/Blue Units/Pawn/Pawn_Run Knife.png',
    file: 'blue_units/pawn/pawn_run_knife.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.pawn.pawn_run_meat',
    source: 'Units/Blue Units/Pawn/Pawn_Run Meat.png',
    file: 'blue_units/pawn/pawn_run_meat.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.pawn.pawn_run_pickaxe',
    source: 'Units/Blue Units/Pawn/Pawn_Run Pickaxe.png',
    file: 'blue_units/pawn/pawn_run_pickaxe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.pawn.pawn_run_wood',
    source: 'Units/Blue Units/Pawn/Pawn_Run Wood.png',
    file: 'blue_units/pawn/pawn_run_wood.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.pawn.pawn_run',
    source: 'Units/Blue Units/Pawn/Pawn_Run.png',
    file: 'blue_units/pawn/pawn_run.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.warrior.warrior_attack1',
    source: 'Units/Blue Units/Warrior/Warrior_Attack1.png',
    file: 'blue_units/warrior/warrior_attack1.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.warrior.warrior_attack2',
    source: 'Units/Blue Units/Warrior/Warrior_Attack2.png',
    file: 'blue_units/warrior/warrior_attack2.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.warrior.warrior_guard',
    source: 'Units/Blue Units/Warrior/Warrior_Guard.png',
    file: 'blue_units/warrior/warrior_guard.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.warrior.warrior_idle',
    source: 'Units/Blue Units/Warrior/Warrior_Idle.png',
    file: 'blue_units/warrior/warrior_idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.blue.warrior.warrior_run',
    source: 'Units/Blue Units/Warrior/Warrior_Run.png',
    file: 'blue_units/warrior/warrior_run.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.archer.archer_idle',
    source: 'Units/Purple Units/Archer/Archer_Idle.png',
    file: 'purple_units/archer/archer_idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.archer.archer_run',
    source: 'Units/Purple Units/Archer/Archer_Run.png',
    file: 'purple_units/archer/archer_run.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.archer.archer_shoot',
    source: 'Units/Purple Units/Archer/Archer_Shoot.png',
    file: 'purple_units/archer/archer_shoot.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.archer.arrow',
    source: 'Units/Purple Units/Archer/Arrow.png',
    file: 'purple_units/archer/arrow.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'units.purple.lancer.downright_attack',
    source: 'Units/Purple Units/Lancer/Lancer_DownRight_Attack.png',
    file: 'purple_units/lancer/lancer_downright_attack.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.lancer.downright_defence',
    source: 'Units/Purple Units/Lancer/Lancer_DownRight_Defence.png',
    file: 'purple_units/lancer/lancer_downright_defence.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.lancer.down_attack',
    source: 'Units/Purple Units/Lancer/Lancer_Down_Attack.png',
    file: 'purple_units/lancer/lancer_down_attack.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.lancer.down_defence',
    source: 'Units/Purple Units/Lancer/Lancer_Down_Defence.png',
    file: 'purple_units/lancer/lancer_down_defence.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.lancer.idle',
    source: 'Units/Purple Units/Lancer/Lancer_Idle.png',
    file: 'purple_units/lancer/lancer_idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.lancer.right_attack',
    source: 'Units/Purple Units/Lancer/Lancer_Right_Attack.png',
    file: 'purple_units/lancer/lancer_right_attack.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.lancer.right_defence',
    source: 'Units/Purple Units/Lancer/Lancer_Right_Defence.png',
    file: 'purple_units/lancer/lancer_right_defence.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.lancer.run',
    source: 'Units/Purple Units/Lancer/Lancer_Run.png',
    file: 'purple_units/lancer/lancer_run.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.lancer.upright_attack',
    source: 'Units/Purple Units/Lancer/Lancer_UpRight_Attack.png',
    file: 'purple_units/lancer/lancer_upright_attack.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.lancer.upright_defence',
    source: 'Units/Purple Units/Lancer/Lancer_UpRight_Defence.png',
    file: 'purple_units/lancer/lancer_upright_defence.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.lancer.up_attack',
    source: 'Units/Purple Units/Lancer/Lancer_Up_Attack.png',
    file: 'purple_units/lancer/lancer_up_attack.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.lancer.up_defence',
    source: 'Units/Purple Units/Lancer/Lancer_Up_Defence.png',
    file: 'purple_units/lancer/lancer_up_defence.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.monk.heal',
    source: 'Units/Purple Units/Monk/Heal.png',
    file: 'purple_units/monk/heal.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.monk.heal_effect',
    source: 'Units/Purple Units/Monk/Heal_Effect.png',
    file: 'purple_units/monk/heal_effect.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.monk.idle',
    source: 'Units/Purple Units/Monk/Idle.png',
    file: 'purple_units/monk/idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.monk.run',
    source: 'Units/Purple Units/Monk/Run.png',
    file: 'purple_units/monk/run.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.pawn.pawn_idle_axe',
    source: 'Units/Purple Units/Pawn/Pawn_Idle Axe.png',
    file: 'purple_units/pawn/pawn_idle_axe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.pawn.pawn_idle_gold',
    source: 'Units/Purple Units/Pawn/Pawn_Idle Gold.png',
    file: 'purple_units/pawn/pawn_idle_gold.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.pawn.pawn_idle_hammer',
    source: 'Units/Purple Units/Pawn/Pawn_Idle Hammer.png',
    file: 'purple_units/pawn/pawn_idle_hammer.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.pawn.pawn_idle_knife',
    source: 'Units/Purple Units/Pawn/Pawn_Idle Knife.png',
    file: 'purple_units/pawn/pawn_idle_knife.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.pawn.pawn_idle_meat',
    source: 'Units/Purple Units/Pawn/Pawn_Idle Meat.png',
    file: 'purple_units/pawn/pawn_idle_meat.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.pawn.pawn_idle_pickaxe',
    source: 'Units/Purple Units/Pawn/Pawn_Idle Pickaxe.png',
    file: 'purple_units/pawn/pawn_idle_pickaxe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.pawn.pawn_idle_wood',
    source: 'Units/Purple Units/Pawn/Pawn_Idle Wood.png',
    file: 'purple_units/pawn/pawn_idle_wood.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.pawn.pawn_idle',
    source: 'Units/Purple Units/Pawn/Pawn_Idle.png',
    file: 'purple_units/pawn/pawn_idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.pawn.pawn_interact_axe',
    source: 'Units/Purple Units/Pawn/Pawn_Interact Axe.png',
    file: 'purple_units/pawn/pawn_interact_axe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.pawn.pawn_interact_hammer',
    source: 'Units/Purple Units/Pawn/Pawn_Interact Hammer.png',
    file: 'purple_units/pawn/pawn_interact_hammer.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.pawn.pawn_interact_knife',
    source: 'Units/Purple Units/Pawn/Pawn_Interact Knife.png',
    file: 'purple_units/pawn/pawn_interact_knife.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.pawn.pawn_interact_pickaxe',
    source: 'Units/Purple Units/Pawn/Pawn_Interact Pickaxe.png',
    file: 'purple_units/pawn/pawn_interact_pickaxe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.pawn.pawn_run_axe',
    source: 'Units/Purple Units/Pawn/Pawn_Run Axe.png',
    file: 'purple_units/pawn/pawn_run_axe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.pawn.pawn_run_gold',
    source: 'Units/Purple Units/Pawn/Pawn_Run Gold.png',
    file: 'purple_units/pawn/pawn_run_gold.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.pawn.pawn_run_hammer',
    source: 'Units/Purple Units/Pawn/Pawn_Run Hammer.png',
    file: 'purple_units/pawn/pawn_run_hammer.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.pawn.pawn_run_knife',
    source: 'Units/Purple Units/Pawn/Pawn_Run Knife.png',
    file: 'purple_units/pawn/pawn_run_knife.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.pawn.pawn_run_meat',
    source: 'Units/Purple Units/Pawn/Pawn_Run Meat.png',
    file: 'purple_units/pawn/pawn_run_meat.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.pawn.pawn_run_pickaxe',
    source: 'Units/Purple Units/Pawn/Pawn_Run Pickaxe.png',
    file: 'purple_units/pawn/pawn_run_pickaxe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.pawn.pawn_run_wood',
    source: 'Units/Purple Units/Pawn/Pawn_Run Wood.png',
    file: 'purple_units/pawn/pawn_run_wood.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.pawn.pawn_run',
    source: 'Units/Purple Units/Pawn/Pawn_Run.png',
    file: 'purple_units/pawn/pawn_run.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.warrior.warrior_attack1',
    source: 'Units/Purple Units/Warrior/Warrior_Attack1.png',
    file: 'purple_units/warrior/warrior_attack1.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.warrior.warrior_attack2',
    source: 'Units/Purple Units/Warrior/Warrior_Attack2.png',
    file: 'purple_units/warrior/warrior_attack2.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.warrior.warrior_guard',
    source: 'Units/Purple Units/Warrior/Warrior_Guard.png',
    file: 'purple_units/warrior/warrior_guard.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.warrior.warrior_idle',
    source: 'Units/Purple Units/Warrior/Warrior_Idle.png',
    file: 'purple_units/warrior/warrior_idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.purple.warrior.warrior_run',
    source: 'Units/Purple Units/Warrior/Warrior_Run.png',
    file: 'purple_units/warrior/warrior_run.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.archer.archer_idle',
    source: 'Units/Red Units/Archer/Archer_Idle.png',
    file: 'red_units/archer/archer_idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.archer.archer_run',
    source: 'Units/Red Units/Archer/Archer_Run.png',
    file: 'red_units/archer/archer_run.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.archer.archer_shoot',
    source: 'Units/Red Units/Archer/Archer_Shoot.png',
    file: 'red_units/archer/archer_shoot.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.archer.arrow',
    source: 'Units/Red Units/Archer/Arrow.png',
    file: 'red_units/archer/arrow.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'units.red.lancer.downright_attack',
    source: 'Units/Red Units/Lancer/Lancer_DownRight_Attack.png',
    file: 'red_units/lancer/lancer_downright_attack.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.lancer.downright_defence',
    source: 'Units/Red Units/Lancer/Lancer_DownRight_Defence.png',
    file: 'red_units/lancer/lancer_downright_defence.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.lancer.down_attack',
    source: 'Units/Red Units/Lancer/Lancer_Down_Attack.png',
    file: 'red_units/lancer/lancer_down_attack.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.lancer.down_defence',
    source: 'Units/Red Units/Lancer/Lancer_Down_Defence.png',
    file: 'red_units/lancer/lancer_down_defence.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.lancer.idle',
    source: 'Units/Red Units/Lancer/Lancer_Idle.png',
    file: 'red_units/lancer/lancer_idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.lancer.right_attack',
    source: 'Units/Red Units/Lancer/Lancer_Right_Attack.png',
    file: 'red_units/lancer/lancer_right_attack.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.lancer.right_defence',
    source: 'Units/Red Units/Lancer/Lancer_Right_Defence.png',
    file: 'red_units/lancer/lancer_right_defence.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.lancer.run',
    source: 'Units/Red Units/Lancer/Lancer_Run.png',
    file: 'red_units/lancer/lancer_run.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.lancer.upright_attack',
    source: 'Units/Red Units/Lancer/Lancer_UpRight_Attack.png',
    file: 'red_units/lancer/lancer_upright_attack.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.lancer.upright_defence',
    source: 'Units/Red Units/Lancer/Lancer_UpRight_Defence.png',
    file: 'red_units/lancer/lancer_upright_defence.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.lancer.up_attack',
    source: 'Units/Red Units/Lancer/Lancer_Up_Attack.png',
    file: 'red_units/lancer/lancer_up_attack.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.lancer.up_defence',
    source: 'Units/Red Units/Lancer/Lancer_Up_Defence.png',
    file: 'red_units/lancer/lancer_up_defence.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.monk.heal',
    source: 'Units/Red Units/Monk/Heal.png',
    file: 'red_units/monk/heal.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.monk.heal_effect',
    source: 'Units/Red Units/Monk/Heal_Effect.png',
    file: 'red_units/monk/heal_effect.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.monk.idle',
    source: 'Units/Red Units/Monk/Idle.png',
    file: 'red_units/monk/idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.monk.run',
    source: 'Units/Red Units/Monk/Run.png',
    file: 'red_units/monk/run.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.pawn.pawn_idle_axe',
    source: 'Units/Red Units/Pawn/Pawn_Idle Axe.png',
    file: 'red_units/pawn/pawn_idle_axe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.pawn.pawn_idle_gold',
    source: 'Units/Red Units/Pawn/Pawn_Idle Gold.png',
    file: 'red_units/pawn/pawn_idle_gold.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.pawn.pawn_idle_hammer',
    source: 'Units/Red Units/Pawn/Pawn_Idle Hammer.png',
    file: 'red_units/pawn/pawn_idle_hammer.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.pawn.pawn_idle_knife',
    source: 'Units/Red Units/Pawn/Pawn_Idle Knife.png',
    file: 'red_units/pawn/pawn_idle_knife.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.pawn.pawn_idle_meat',
    source: 'Units/Red Units/Pawn/Pawn_Idle Meat.png',
    file: 'red_units/pawn/pawn_idle_meat.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.pawn.pawn_idle_pickaxe',
    source: 'Units/Red Units/Pawn/Pawn_Idle Pickaxe.png',
    file: 'red_units/pawn/pawn_idle_pickaxe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.pawn.pawn_idle_wood',
    source: 'Units/Red Units/Pawn/Pawn_Idle Wood.png',
    file: 'red_units/pawn/pawn_idle_wood.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.pawn.pawn_idle',
    source: 'Units/Red Units/Pawn/Pawn_Idle.png',
    file: 'red_units/pawn/pawn_idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.pawn.pawn_interact_axe',
    source: 'Units/Red Units/Pawn/Pawn_Interact Axe.png',
    file: 'red_units/pawn/pawn_interact_axe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.pawn.pawn_interact_hammer',
    source: 'Units/Red Units/Pawn/Pawn_Interact Hammer.png',
    file: 'red_units/pawn/pawn_interact_hammer.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.pawn.pawn_interact_knife',
    source: 'Units/Red Units/Pawn/Pawn_Interact Knife.png',
    file: 'red_units/pawn/pawn_interact_knife.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.pawn.pawn_interact_pickaxe',
    source: 'Units/Red Units/Pawn/Pawn_Interact Pickaxe.png',
    file: 'red_units/pawn/pawn_interact_pickaxe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.pawn.pawn_run_axe',
    source: 'Units/Red Units/Pawn/Pawn_Run Axe.png',
    file: 'red_units/pawn/pawn_run_axe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.pawn.pawn_run_gold',
    source: 'Units/Red Units/Pawn/Pawn_Run Gold.png',
    file: 'red_units/pawn/pawn_run_gold.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.pawn.pawn_run_hammer',
    source: 'Units/Red Units/Pawn/Pawn_Run Hammer.png',
    file: 'red_units/pawn/pawn_run_hammer.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.pawn.pawn_run_knife',
    source: 'Units/Red Units/Pawn/Pawn_Run Knife.png',
    file: 'red_units/pawn/pawn_run_knife.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.pawn.pawn_run_meat',
    source: 'Units/Red Units/Pawn/Pawn_Run Meat.png',
    file: 'red_units/pawn/pawn_run_meat.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.pawn.pawn_run_pickaxe',
    source: 'Units/Red Units/Pawn/Pawn_Run Pickaxe.png',
    file: 'red_units/pawn/pawn_run_pickaxe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.pawn.pawn_run_wood',
    source: 'Units/Red Units/Pawn/Pawn_Run Wood.png',
    file: 'red_units/pawn/pawn_run_wood.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.pawn.pawn_run',
    source: 'Units/Red Units/Pawn/Pawn_Run.png',
    file: 'red_units/pawn/pawn_run.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.warrior.warrior_attack1',
    source: 'Units/Red Units/Warrior/Warrior_Attack1.png',
    file: 'red_units/warrior/warrior_attack1.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.warrior.warrior_attack2',
    source: 'Units/Red Units/Warrior/Warrior_Attack2.png',
    file: 'red_units/warrior/warrior_attack2.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.warrior.warrior_guard',
    source: 'Units/Red Units/Warrior/Warrior_Guard.png',
    file: 'red_units/warrior/warrior_guard.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.warrior.warrior_idle',
    source: 'Units/Red Units/Warrior/Warrior_Idle.png',
    file: 'red_units/warrior/warrior_idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.red.warrior.warrior_run',
    source: 'Units/Red Units/Warrior/Warrior_Run.png',
    file: 'red_units/warrior/warrior_run.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.archer.archer_idle',
    source: 'Units/Yellow Units/Archer/Archer_Idle.png',
    file: 'yellow_units/archer/archer_idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.archer.archer_run',
    source: 'Units/Yellow Units/Archer/Archer_Run.png',
    file: 'yellow_units/archer/archer_run.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.archer.archer_shoot',
    source: 'Units/Yellow Units/Archer/Archer_Shoot.png',
    file: 'yellow_units/archer/archer_shoot.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.archer.arrow',
    source: 'Units/Yellow Units/Archer/Arrow.png',
    file: 'yellow_units/archer/arrow.png',
    kind: 'static',
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'units.yellow.lancer.downright_attack',
    source: 'Units/Yellow Units/Lancer/Lancer_DownRight_Attack.png',
    file: 'yellow_units/lancer/lancer_downright_attack.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.lancer.downright_defence',
    source: 'Units/Yellow Units/Lancer/Lancer_DownRight_Defence.png',
    file: 'yellow_units/lancer/lancer_downright_defence.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.lancer.down_attack',
    source: 'Units/Yellow Units/Lancer/Lancer_Down_Attack.png',
    file: 'yellow_units/lancer/lancer_down_attack.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.lancer.down_defence',
    source: 'Units/Yellow Units/Lancer/Lancer_Down_Defence.png',
    file: 'yellow_units/lancer/lancer_down_defence.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.lancer.idle',
    source: 'Units/Yellow Units/Lancer/Lancer_Idle.png',
    file: 'yellow_units/lancer/lancer_idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.lancer.right_attack',
    source: 'Units/Yellow Units/Lancer/Lancer_Right_Attack.png',
    file: 'yellow_units/lancer/lancer_right_attack.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.lancer.right_defence',
    source: 'Units/Yellow Units/Lancer/Lancer_Right_Defence.png',
    file: 'yellow_units/lancer/lancer_right_defence.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.lancer.run',
    source: 'Units/Yellow Units/Lancer/Lancer_Run.png',
    file: 'yellow_units/lancer/lancer_run.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.lancer.upright_attack',
    source: 'Units/Yellow Units/Lancer/Lancer_UpRight_Attack.png',
    file: 'yellow_units/lancer/lancer_upright_attack.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.lancer.upright_defence',
    source: 'Units/Yellow Units/Lancer/Lancer_UpRight_Defence.png',
    file: 'yellow_units/lancer/lancer_upright_defence.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.lancer.up_attack',
    source: 'Units/Yellow Units/Lancer/Lancer_Up_Attack.png',
    file: 'yellow_units/lancer/lancer_up_attack.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.lancer.up_defence',
    source: 'Units/Yellow Units/Lancer/Lancer_Up_Defence.png',
    file: 'yellow_units/lancer/lancer_up_defence.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.monk.heal',
    source: 'Units/Yellow Units/Monk/Heal.png',
    file: 'yellow_units/monk/heal.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.monk.heal_effect',
    source: 'Units/Yellow Units/Monk/Heal_Effect.png',
    file: 'yellow_units/monk/heal_effect.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.monk.idle',
    source: 'Units/Yellow Units/Monk/Idle.png',
    file: 'yellow_units/monk/idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.monk.run',
    source: 'Units/Yellow Units/Monk/Run.png',
    file: 'yellow_units/monk/run.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.pawn.pawn_idle_axe',
    source: 'Units/Yellow Units/Pawn/Pawn_Idle Axe.png',
    file: 'yellow_units/pawn/pawn_idle_axe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.pawn.pawn_idle_gold',
    source: 'Units/Yellow Units/Pawn/Pawn_Idle Gold.png',
    file: 'yellow_units/pawn/pawn_idle_gold.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.pawn.pawn_idle_hammer',
    source: 'Units/Yellow Units/Pawn/Pawn_Idle Hammer.png',
    file: 'yellow_units/pawn/pawn_idle_hammer.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.pawn.pawn_idle_knife',
    source: 'Units/Yellow Units/Pawn/Pawn_Idle Knife.png',
    file: 'yellow_units/pawn/pawn_idle_knife.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.pawn.pawn_idle_meat',
    source: 'Units/Yellow Units/Pawn/Pawn_Idle Meat.png',
    file: 'yellow_units/pawn/pawn_idle_meat.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.pawn.pawn_idle_pickaxe',
    source: 'Units/Yellow Units/Pawn/Pawn_Idle Pickaxe.png',
    file: 'yellow_units/pawn/pawn_idle_pickaxe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.pawn.pawn_idle_wood',
    source: 'Units/Yellow Units/Pawn/Pawn_Idle Wood.png',
    file: 'yellow_units/pawn/pawn_idle_wood.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.pawn.pawn_idle',
    source: 'Units/Yellow Units/Pawn/Pawn_Idle.png',
    file: 'yellow_units/pawn/pawn_idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.pawn.pawn_interact_axe',
    source: 'Units/Yellow Units/Pawn/Pawn_Interact Axe.png',
    file: 'yellow_units/pawn/pawn_interact_axe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.pawn.pawn_interact_hammer',
    source: 'Units/Yellow Units/Pawn/Pawn_Interact Hammer.png',
    file: 'yellow_units/pawn/pawn_interact_hammer.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.pawn.pawn_interact_knife',
    source: 'Units/Yellow Units/Pawn/Pawn_Interact Knife.png',
    file: 'yellow_units/pawn/pawn_interact_knife.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.pawn.pawn_interact_pickaxe',
    source: 'Units/Yellow Units/Pawn/Pawn_Interact Pickaxe.png',
    file: 'yellow_units/pawn/pawn_interact_pickaxe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.pawn.pawn_run_axe',
    source: 'Units/Yellow Units/Pawn/Pawn_Run Axe.png',
    file: 'yellow_units/pawn/pawn_run_axe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.pawn.pawn_run_gold',
    source: 'Units/Yellow Units/Pawn/Pawn_Run Gold.png',
    file: 'yellow_units/pawn/pawn_run_gold.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.pawn.pawn_run_hammer',
    source: 'Units/Yellow Units/Pawn/Pawn_Run Hammer.png',
    file: 'yellow_units/pawn/pawn_run_hammer.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.pawn.pawn_run_knife',
    source: 'Units/Yellow Units/Pawn/Pawn_Run Knife.png',
    file: 'yellow_units/pawn/pawn_run_knife.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.pawn.pawn_run_meat',
    source: 'Units/Yellow Units/Pawn/Pawn_Run Meat.png',
    file: 'yellow_units/pawn/pawn_run_meat.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.pawn.pawn_run_pickaxe',
    source: 'Units/Yellow Units/Pawn/Pawn_Run Pickaxe.png',
    file: 'yellow_units/pawn/pawn_run_pickaxe.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.pawn.pawn_run_wood',
    source: 'Units/Yellow Units/Pawn/Pawn_Run Wood.png',
    file: 'yellow_units/pawn/pawn_run_wood.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.pawn.pawn_run',
    source: 'Units/Yellow Units/Pawn/Pawn_Run.png',
    file: 'yellow_units/pawn/pawn_run.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.warrior.warrior_attack1',
    source: 'Units/Yellow Units/Warrior/Warrior_Attack1.png',
    file: 'yellow_units/warrior/warrior_attack1.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.warrior.warrior_attack2',
    source: 'Units/Yellow Units/Warrior/Warrior_Attack2.png',
    file: 'yellow_units/warrior/warrior_attack2.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.warrior.warrior_guard',
    source: 'Units/Yellow Units/Warrior/Warrior_Guard.png',
    file: 'yellow_units/warrior/warrior_guard.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.warrior.warrior_idle',
    source: 'Units/Yellow Units/Warrior/Warrior_Idle.png',
    file: 'yellow_units/warrior/warrior_idle.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  },
  {
    key: 'units.yellow.warrior.warrior_run',
    source: 'Units/Yellow Units/Warrior/Warrior_Run.png',
    file: 'yellow_units/warrior/warrior_run.png',
    kind: 'strip',
    duration: 100,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  }
]
