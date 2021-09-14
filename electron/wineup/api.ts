/**
 * @file  Defines functions to fetch, download or remove available
 *        wine-ge releases.
 */

import * as axios from 'axios'
import { WINEGE_URL } from './constants';
import { logError, logInfo } from '../logger';

/**
 * Interface contains information about a release
 * - version
 * - date
 * - download link
 * - checksum link
 * - size
 */
interface ReleaseData {
    version:    string;
    date:       string;
    download:   string;
    size:       number;
    checksum:   string;
}

/**
 * Fetches data (@see ReleaseData) of latest or given release.
 * @param tag   release to fetch data for
 * @returns     config of @see ReleaseData
 */
async function fetchData(tag?: string): Promise<ReleaseData> {
  const release_data = {} as ReleaseData;

  const url = WINEGE_URL + (tag ? `/tags/${tag}` : '/latest');
  try {
    logInfo(`Fetch wine-ge tag from ${url}`);
    const data = await axios.default.get(url);

    if (!data.data.tag_name) {
      logError(`Could not fetch given tag (${tag}) of wine-ge`)
      return;
    }

    release_data.version = data.data.tag_name;
    release_data.date = data.data.published_at.split('T')[0];

    for (const asset of data.data.assets) {
      if (asset.name.endsWith('sha512sum')) {
        release_data.checksum = asset.browser_download_url;
      }
      else if (asset.name.endsWith('tar.gz') || asset.name.endsWith('tar.xz')) {
        release_data.download = asset.browser_download_url;
        release_data.size = asset.size;
      }
    }
    return release_data;
  }
  catch (error) {
    logError(error);
    logError(`Could not fetch given tag (${tag}) of wine-ge`)
    return;
  }
}

/**
 * Fetches all available wine-ge releases.
 * @param count max pages to fetch for available releases (default: 100)
 * @returns string list of available releases
 */
async function fetchReleases(count = '100'): Promise<string[]> {
  const releases = [];
  try {
    const data = await axios.default.get(WINEGE_URL + '?per_page=' + count)
    for (const release of data.data) {
      releases.push(release.tag_name);
    }
  }
  catch (error) {
    logError(error);
    logError('Could not fetch available wine-ge versions.');
  }
  return releases;
}

export {
  fetchData,
  fetchReleases
}