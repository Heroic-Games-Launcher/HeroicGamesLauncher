#!/bin/bash

echo "#########"
echo "# Build #"
echo "#########"
echo

if [ "$TEST_PACKAGED" = "true" ]
then
    yarn dist:linux
else
    yarn vite build
fi

echo "########"
echo "# Test #"
echo "########"
echo

xvfb-run -a -e /dev/stdout -s "-screen 0 1280x960x24" yarn playwright test api.spec.ts