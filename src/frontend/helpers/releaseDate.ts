function convertDate(date: string, locale: string) {
  const match = date.match(/(\w+ \d{1,2}, \d{4})/)
  if (match) {
    date = match[1]
  }

  const dateObj = new Date(date)

  if (isNaN(dateObj.getTime())) {
    return null
  }

  return dateObj.toLocaleDateString(locale, {
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
  is: NativePlatform,
  locale: string
) {
  if (runnerDate) {
    return convertDate(runnerDate, locale)
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
      return convertDate(releaseDate, locale)
    }
  }

  return windowsReleaseDate ? convertDate(windowsReleaseDate, locale) : null
}
