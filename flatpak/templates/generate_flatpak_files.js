const { default: axios } = require('axios')
const fs = require('fs')
const package = require('../../package.json')
const child_process = require('child_process')
const os = require('os')
const crypto = require('crypto')

if (require.main === module) {
    main();
}

async function main() {
    let placeholder = ""
    let releaseTime = ""
    if (process.argv[2] === "release") {
        const { data } = await axios.get("https://api.github.com/repos/Heroic-Games-Launcher/HeroicGamesLauncher/releases/latest")
        const appimage = data.assets.find((asset) => asset.browser_download_url.includes(".AppImage"))
        const outputFile = `${os.tmpdir()}/Heroic.AppImage`
        child_process.spawnSync("curl", ["-L", appimage.browser_download_url, "-o", outputFile, "--create-dirs"])
        const outputContent = fs.readFileSync(outputFile)
        const hashSum = crypto.createHash('sha512');
        hashSum.update(outputContent);
        const sha512 = hashSum.digest('hex');
        fs.rmSync(outputFile)

        placeholder = [
            "type: file",
            `url: ${appimage.browser_download_url}`,
            `sha512: ${sha512}`
        ].join("\n        ")
        releaseTime = data.published_at.split('T')[0]
    } else {
        placeholder = [
            "type: file",
            `path: "../dist/Heroic-${package.version}.AppImage"`
        ].join("\n        ")
        releaseTime = new Date().toISOString().split('T')[0]
    }

    // generate manifest
    let templateManifest = fs.readFileSync(`${__dirname}/com.heroicgameslauncher.hgl.yml.template`, { encoding: 'utf-8' })
    templateManifest = templateManifest.replace("${heroic-app-image}", placeholder)
    fs.writeFileSync(`${__dirname}/../com.heroicgameslauncher.hgl.yml`, templateManifest)

    // generate metainfo
    let templateMetaInfo = fs.readFileSync(`${__dirname}/com.heroicgameslauncher.hgl.metainfo.xml.template`, { encoding: 'utf-8' })
    templateMetaInfo = templateMetaInfo.replace("${heroic-version}", `v${package.version}`).replace("${heroic-release-date}", releaseTime)
    fs.writeFileSync(`${__dirname}/../com.heroicgameslauncher.hgl.metainfo.xml`, templateMetaInfo)
}
