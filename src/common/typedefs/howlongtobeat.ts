declare module 'howlongtobeat-js' {
  export class HowLongToBeatEntry {
    gameId: number
    gameName: string | null
    gameAlias: string | null
    gameType: string | null
    gameImageUrl: string | null
    gameWebLink: string | null
    reviewScore: number | null
    mainStory: number | null
    mainExtra: number | null
    completionist: number | null
    allStyles: number | null
  }

  export enum SearchModifiers {
    NONE = '',
    ISOLATE_DLC = 'only_dlc',
    ISOLATE_MODS = 'only_mods',
    ISOLATE_HACKS = 'only_hacks',
    HIDE_DLC = 'hide_dlc'
  }

  export class HowLongToBeat {
    constructor(minSimilarity?: number)
    search(
      gameName: string,
      searchModifiers?: SearchModifiers,
      similarityMatchCase?: boolean
    ): Promise<HowLongToBeatEntry[] | null>
    searchFromId(gameId: number): Promise<HowLongToBeatEntry | null>
  }
}
