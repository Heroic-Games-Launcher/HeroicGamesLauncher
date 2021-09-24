#!/bin/bash
set -e
echo 'deb https://sourceforge.net/projects/madlinux/files/repo core main'|sudo tee /etc/apt/sources.list.d/madlinux.list
wget -qO- Https://sourceforge.net/projects/madlinux/files/repo/madlinux.key|gpg --dearmor|sudo tee /etc/apt/trusted.gpg.d/madlinux.gpg>/dev/null
cat <<EOF |sudo tee /etc/apt/preferences.d/madlinux
# MAD Linux
Package: *
Pin: origin sourceforge.net
Pin-Priority: 100
EOF
sudo apt update
sudo apt install heroic
