import type { KuduAPI } from '../../../preload/index'

declare global {
  interface Window {
    kudu: KuduAPI
  }
}

export const api = window.kudu
