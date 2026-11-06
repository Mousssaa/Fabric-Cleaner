import type { FabricAPI } from '../../../preload/index'

declare global {
  interface Window {
    fabric: FabricAPI
  }
}

export const api = window.fabric
