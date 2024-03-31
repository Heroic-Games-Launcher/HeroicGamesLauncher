const notarize = require("./notarize").default

exports.default = async function (context) {
    await notarize(context);
    console.log("Finshed Signing, Notarizing with Apple")
}
