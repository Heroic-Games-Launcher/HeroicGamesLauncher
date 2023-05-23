#!/bin/bash

echo "Clearing display lock for Xvfb"
rm -rf /tmp/.X99-lock

echo "Starting Xvfb"
Xvfb :99 -ac &
sleep 2

export DISPLAY=:99
echo "Executing command $@"

exec "$@"

echo
echo "#########"
echo "# Build #"
echo "#########"
echo

# get os
os="win"
if [[ "$OSTYPE" == *"linux"* ]]
then
    os="linux"

elif [[ "$OSTYPE" == *"darwin"* ]]
then
    os="mac"
fi

yarn

# build
if [[ "$TEST_PACKAGED" == "true" ]]
then
    yarn dist:$os
else
    yarn vite build
fi

echo
echo "########"
echo "# Test #"
echo "########"
echo

if [[ "$os" == "linux" ]]
then
    xvfb-run -a -e /dev/stdout -s "-screen 0 1280x960x24" yarn playwright test .*.spec.ts
else
    yarn playwright test .*.spec.ts
fi
