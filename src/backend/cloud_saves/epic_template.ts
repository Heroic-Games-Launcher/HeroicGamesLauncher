export interface EpicTemplateVars {
  installPath: string
  accountId: string
  home: string
  appData: string
  documents: string
  windows: boolean
}

export const resolveEpicTemplate = (
  template: string,
  vars: EpicTemplateVars
): string =>
  template.replace(/\{(\w+)\}/g, (match, token: string) => {
    switch (token.toLowerCase()) {
      case 'installdir':
        return vars.installPath
      case 'epicid':
        return vars.accountId
      case 'appdata':
        return vars.windows ? '%LOCALAPPDATA%' : vars.appData
      case 'userdir':
        return vars.windows ? '%USERPROFILE%/Documents' : vars.documents
      case 'userprofile':
        return vars.windows ? '%USERPROFILE%' : vars.home
      case 'usersavedgames':
        return vars.windows
          ? '%USERPROFILE%/Saved Games'
          : `${vars.home}/Saved Games`
      case 'locallow':
        return vars.windows
          ? '%USERPROFILE%/AppData/LocalLow'
          : `${vars.home}/AppData/LocalLow`
      case 'roaming':
        return vars.windows ? '%APPDATA%' : vars.appData
      case 'userlibrary':
        return vars.windows ? '%USERPROFILE%' : `${vars.home}/Library`
      default:
        return match
    }
  })
