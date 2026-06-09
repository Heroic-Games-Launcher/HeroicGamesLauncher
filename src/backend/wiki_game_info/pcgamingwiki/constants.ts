export const metacriticRegEx =
  /game\/row\/reception\|Metacritic\|(\S+)\|([0-9]+)/m
export const opencriticRegEx =
  /game\/row\/reception\|OpenCritic\|(\S+)\|([0-9]+)/m
export const idgbRegEx = /game\/row\/reception\|IGDB\|(\S+)\|([0-9]+)/m
export const steamIDRegEx = /steam appid {2}= ([0-9]+)/m
// The infobox `|cover = <File name>` line; stops at end of line, a comment or a
// pipe so trailing template syntax isn't captured.
export const coverRegEx = /\|\s*cover\s*=\s*([^\n<|]+)/m
export const howLongToBeatIDRegEx = /hltb {9}= ([0-9]+)/m
export const direct3DVersionsRegEx = /direct3d versions {6}= (.+)/m
export const genresRegEx = /game\/row\/taxonomy\/genres\s*\|\s*(.*?)\s*}}/
export const releaseDateRegEx = /game\/row\/date\|([^|]+)\|([^}]*)/g
