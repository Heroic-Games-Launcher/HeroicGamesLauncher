const notarize = require("./notarize").default
const vmp = require("./vmp").default

exports.default = async function (context) {
    await notarize(context);
    console.log("Finshed Signing, signing with VMP if on Windows. Platform:", context.packager.platform.name)
    if (context.packager.platform.name === 'windows') {
        console.log("Signing with VMP on Windows")
        await vmp(context);
    }
}
