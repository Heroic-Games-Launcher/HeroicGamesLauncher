export interface SelectiveDownload {
  tags: Array<string>
  name: string
}

export const CYBERPUNK_SDL: Array<SelectiveDownload> = [
  {'tags': ['voice_de_de'], 'name': 'Deutsch'},
  {'tags': ['voice_es_es'], 'name': 'español (España)'},
  {'tags': ['voice_fr_fr'], 'name': 'français'},
  {'tags': ['voice_it_it'], 'name': 'italiano'},
  {'tags': ['voice_ja_jp'], 'name': '日本語'},
  {'tags': ['voice_ko_kr'], 'name': '한국어'},
  {'tags': ['voice_pl_pl'], 'name': 'polski'},
  {'tags': ['voice_pt_br'], 'name': 'português brasileiro'},
  {'tags': ['voice_ru_ru'], 'name': 'русский'},
  {'tags': ['voice_zh_cn'], 'name': '中文（中国）'}
]

export const FORTNITE_SDL: Array<SelectiveDownload> = [
  {'tags': ['chunk0', 'chunk10'], 'name': 'Fortnite Core'},
  {'tags': ['chunk11', 'chunk11optional'], 'name': 'Fortnite Save the World'},
  {'tags': ['chunk10optional'], 'name': 'High Resolution Textures'},
  {'tags': ['chunk2'], 'name': '(Language Pack) Deutsch'},
  {'tags': ['chunk5'], 'name': '(Language Pack) français'},
  {'tags': ['chunk7'], 'name': '(Language Pack) polski'},
  {'tags': ['chunk8'], 'name': '(Language Pack) русский'},
  {'tags': ['chunk9'], 'name': '(Language Pack) 中文（中国）'}
]

export const SDL_GAMES = {
  'Fortnite': FORTNITE_SDL,
  'Ginger': CYBERPUNK_SDL
}