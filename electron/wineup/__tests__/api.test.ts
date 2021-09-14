import { fetchReleases, fetchData } from '../api';
import { test_data_release_list, test_data_release } from './github-api-test-data.json';
import * as axios from 'axios'

describe('api', () => {
  test('fetch releases succesfully', async () => {
    axios.default.get = jest.fn().mockResolvedValue(test_data_release_list);
    const releases = await fetchReleases();
    expect(axios.default.get).toBeCalledWith('https://api.github.com/repos/GloriousEggroll/wine-ge-custom/releases?per_page=100');
    expect(releases).not.toBe([]);
    expect(releases.length).toBeGreaterThan(0);
    expect(releases).toContain('6.16-GE-1');
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

  test('fetch data succesfully with given tag', async () => {
    axios.default.get = jest.fn().mockResolvedValue(test_data_release);
    const data = await fetchData('6.16-GE-1');
    expect(axios.default.get).toBeCalledWith('https://api.github.com/repos/GloriousEggroll/wine-ge-custom/releases/tags/6.16-GE-1');
    expect(data.version).toBe('6.16-GE-1');
    expect(data.checksum).toBe(
      'https://github.com/GloriousEggroll/wine-ge-custom/releases/download/6.16-GE-1/lutris-ge-6.16-1-x86_64.sha512sum');
    expect(data.download).toBe(
      'https://github.com/GloriousEggroll/wine-ge-custom/releases/download/6.16-GE-1/lutris-ge-6.16-1-x86_64.tar.xz');
    expect(data.date).toBe('2021-08-29');
    expect(data.size).toBe(89977056);
  })

  test('fetch data failed because of wrong tag', async () => {
    axios.default.get = jest.fn().mockResolvedValue(test_data_release);
    console.error = jest.fn();
    const data = await fetchData('invalid');
    expect(axios.default.get).toBeCalledWith('https://api.github.com/repos/GloriousEggroll/wine-ge-custom/releases/tags/invalid');
    expect(data).toBe(undefined);
    expect(console.error).toBeCalledWith('ERROR: Could not fetch given tag (invalid) of wine-ge');
  })

  test('fetch data failed because of 404 for given tag', async () => {
    axios.default.get = jest.fn().mockRejectedValue('Could not fetch tag 404');
    console.error = jest.fn();
    const data = await fetchData('invalid');
    expect(axios.default.get).toBeCalledWith('https://api.github.com/repos/GloriousEggroll/wine-ge-custom/releases/tags/invalid');
    expect(data).toBe(undefined);
    expect(console.error).toBeCalledWith('ERROR: Could not fetch given tag (invalid) of wine-ge');
    expect(console.error).toBeCalledWith('ERROR: Could not fetch tag 404');
  })

  test('fetch data latest succesfully if none given', async () => {
    axios.default.get = jest.fn().mockResolvedValue(test_data_release);
    const data = await fetchData();
    expect(axios.default.get).toBeCalledWith('https://api.github.com/repos/GloriousEggroll/wine-ge-custom/releases/latest');
    expect(data.version).toBe('6.16-GE-1');
    expect(data.checksum).toBe(
      'https://github.com/GloriousEggroll/wine-ge-custom/releases/download/6.16-GE-1/lutris-ge-6.16-1-x86_64.sha512sum');
    expect(data.download).toBe(
      'https://github.com/GloriousEggroll/wine-ge-custom/releases/download/6.16-GE-1/lutris-ge-6.16-1-x86_64.tar.xz');
    expect(data.date).toBe('2021-08-29');
    expect(data.size).toBe(89977056);
  })

  test('fetch data latest failed because of 404', async () => {
    axios.default.get = jest.fn().mockRejectedValue('Could not fetch tag 404');
    console.error = jest.fn();
    const data = await fetchData();
    expect(axios.default.get).toBeCalledWith('https://api.github.com/repos/GloriousEggroll/wine-ge-custom/releases/latest');
    expect(data).toBe(undefined);
    expect(console.error).toBeCalledWith('ERROR: Could not fetch latest wine-ge');
    expect(console.error).toBeCalledWith('ERROR: Could not fetch tag 404');
  })
})
