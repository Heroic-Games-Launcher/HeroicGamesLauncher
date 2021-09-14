import { fetchReleases, fetchData } from '../api';

describe('api', () => {
  test('fetch releases succesfully', async () => {
    const releases = await fetchReleases();
    expect(releases).not.toBe([]);
    expect(releases.length).toBeGreaterThan(0);
    // maybe needs to be changed after some time,
    // if this version is not listed anymore
    expect(releases).toContain('6.16-GE-1');
  })

  test('fetch data succesfully with given tag', async () => {
    const data = await fetchData('6.16-GE-1');
    expect(data.version).toBe('6.16-GE-1');
    expect(data.checksum).toBe(
      'https://github.com/GloriousEggroll/wine-ge-custom/releases/download/6.16-GE-1/lutris-ge-6.16-1-x86_64.sha512sum');
    expect(data.download).toBe(
      'https://github.com/GloriousEggroll/wine-ge-custom/releases/download/6.16-GE-1/lutris-ge-6.16-1-x86_64.tar.xz');
    expect(data.date).toBe('2021-08-29');
    expect(data.size).toBe(89977056);
  })

  test('fetch data failed because of wrong tag', async () => {
    console.error = jest.fn();
    const data = await fetchData('invalid');
    expect(data).toBe(undefined);
    expect(console.error).toBeCalledWith('ERROR: Error: Request failed with status code 404');
    expect(console.error).toBeCalledWith('ERROR: Could not fetch given tag (invalid) of wine-ge');
  })

  test('fetch data latest tag if none given', async () => {
    const data = await fetchData();
    expect(data.version).not.toBe(undefined);
    expect(data.checksum).not.toBe(undefined);
    expect(data.download).not.toBe(undefined);
    expect(data.date).not.toBe(undefined);
    expect(data.size).not.toBe(undefined);
  })
})
