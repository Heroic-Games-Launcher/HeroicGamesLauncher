#!/bin/bash

echo
echo "#########"
echo "# Build #"
echo "#########"
echo

if [[ "$TEST_PACKAGED" == "true" ]]
then
    yarn dist:linux
else
    yarn vite build
fi

echo
echo "########"
echo "# Test #"
echo "########"
echo

if [[ "$OSTYPE" == *"linux"* ]]
then
    xvfb-run -a -e /dev/stdout -s "-screen 0 1280x960x24" yarn playwright test api.spec.ts
else
    yarn playwright test api.spec.ts
fi