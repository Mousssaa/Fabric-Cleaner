/**
 * Release gate for in-app updates.
 *
 * Fabric Cleaner's GitHub repository is private and has no public release
 * feed yet, so electron-updater would only get 404/401 responses. Until the
 * first public release, background checks are off and manual checks report a
 * clear "not available yet" status without touching the network.
 *
 * Flip UPDATE_FEED_PUBLISHED to true in the release that ships a public feed.
 * FABRIC_CLEANER_ENABLE_UPDATES=1 enables the feed for local release testing.
 */
export const UPDATE_FEED_PUBLISHED = false

export const UPDATE_FEED_UNAVAILABLE_MESSAGE =
  'Automatic updates are not available yet. Fabric Cleaner has no public release feed.'

export function isUpdateFeedEnabled(): boolean {
  return UPDATE_FEED_PUBLISHED || process.env.FABRIC_CLEANER_ENABLE_UPDATES === '1'
}
