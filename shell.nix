# Nix shell environment suitable for running the build watch command.
# Use like
# $ nix-shell --run 'pnpm start'
{
  pkgs ? import <nixpkgs> { },
}:

let
  inherit (pkgs) lib;
in
pkgs.mkShell {
  packages = with pkgs; [
    pnpm
    nodejs
    typescript-language-server
    python3
    gnumake
    gcc
    zlib
  ];

  shellHook = ''
    ln -sf ${lib.getExe pkgs.electron} node_modules/electron/dist/electron
    ln -sf \
      ${lib.getExe pkgs.vulkan-helper} \
      ${lib.getExe pkgs.gogdl} \
      ${lib.getExe pkgs.legendary-heroic} \
      ${lib.getExe pkgs.nile} \
      public/bin/x64/linux/
  '';
}
