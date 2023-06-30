// Widevine VMP signing
require('dotenv').config()

const pythonBin = process.env.PYTHON_BIN || 'python3'

exports.default = async function (context) {

    if(!process.env.EVS_ACCOUNT_NAME || !process.env.EVS_PASSWD) {
      console.log("Skipping VMP sign, EVS_ env vars are unset")
      return 
    }

    // Make sure we don't leave an outdated electron.exe.sig laying about
    if (context.packager.appInfo.productFilename !== 'electron') {
      console.log("Removing old electron.exe.sig")
      const isMac = context.packager.platform.name === 'mac'
        const fs = require("fs");
        const macPath = context.appOutDir + '/Heroic.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/Electron Framework.sig'
        const winPath = context.appOutDir + '/electron.exe.sig'
        const path = isMac ? macPath : winPath
        console.log("Removing old sig file at: " + path)
        if (fs.existsSync(path)) {
        fs.unlinkSync(path)
    }
  
    const spawnSync = require("child_process").spawnSync; 
    console.log("Signing with VMP", pythonBin)
    const vmp = spawnSync(pythonBin, [
        '-m',
        'castlabs_evs.vmp',
        '-n',
        'sign-pkg',
        context.appOutDir
      ],
      {
        stdio: 'inherit' 
      });
  
    console.log("VMP status: " + vmp.status)
    if (vmp.status != 0) {
      throw new Error('vmp failed with code: ' + vmp.status);
    }
    console.log("VMP stdout: " + vmp.stdout)
  }
}
