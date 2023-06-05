const vmp = require("./vmp").default

exports.default = async function (context) {
    if (context.packager.platform.name === 'darwin') {
        await vmp(context);
    }
}
