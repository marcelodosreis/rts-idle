---
status: open
classe: presentation
barreira: null
regressao:
  - tests/unit/renderer/asset-pipeline.test.ts
---

# PixiJS Asset Cache Lifecycle

## Summary

Renderer teardown destroyed textures obtained from PixiJS's global asset cache,
leaving later mounts able to receive invalid cached textures.

## Symptom

Unmounting and remounting a renderer in the same page could produce missing
sprites or terrain after the first renderer was disposed.

## Root cause

`AssetLibrary.destroy()` called `Texture.destroy()` on resources loaded through
`Assets.load()`, while `Application.destroy()` also requested texture cleanup.
Neither operation removed ownership safely from the global cache.

## What we missed

The lifecycle tests covered page reloads, not a same-page remount using the
same PixiJS asset cache.

## Fix

The asset library now releases local references without destroying global cache
textures. Renderer teardown destroys display objects without destroying those
shared textures and uses explicit PixiJS v8 application destroy options.

## Regression

`tests/unit/renderer/asset-pipeline.test.ts` asserts that disposing an asset library does
not destroy a texture returned by the global cache.

## Prevention

Asset ownership remains explicit: display objects are destroyed by the
renderer, while cached assets are not invalidated by an individual library.

## Verification

Focused asset lifecycle tests, typecheck, lint, and renderer lifecycle E2E.
