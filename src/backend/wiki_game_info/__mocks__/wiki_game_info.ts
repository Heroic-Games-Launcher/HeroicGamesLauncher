const wikigameinfo = jest.requireActual('../wiki_game_info')

wikigameinfo.getWikiGameInfo = jest.fn()

module.exports = wikigameinfo
export {}
