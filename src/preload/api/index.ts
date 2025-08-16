import * as Misc from './misc'
import * as Helpers from './helpers'
import * as Library from './library'
import * as Menu from './menu'
import * as Settings from './settings'
import * as Wine from './wine'
import * as DownloadManager from './downloadmanager'
import * as Zoom from './zoom' // Added Zoom import

export default {
  ...Misc,
  ...Helpers,
  ...Library,
  ...Menu,
  ...Settings,
  ...Wine,
  ...DownloadManager,
  ...Zoom // Added Zoom to export
}
