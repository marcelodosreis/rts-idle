export function loadAssetBrowserPage() {
  return import('../pages/laboratory/browser/asset-browser-page').then((module) => ({
    default: module.AssetBrowserPage
  }))
}

export function preloadLaboratoryPage(): void {
  void loadAssetBrowserPage()
}
