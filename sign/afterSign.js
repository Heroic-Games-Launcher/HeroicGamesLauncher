const notarize = require("./notarize").default
const vmp = require("./vmp").default

exports.default = async function (context) {
    await notarize(context);
    if (context.packager.platform.name === 'windows') {
        await vmp(context);
    }
}
