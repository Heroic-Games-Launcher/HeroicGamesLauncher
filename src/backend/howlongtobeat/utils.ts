import { HowLongToBeatEntry, HowLongToBeatService } from 'howlongtobeat'

export async function getHowLongToBeat(
  title: string
): Promise<HowLongToBeatEntry> {
  return new Promise((resolve) => {
    const hltb = new HowLongToBeatService()
    hltb.search(title).then((results) => {
      resolve(results[0])
    })
  })
}
