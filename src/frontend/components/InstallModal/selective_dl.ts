export interface SelectiveDownload {
  tags: Array<string>
  name: string
  mandatory?: boolean
}

const CYBERPUNK_SDL: Array<SelectiveDownload> = [
  { tags: ['voice_de_de'], name: 'Deutsch' },
  { tags: ['voice_es_es'], name: 'español (España)' },
  { tags: ['voice_fr_fr'], name: 'français' },
  { tags: ['voice_it_it'], name: 'italiano' },
  { tags: ['voice_ja_jp'], name: '日本語' },
  { tags: ['voice_ko_kr'], name: '한국어' },
  { tags: ['voice_pl_pl'], name: 'polski' },
  { tags: ['voice_pt_br'], name: 'português brasileiro' },
  { tags: ['voice_ru_ru'], name: 'русский' },
  { tags: ['voice_zh_cn'], name: '中文（中国）' }
]

const SUPHALAK_SDL: Array<SelectiveDownload> = [
  { tags: ['language_czech'], name: '(Language Pack) čeština' },
  { name: '(Language Pack) Deutsch', tags: ['language_german'] },
  { name: '(Language Pack) English', tags: ['language_english'] },
  { name: '(Language Pack) español (España)', tags: ['language_spanish'] },
  { name: '(Language Pack) français', tags: ['language_french'] },
  { name: '(Language Pack) italiano', tags: ['language_italian'] },
  { name: '(Language Pack) 한국어', tags: ['language_korean'] },
  { name: '(Language Pack) polski', tags: ['language_polish'] },
  { name: '(Language Pack) português', tags: ['language_brazilian'] },
  { name: '(Language Pack) русский', tags: ['language_russian'] },
  { name: '(Language Pack) Türkçe', tags: ['language_turkish'] },
  {
    name: '(Language Pack) 中文 (简体中文）',
    tags: ['language_chinese_simplified']
  },
  {
    name: '(Language Pack) 中文（繁體字）',
    tags: ['language_chinese_traditional']
  }
]

const LAVENDER_SDL: Array<SelectiveDownload> = [
  { tags: ['de'], name: '(Language Pack) Deutsch' },
  { tags: ['es_es'], name: '(Language Pack) español (España)' },
  { tags: ['es_mx'], name: '(Language Pack) español (Mexico)' },
  { tags: ['fr'], name: '(Language Pack) français' },
  { tags: ['it'], name: '(Language Pack) italiano' },
  { tags: ['pl'], name: '(Language Pack) polski' },
  { tags: ['pt_br'], name: '(Language Pack) português brasileiro' },
  { tags: ['ru'], name: '(Language Pack)русский' }
]

const FORTNITE_SDL: Array<SelectiveDownload> = [
  { tags: ['chunk0', 'chunk10'], name: 'Fortnite Core', mandatory: true },
  { tags: ['chunk11', 'chunk11optional'], name: 'Fortnite Save the World' },
  { tags: ['chunk10optional'], name: 'High Resolution Textures' },
  { tags: ['chunk2'], name: '(Language Pack) Deutsch' },
  { tags: ['chunk5'], name: '(Language Pack) français' },
  { tags: ['chunk7'], name: '(Language Pack) polski' },
  { tags: ['chunk8'], name: '(Language Pack) русский' },
  { tags: ['chunk9'], name: '(Language Pack) 中文（中国）' }
]

export const SDL_GAMES: Record<string, SelectiveDownload[]> = {
  Fortnite: FORTNITE_SDL,
  Ginger: CYBERPUNK_SDL,
  Lavender: LAVENDER_SDL,
  Suphalak: SUPHALAK_SDL
}
