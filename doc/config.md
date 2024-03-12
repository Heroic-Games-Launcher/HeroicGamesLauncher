## General Concepts

Heroic's configuration, both global and game-specific, lives on one object (stored in `<config dir>/config.json` and
`<config dir>/GamesConfig/<app_name>_<runner>.json` respectively).  
Values for these keys are only supposed to be _set_ if the user specifically requests to set them, a key being absent
from the stored object indicates that the default value should be used.

## Backend Usage

### Global config

To use the global config in the Backend, simply import `getGlobalConfig`, `setGlobalConfig`, `resetGlobalConfigKey`
and/or `getUserConfiguredGlobalConfigKeys` from `backend/config/global`

### Game-specific config

A game-specific config works largely the same as the global config

- Import and use `getGameConfig`, `setGameConfig`, `resetGameConfigKey` and `getUserConfiguredGameConfigKeys` instead of
  their global counterparts. They require an AppName and a Runner (to know which exact file to read)
- Game configs can be reset with `clearGameConfig`

## Frontend Usage

### In React Components

Several hooks are already in-place to make working with the config system as easy as possible. These hooks live in
`frontend/hooks/config`:

- To work with the global config, use `useGlobalConfig`
- To work with a game-specific config, use `useGameConfig`
- To work with either the global config or a game-specific config, depending on your current context, use
  `useSharedConfig`

These hooks expose the same functions as seen in the Backend (getting a key, setting a key, clearing a key, checking if
a key is set to its default value).

#### Working with the async nature of the hooks

Fetching the current & default value for a key requires communication with the Backend process. As such, the hooks
return a `fetched` value as the 3rd tuple element. In your component, you have to thus guard uses of `value` and
`isDefault`, for example like so:

```tsx
function MyComponent() {
  const [value, set, fetched, isDefault, reset] = useGlobalConfig('foo')
  // `value` and `isDefault` might be `undefined`

  // Other hooks here...

  if (!fetched) return <></> // Or any other fallback component here

  // `value` will now have the type you'd expect and `isDefault` will be a boolean
}
```

### In async functions

Inside `async` functions, for example `onClick` callbacks on buttons, you can use the `window.api.config.global` and
`window.api.config.game` objects to access the config system directly

### Default values

Expose a "Reset to Default" functionality to the user wherever possible and sensible. The components commonly used for
config values (`SelectField`, `TextInputField` and `ToggleSwitch`) accept an `inlineElement` property. Pass a
`ResetToDefaultButton` via this property and pass _it_ the `isDefault` and `reset` variables from your hook. Doing this
presents the user a button to reset the config key only if it's not set to the default value.

## Upgrading the config

This section is intended for developers wanting to change the config system in any way.

### Basics

The config system verifies stored keys using Zod Schemas stored in `backend/config/schemas/index.ts`. The current
schemas used for parsing are always read from the `GameConfig` and `GlobalConfig` variables there, so if you want to
change the current config, edit the schema assigned to this constant (for example `GameConfigV1`)

#### Editing the config schema

First things first, if you're...  
... adding a new key,  
... removing a key,  
... changing a key to a looser type (a type allowing more values than before),  
you can simply make these modifications on the current version's schema. Added keys will automatically be assigned
their default values, removed keys will automatically be removed, and changed keys will simply stay on their old values.

However, if you're editing a key to have a type not allowing any old value, you **need** a new schema version. Adding
one isn't too hard though. To illustrate, I'll add an imaginary new v2 version based on v1, changing the
`eSync` key to be a string instead (this doesn't make much sense, but oh well):

1. (Somewhat optional, but recommended) Move `GameConfigV1`, `GlobalConfigV1`, `GameConfigV1Json` and
   `GlobalConfigV1Json` into its own file, for example `backend/config/schemas/v1.ts`
2. Create your new `GameConfigV2` and `GameConfigV2`, inheriting from their V1 versions:
   ```ts
   const GameConfigV2 = GameConfigV1.extend({
     eSync: z.string()
   })
   // Equivalent for `GlobalConfigV2`
   ```
3. Create `GameConfigV2Json` and `GlobalConfigV2Json`:
   ```ts
   const GameConfigV2Json = z.object({
     version: z.literal('v2'),
     settings: GameConfigV2.partial()
   })
   // Again equivalent for `GlobalConfigV2Json`
   ```
4. Adjust the `GameConfig`, `GlobalConfig`, `latestGameConfigJson` and `latestGlobalConfigJson` variables to point to
   your new version
5. Add the now legacy v1 version to the start of the `pastGlobalConfigVersions` and `pastGameConfigVersions` arrays in
   `backend/config/global.ts` and `backend/config/game.ts` respectively
6. Following the type errors, add a case for `v1` to `updatePastGlobalConfig` and `updatePastGameConfig`, migrating the
   old version to your new one
7. Modify the default value:
   ```diff
   // Inside the object returned by `getDefaultGlobalConfig`
   -    eSync: true,
   +    eSync: 'foo',
   ```
   Note: Assuming you're editing one key, you'll only ever have to change either the global or game-specific default
   object, not both (game-specific defaults only need to be set for keys _only_ in the game-specific config, shared keys
   are pulled from the global defaults)
