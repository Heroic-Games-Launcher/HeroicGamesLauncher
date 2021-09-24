import { fetchReleases } from '../../winege/api';
import { test_data_release_list } from './github-api-test-data.json';
import * as axios from 'axios'

describe('api- fetchReleases', () => {
  test('fetch releases succesfully', async () => {
    axios.default.get = jest.fn().mockResolvedValue(test_data_release_list);
    const releases = await fetchReleases();
    expect(axios.default.get).toBeCalledWith('https://api.github.com/repos/GloriousEggroll/wine-ge-custom/releases?per_page=100');
    expect(releases).not.toBe([]);
    expect(releases.length).toBeGreaterThan(0);
    expect(releases[2].version).toContain('6.16-GE-1');
  })

  test('fetch releases failed because of 404', async () => {
    axios.default.get = jest.fn().mockRejectedValue('Could not fetch tag 404');
    console.error = jest.fn();
    const releases = await fetchReleases();
    expect(axios.default.get).toBeCalledWith('https://api.github.com/repos/GloriousEggroll/wine-ge-custom/releases?per_page=100');
    expect(releases).toBe(undefined);
    expect(console.error).toBeCalledWith('ERROR: Could not fetch available wine-ge versions.');
    expect(console.error).toBeCalledWith('ERROR: Could not fetch tag 404');
  })
})