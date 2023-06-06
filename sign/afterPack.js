const vmp = require("./vmp").default

exports.default = async function (context) {
    console.log("Finshed packaging, signing with VMP if on macOS. Platform:", context.packager.platform.name)
    if (context.packager.platform.name === 'mac') {
        console.log("Signing with VMP on macOS")
        await vmp(context);
    }
}
