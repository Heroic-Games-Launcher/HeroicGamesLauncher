// this hash contains a mapping of titles as displayed in Epic to titles as
// displayed in areweanticheatyet.com https://github.com/Starz0r/AreWeAntiCheatYet/blob/master/games.json
//
// comparison is case insensitive, so no need to add cases like 'VALORANT': 'Valorant'
// if the epic title is contained, so no need to add cases like 'Fall Guts': 'Fall Guys: Ultimate Knockout'
//
// left is the epic title, right is the areweanticheatyet title
const TITLES_MAP: { [key: string]: string } = {
  'Battlefield™ 2042': 'Battlefield 2042',
  'Back 4 Blood: Standard Edition': 'Back 4 Blood',
  'Rainbow Six Siege': 'Rainbow Six: Siege',
  'Phantasy Star Online 2 New Genesis': 'Phantasy Star Online 2',
  'Knockout City™': 'Knockout City',
  'Heroes & Generals WWII': 'Heroes & Generals',
  'Crysis Remastered': 'Crysis',
  'STAR WARS™ Battlefront™ Ultimate Edition': 'Star Wars: Battlefront (2015)',
  'STAR WARS™ Battlefront™ II: Celebration Edition':
    'Star Wars: Battlefront II (2017)',
  'The Division': "Tom Clancy's The Division", // added this to prevent false match with The Division 2
  'Battlefield V Definitive Edition': 'Battlefield V'
}

function epicTitleToAnticheat(appTitle: string): string {
  return (TITLES_MAP[appTitle] || appTitle).toLowerCase()
}

export { epicTitleToAnticheat }
