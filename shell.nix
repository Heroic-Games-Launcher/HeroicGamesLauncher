{ pkgs ? import <nixpkgs> {} }:

(pkgs.buildFHSEnv {
  name = "heroic-fhs-dev";
  targetPkgs = pkgs: with pkgs; [
    # Base requirements
    git
    nodejs_22
    pnpm

    # Commit hooks use bash
    bash
    
    # Lib dependencies (build)
    dbus  # libdbus-1.so.3
    glib  # libglib-2.0.so.0
    nss  # libnss3.so
    nspr  # libnspr4.so
    at-spi2-atk  # libatk-1.0.so.0
    cups  # libcups.so.2
    gtk3  # libgtk-3.so.0
    libgbm  # libgbm.so.1
    expat  # libexpat.so.1
    libxkbcommon  # libxkbcommon.so.0
    udev  # libudev.so.1
    alsa-lib  # libasound.so.2
    pango  # libpango-1.0.so.0
    cairo  # libcairo.so.2
    xorg.libX11  # libX11.so.6
    xorg.libXcomposite  # libXcomposite.so.1
    xorg.libXdamage  # libXdamage.so.1:
    xorg.libXext  # libXext.so.6
    xorg.libXfixes  # libXfixes.so.3
    xorg.libXrandr  # libXrandr.so.2:
    xorg.libxcb  # libxcb.so.1

    # Lib dependencies (runtime)
    libz  # Needed to fetch game info
  ];
}).env
