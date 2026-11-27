# Linux icon set

`public/icons/` holds the sizes that ship in the deb, rpm and AppImage
(`electron-builder` reads `build/icons`, which the vite build copies from
`public/`). Regenerate the whole set from the 1024px master:

```sh
for size in 16 22 24 32 48 64 128 256 512; do
  magick public/icon.png -resize ${size}x${size} -strip public/icons/${size}x${size}.png
done
```

Commit the nine generated files together. Do not edit them by hand: a single
image is not expanded into a set by electron-builder 26, so a missing size is
a missing launcher icon.
