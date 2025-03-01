/*
There are 3 different types of "messages" components can use:
- Events, which run in parallel and can't return a value
- Producers, which run sequentially and *may* return a value
- ExclusiveProducers, which are the same thing as Producers, except that
  only one can be registered for a message

To better picture this, some examples:
When the user wants to launch a game, we have to
- actually launch the game
- update Discord rich presence
- update GOG presence
- update library state to mark the game as running
- update last played state to push this game to the start
etc.
So, to decouple this logic from each other, we can create one event (say
`core:gameLaunchRequested`), and then add handlers which do the above tasks
(say we have one GameLaunchComponent, one PresenceComponent to update the two
presences (adding two handlers), and another GameStateComponent updating state
(also with two handlers))

Producers can be helpful everywhere we need a list of *things*. Some *things*
that might be handled by a Producers:
- Wine versions
- Game launch parameters
- The entire library itself?
Looking more deeply at the launch parameters example: Since Producers are ran in
order, we can add, say, a GamescopeProducer to return the part of the parameter
that adds Gamescope as a wrapper, or an UmuProducer to add umu. More
interestingly, we could also have a runner-specific Producer (which only returns
its Legendary/GOGDL/Nile/etc. command if it sees that a game from its storefront
is being launched), meaning the entire launch flow could be store-agnostic

ExclusiveProducers lastly can be seen more like global functions. Some examples
for those might be anything to do with game settings, or store-specific things
(EOS overlay). Note that even in those cases, the modularity of the components
system can be helpful to make it easy to test functionality (it'd be as easy
as swapping out a real component with a fake one)

Note that part of the structural considerations here were that components may
not only be written by us. We could have a "User components" feature (perhaps
even being implemented as a component itself), which can then load user-created
features from a special folder on the filesystem, pulling data from a curated
database. Since these components would then have access to all core
Events/Producers/ExclusiveProducers, they'd essentially be as powerful as
a first-party Heroic feature

Another very interesting aspect of having this system is that we could
serialize all messages between components into a file, and then later replay
that file (say for a support request) to see how components behave, perhaps
even being able to enter a "Component debugger" that lets you pause/replay/skip
messages
 */

interface ComponentEvents {}
interface ComponentProducers {}
interface ComponentExclusiveProducers {}

export type { ComponentEvents, ComponentProducers, ComponentExclusiveProducers }
