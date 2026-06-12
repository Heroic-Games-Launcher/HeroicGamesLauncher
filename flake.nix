{
  description = "Heroic Games Launcher development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];

      forAllSystems = nixpkgs.lib.genAttrs systems;

      mkPkgs = system: import nixpkgs { inherit system; };

      mkHeroic = system:
        let
          pkgs = mkPkgs system;
          lib = pkgs.lib;

          devPackages = with pkgs; [
            bash
            coreutils
            git
            node-gyp
            nodejs_22
            pkg-config
            python3
            which
          ];

          electronRuntimePackages = with pkgs; [
            alsa-lib
            at-spi2-atk
            cairo
            cups
            dbus
            expat
            glib
            gtk3
            libdrm
            libgbm
            libxkbcommon
            libz
            libx11
            libxscrnsaver
            libxcomposite
            libxdamage
            libxext
            libxfixes
            libxrandr
            libxtst
            libxcb
            mesa
            nspr
            nss
            pango
            udev
          ];

          heroicFhsDev = pkgs.buildFHSEnv {
            name = "heroic-fhs-dev";
            targetPkgs = pkgs: devPackages ++ electronRuntimePackages;
            runScript = "bash";
            profile = ''
              export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
              export ELECTRON_DISABLE_SECURITY_WARNINGS=true
              alias pnpm='corepack pnpm'
            '';
          };

          mkTask = name: command:
            pkgs.writeShellApplication {
              name = "heroic-${name}";
              runtimeInputs = [ heroicFhsDev ];
              text = ''
                cd "''${HEROIC_WORKTREE:-$PWD}"
                exec heroic-fhs-dev -c ${lib.escapeShellArg command}
              '';
            };
        in
        {
          inherit devPackages heroicFhsDev mkTask;
        };
    in
    {
      packages = forAllSystems (
        system:
        let
          heroic = mkHeroic system;
        in
        {
          default = heroic.heroicFhsDev;
          dev = heroic.heroicFhsDev;
          setup = heroic.mkTask "setup" ''
            corepack pnpm install --frozen-lockfile
            corepack pnpm download-helper-binaries
          '';
          start = heroic.mkTask "start" "corepack pnpm start";
          check = heroic.mkTask "check" "corepack pnpm codecheck";
          lint = heroic.mkTask "lint" "corepack pnpm lint";
          test = heroic.mkTask "test" "corepack pnpm test";
        }
      );

      apps = forAllSystems (
        system:
        let
          mkApp = name: {
            type = "app";
            program = "${self.packages.${system}.${name}}/bin/heroic-${name}";
          };
        in
        {
          setup = mkApp "setup";
          start = mkApp "start";
          check = mkApp "check";
          lint = mkApp "lint";
          test = mkApp "test";
        }
      );

      devShells = forAllSystems (
        system:
        let
          pkgs = mkPkgs system;
          heroic = mkHeroic system;
        in
        {
          default = pkgs.mkShell {
            packages = heroic.devPackages ++ [ heroic.heroicFhsDev ];

            shellHook = ''
              export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
              alias pnpm='corepack pnpm'

              echo "Heroic dev shell"
              echo "  nix run .#setup   # install node_modules and helper binaries"
              echo "  nix run .#start   # run Electron/Vite inside the FHS env"
              echo "  nix run .#check   # TypeScript check"
              echo "  nix run .#lint    # ESLint"
              echo "  heroic-fhs-dev    # interactive FHS shell for manual testing"
            '';
          };
        }
      );
    };
}
