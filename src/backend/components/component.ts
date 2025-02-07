import * as Registry from './registry'
import type {
  ComponentEvents,
  ComponentProducers,
  ComponentExclusiveProducers
} from './registry/types'

abstract class Component {
  public abstract readonly name: string

  public abstract init(): Promise<void>

  protected async addEventListener<T extends keyof ComponentEvents>(
    name: T,
    callback: ComponentEvents[T]
  ): Promise<void> {
    return Registry.addEventListener(this, name, callback)
  }

  protected async addProducer<T extends keyof ComponentProducers>(
    name: T,
    producer: ComponentProducers[T]
  ): Promise<void> {
    return Registry.addProducer(this, name, producer)
  }

  protected async addExclusiveProducer<
    T extends keyof ComponentExclusiveProducers
  >(name: T, producer: ComponentExclusiveProducers[T]): Promise<void> {
    return Registry.addExclusiveProducer(this, name, producer)
  }

  protected async invokeEvent<T extends keyof ComponentEvents>(
    name: T,
    ...args: Parameters<ComponentEvents[T]>
  ): Promise<void> {
    return Registry.invokeEvent(this, name, ...args)
  }

  protected async invokeProducers<T extends keyof ComponentProducers>(
    name: T,
    ...args: Parameters<ComponentProducers[T]>
  ): Promise<ReturnType<ComponentProducers[T]>[]> {
    return Registry.invokeProducers(this, name, ...args)
  }

  protected async invokeExclusiveProducer<
    T extends keyof ComponentExclusiveProducers
  >(
    name: T,
    ...args: Parameters<ComponentExclusiveProducers[T]>
  ): Promise<ReturnType<ComponentExclusiveProducers[T]>> {
    return Registry.invokeExclusiveProducer(this, name, ...args)
  }
}

export { Component }
