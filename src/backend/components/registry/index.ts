import { appendFile, mkdir, writeFile } from 'fs/promises'
import path from 'path'

import { componentLogFilePath } from './paths'

import type { Component } from '../component'
import type {
  ComponentEvents,
  ComponentProducers,
  ComponentExclusiveProducers
} from './types'

type EventListenerList = Partial<{
  [eventName in keyof ComponentEvents]: [
    Component,
    ComponentEvents[eventName]
  ][]
}>
type ProducerList = Partial<{
  [producerName in keyof ComponentProducers]: [
    Component,
    ComponentProducers[producerName]
  ][]
}>
type ExclusiveProducerList = Partial<{
  [producerName in keyof ComponentExclusiveProducers]: [
    Component,
    ComponentExclusiveProducers[producerName]
  ]
}>

const components: Component[] = []
const eventListeners: EventListenerList = {}
const producers: ProducerList = {}
const exclusiveProducers: ExclusiveProducerList = {}

// Name to use for the "global component" (used when non-component parts of
// Heroic interact with the component system)
// FIXME: Remove this once everything interacting with this system is
//        component-based
const GLOBAL_COMPONENT_NAME = 'Global Component'

async function init() {
  await initComponentLog()
}

async function initComponentLog() {
  await mkdir(path.dirname(componentLogFilePath), { recursive: true })
  await writeFile(componentLogFilePath, '')
  await logComponentMessage('Component Registry', 'Initialized')
}

type ComponentMessageSeverity =
  | 'DEBUG'
  | 'INFO'
  | 'WARNING'
  | 'ERROR'
  | 'CRITICAL'
const longestSeverityStrLength = 'CRITICAL'.length
async function logComponentMessage(
  componentName: string,
  message: string,
  severity: ComponentMessageSeverity = 'INFO'
) {
  // FIXME: 24 is an arbitrary value, but there's not really a good way to
  //        estimate one since we don't necessarily know which components
  //        we have when this function is called
  const namePortion = `[${componentName}]`.padEnd(24)
  const severityPortion = `[${severity}]`.padEnd(longestSeverityStrLength + 2)
  const fullMessage = `[${new Date().toISOString()}] ${severityPortion} ${namePortion} ${message}\n`
  await appendFile(componentLogFilePath, fullMessage)
}

async function registerComponent(component: Component) {
  components.push(component)
  return Promise.all([
    logComponentMessage(
      'Component Registry',
      `Initializing component ${component.name}`
    ),
    component
      .init()
      .then(() =>
        logComponentMessage(
          'Component Registry',
          `Initialized component ${component.name}`
        )
      )
  ])
}

async function addEventListener<T extends keyof ComponentEvents>(
  component: Component,
  eventName: T,
  callback: ComponentEvents[T]
): Promise<void> {
  await logComponentMessage(
    component.name,
    `Registering event callback for ${eventName}`,
    'DEBUG'
  )
  eventListeners[eventName] ||= []
  eventListeners[eventName]?.push([component, callback])
}

async function addProducer<T extends keyof ComponentProducers>(
  component: Component,
  producerName: T,
  producer: ComponentProducers[T]
): Promise<void> {
  await logComponentMessage(
    component.name,
    `Registering producer ${producerName}`,
    'DEBUG'
  )
  producers[producerName] ||= [] as never
  producers[producerName]?.push([component, producer])
}

async function addExclusiveProducer<
  T extends keyof ComponentExclusiveProducers
>(
  component: Component,
  producerName: T,
  producer: ComponentExclusiveProducers[T]
): Promise<void> {
  const alreadyRegisteredProducer = exclusiveProducers[producerName]
  if (alreadyRegisteredProducer) {
    const [registeredComponent] = alreadyRegisteredProducer
    await logComponentMessage(
      component.name,
      `Cannot add exclusive producer ${producerName}, component ${registeredComponent.name} added one already`,
      'ERROR'
    )
    return
  }

  await logComponentMessage(
    component.name,
    `Registering exclusive producer ${producerName}`,
    'DEBUG'
  )
  exclusiveProducers[producerName] = [component, producer as never]
}

async function invokeEvent<T extends keyof ComponentEvents>(
  // FIXME: `undefined` here is a stopgap to let non-component parts of Heroic
  //        interact with the component system
  component: Component | undefined,
  eventName: T,
  ...args: Parameters<ComponentEvents[T]>
): Promise<void> {
  const listeners = eventListeners[eventName]
  if (!listeners) {
    await logComponentMessage(
      component?.name ?? GLOBAL_COMPONENT_NAME,
      `Invoked ${eventName}, but no listeners were registered`,
      'WARNING'
    )
    return
  }

  await Promise.all(
    listeners.map(async ([listenerComponent, listener]) => {
      await logComponentMessage(
        component?.name ?? GLOBAL_COMPONENT_NAME,
        `Invoking callback for event ${eventName} on ${
          listenerComponent.name
        } with (${args.join(', ')})`,
        'DEBUG'
      )
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore This is actually fine if used as intended
      listener(...args)
    })
  )
}

async function invokeProducers<T extends keyof ComponentProducers>(
  component: Component | undefined,
  producerName: T,
  ...args: Parameters<ComponentProducers[T]>
): Promise<ReturnType<ComponentProducers[T]>[]> {
  const producerList = producers[producerName]
  if (!producerList) {
    await logComponentMessage(
      component?.name ?? GLOBAL_COMPONENT_NAME,
      `Invoked producer ${producerName}, but no producers were registered`,
      'WARNING'
    )
    return []
  }

  return Promise.all(
    producerList.map(async ([producerComponent, producer]) => {
      await logComponentMessage(
        component?.name ?? GLOBAL_COMPONENT_NAME,
        `Invoking producer ${producerName} on ${
          producerComponent.name
        } with (${args.join(', ')})`,
        'DEBUG'
      )
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore This is actually fine if used as intended
      return producer(...args)
    })
  )
}

async function invokeExclusiveProducer<
  T extends keyof ComponentExclusiveProducers
>(
  component: Component | undefined,
  producerName: T,
  ...args: Parameters<ComponentExclusiveProducers[T]>
): Promise<ReturnType<ComponentExclusiveProducers[T]>> {
  const producer = exclusiveProducers[producerName]
  if (!producer) {
    await logComponentMessage(
      component?.name ?? GLOBAL_COMPONENT_NAME,
      `Invoked exclusive producer ${producerName}, but no producer was registered`,
      'WARNING'
    )
    throw new Error(`No exclusive producer ${producerName} registered`)
  }

  const [producerComponent, producerFn] = producer
  await logComponentMessage(
    component?.name ?? GLOBAL_COMPONENT_NAME,
    `Invoking exclusive producer ${producerName} on ${
      producerComponent.name
    } with (${args.join(', ')})`,
    'DEBUG'
  )
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore This is actually fine if used as intended
  return producerFn(...args)
}

export {
  init,
  registerComponent,
  addEventListener,
  addProducer,
  addExclusiveProducer,
  invokeEvent,
  invokeProducers,
  invokeExclusiveProducer
}
