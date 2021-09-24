/**
 * @file  Defines functions to fetch, download or remove available
 *        wine-ge releases.
 */

import * as axios from 'axios';
import Store from 'electron-store';
import { WINEGE_URL } from './constants';
import { logError, logInfo } from '../logger';
import { WineGEInfo } from './types';

const wineGEStore = new Store({
  cwd: 'store',
  name: 'winege'
})

/**
 * Fetches all available wine-ge releases.
 * @param count max releases to fetch for (default: 100)
 * @returns ReleaseData list of available releases
 */
async function fetchReleases(count = '100'): Promise<WineGEInfo[]> {
  const releases :WineGEInfo[] = [];
  try {
    const data = await axios.default.get(WINEGE_URL + '?per_page=' + count)

    for (const release of data.data) {
      const release_data = {} as WineGEInfo;
      release_data.version = release.tag_name;
      release_data.date = release.published_at.split('T')[0];
      release_data.disksize = 0;
      release_data.hasUpdate = false;
      release_data.isInstalled = false;

      for (const asset of release.assets) {
        if (asset.name.endsWith('sha512sum')) {
          release_data.checksum = asset.browser_download_url;
        }
        else if (asset.name.endsWith('tar.gz') || asset.name.endsWith('tar.xz')) {
          release_data.download = asset.browser_download_url;
          release_data.downsize = asset.size;
        }
      }

      releases.push(release_data);
    }
  }
  catch (error) {
    logError(error);
    logError('Could not fetch available wine-ge versions.');
    return;
  }

  logInfo('Updating wine-ge list')

  if(wineGEStore.has('winege'))
  {
    const old_releases = wineGEStore.get('winege') as WineGEInfo[];

    old_releases.forEach((old) =>
    {
      const index = releases.findIndex((release) => {
        return release.version === old.version;
      })

      if(index)
      {
        releases[index].installDir = old.installDir;
        releases[index].isInstalled = old.isInstalled;
        if(releases[index].checksum !== old.checksum)
        {
          releases[index].hasUpdate = true;
        }
      }
      else
      {
        releases.push(old);
      }
    });

    wineGEStore.delete('winege');
  }

  wineGEStore.set('winege', releases);

  logInfo('wine-ge list updated');
  return releases;
}

// PROTOTYPE OF DOWNLOAD FUNCTION

// async function downloadWineGE(releases: ReleaseData[], installDir: string, version?: string): Promise<ReleaseData>
// {
//   let release_to_download = undefined;

//   // Check if installDir exist
//   if(!fs.existsSync(installDir))
//   {
//     logError(`Installation directory ${installDir} doesn't exist!`);
//     return undefined;
//   }

//   // check if provided version is avaiable
//   if(version)
//   {
//     for (const release of releases)
//     {
//       if(release.version === version)
//       {
//         release_to_download = release;
//         break;
//       }
//     }

//     if(!release_to_download)
//     {
//       logError(`Given version (${version}) is not available to download!`);
//       return undefined;
//     }
//   }
//   else
//   {
//     release_to_download = releases[0]; // latest release by default
//   }

//   if (!release_to_download.download)
//   {
//     logError(`Didn't find binary for ${release_to_download.version}.`)
//     return undefined;
//   }

//   const winedir = installDir + '/Wine-' + release_to_download.version;
//   const checksum_dir = winedir + '/sha512sum'
//   // Fixme: axios not fetching the content of the page as text here
//   // the later checksum check fails
//   const source_checksum = release_to_download.checksum
//     ? (await axios.default.get(release_to_download.checksum)).data
//     : undefined
//   const local_checksum = fs.existsSync(checksum_dir)
//     ? fs.readFileSync(checksum_dir).toString()
//     : undefined

//   // Check if it already exist
//   if (fs.existsSync(winedir)) {
//     if (local_checksum && source_checksum) {
//       if (source_checksum.includes(local_checksum))
//       {
//         logInfo(`Proton-${release_to_download.version} already installed`);
//         logInfo(`No hotfix found`);
//         return;
//       }
//       logInfo('Hotfix available');
//     }
//     else
//     {
//       logInfo(`Proton-${release_to_download.version} already installed`);
//       return;
//     }
//   }

//   // Prepare destination where to download tar file
//   const tar_file = installDir + release_to_download.download.split('/').slice(-1)[0];

//   if(fs.existsSync(tar_file))
//   {
//     try {
//       fs.unlinkSync(tar_file);
//     } catch(error) {
//       logError(error);
//       logError(`Failed to remove already existing ${tar_file}!`);
//       return undefined;
//     }
//   }

//   // Download
//   try {
//     await execAsync(`curl -L -o ${tar_file} ${release_to_download.download}`);
//   }
//   catch (error)
//   {
//     logError(error);
//     logError(`Download of Wine-${release_to_download.version} failed!`);
//   }

//   // Check if download checksum is correct
//   const fileBuffer = fs.readFileSync(tar_file);
//   const hashSum = crypto.createHash('sha256');
//   hashSum.update(fileBuffer);

//   const download_checksum = hashSum.digest('hex');
//   logInfo(download_checksum);
//   logInfo(source_checksum);
//   if (!source_checksum.includes(download_checksum))
//   {
//     logError('Checksum verification failed');
//     try {
//       fs.unlinkSync(tar_file);
//     } catch(error) {
//       logError(error);
//     }
//     return undefined;
//   }

//   // Unzip
//   if (fs.existsSync(winedir))
//   {
//     try {
//       fs.rmdirSync(winedir, { recursive: true });
//     } catch(error) {
//       logError(error);
//       logError(`Failed to remove already existing folder ${winedir}!`);
//       return undefined;
//     }
//   }

//   try {
//     if(tar_file.endsWith('tar.gz'))
//     {
//       await execAsync(`tar -zxf ${tar_file} --directory ${installDir}`);
//     }
//     else if(tar_file.endsWith('tar.xz'))
//     {
//       await execAsync(`tar -jxf ${tar_file} --directory ${installDir}`);
//     }
//     logInfo(`Unzip ${tar_file.split('/').slice(-1)[0]} succesfully to ${installDir}`);
//   }
//   catch (error)
//   {
//     logError(error);
//     logError(`Unzip of ${tar_file.split('/').slice(-1)[0]} failed!`);
//     return undefined;
//   }

//   // Clean up
//   try {
//     fs.unlinkSync(tar_file);
//   } catch(error) {
//     logError(error);
//     logError(`Failed to remove ${tar_file}!`);
//   }

//   return release_to_download;
// }


export {
  //downloadWineGE,
  fetchReleases
}