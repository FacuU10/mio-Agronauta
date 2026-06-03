declare module 'opossum' {
  type Handler<TArgs extends unknown[], TResult> = (...args: TArgs) => Promise<TResult>

  interface Options {
    timeout?: number
    errorThresholdPercentage?: number
    resetTimeout?: number
  }

  export default class CircuitBreaker<TArgs extends unknown[] = unknown[], TResult = unknown> {
    constructor(action: Handler<TArgs, TResult>, options?: Options)
    fire(...args: TArgs): Promise<TResult>
    on(event: string, listener: (...args: unknown[]) => void): this
    readonly opened: boolean
  }
}
