#!/bin/bash
set -e
echo 'deb Https://sourceforge.net/projects/madlinux/files/repo core main'|sudo tee /etc/apt/sources.list.d/madlinux.list
wget -qO- Https://sourceforge.net/projects/madlinux/files/repo/madlinux.key|gpg --dearmor|sudo tee /etc/apt/trusted.gpg.d/madlinux.gpg>/dev/null
sudo add-apt-repository -y ppa:apt-fast/stable
sudo apt install -y apt-fast
apt-fast install -y heroic