export function loadAssetBrowserPage() {
  return import('../pages/laboratory/browser/AssetBrowserPage')
}

export function preloadLaboratoryPage(): void {
  void loadAssetBrowserPage()
}
