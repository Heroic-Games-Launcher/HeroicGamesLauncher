# Maintainer Chris Werner Rau <aur@cwrau.io>

pkgname=heroic-games-launcher-bin
_pkgver=v1.1.1
pkgver=${_pkgver#v}
pkgrel=2
pkgdesc="HGL, a Native alternative Linux Launcher for Epic Games"
arch=('x86_64')
url="https://github.com/flavioislima/HeroicGamesLauncher"
license=('GPL3')
conflicts=(${pkgname%-*}-{appimage,electron})
depends=(fuse2 gawk)
_filename=heroic-${pkgver}.pacman
source=("$url/releases/download/${_pkgver}/${_filename}")
noextract=("${_filename}")
md5sums=('6b5789d399e5a1c5faf8fca64051593d')
options=(!strip)

package() {
  tar -xJv -C "${pkgdir}" -f "${srcdir}/${_filename}" usr opt
}

# vim:set ts=2 sw=2 et: syntax=sh
