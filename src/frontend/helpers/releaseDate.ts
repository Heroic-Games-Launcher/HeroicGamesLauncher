function convertDate(date: string) {
  const match = date.match(/(\w+ \d{1,2}, \d{4})/)
  if (match) {
    date = match[1]
  }

  const dateObj = new Date(date)

  if (isNaN(dateObj.getTime())) {
    return null
  }

  return dateObj.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

interface NativePlatform {
  linux: boolean
  linuxNative: boolean
  mac: boolean
  macNative: boolean
}

export function getReleaseDate(
  wikiDates: string[] | undefined,
  runnerDate: string | undefined,
  is: NativePlatform
) {
  if (runnerDate) {
    return convertDate(runnerDate)
  }

  if (!wikiDates || wikiDates[0] === '' || wikiDates.length === 0) {
    return null
  }

  let windowsReleaseDate: string | undefined

  for (const entry of wikiDates) {
    const [platformName, releaseDate] = entry.split(': ')

    if (platformName === 'Windows') {
      windowsReleaseDate = releaseDate
    }

    if (
      (platformName === 'Linux' && is.linuxNative && is.linux) ||
      (platformName === 'OS X' && is.macNative && is.mac)
    ) {
      return convertDate(releaseDate)
    }
  }

  return windowsReleaseDate ? convertDate(windowsReleaseDate) : null
}
