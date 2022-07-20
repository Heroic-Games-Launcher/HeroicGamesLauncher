#!/bin/bash
set -e
echo 'deb [trusted=yes] https://rauldipeas.fury.site/apt/ * *'|sudo tee /etc/apt/sources.list.d/rauldipeas.list
cat <<EOF |sudo tee /etc/apt/preferences.d/rauldipeas
# Raul Dipeas
Package: *
Pin: origin rauldipeas.fury.site
Pin-Priority: 100
EOF
sudo apt update
sudo apt install heroic