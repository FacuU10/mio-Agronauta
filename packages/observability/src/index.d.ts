import { type Attributes, type Span, type Tracer } from "@opentelemetry/api";
export declare const TELEMETRY_CHANNEL: "golden.telemetry.v1";
export type TelemetryLevel = "debug" | "info" | "warn" | "error";
export interface TelemetryEvent {
    name: string;
    level: TelemetryLevel;
    timestamp: string;
    correlationId?: string;
    attributes?: Record<string, unknown>;
}
export interface Logger {
    emit(event: TelemetryEvent): void;
}
export interface RuntimeTelemetry {
    tracer: Tracer;
    logger: Logger;
}
export interface TelemetryEnvelope {
    channel: typeof TELEMETRY_CHANNEL;
    event: TelemetryEvent;
}
export declare class ConsoleJsonLogger implements Logger {
    emit(event: TelemetryEvent): void;
}
export declare function createRuntimeTelemetry(serviceName: string, logger?: Logger): RuntimeTelemetry;
export declare function withSpan<T>(telemetry: RuntimeTelemetry, name: string, attributes: Attributes, run: (span: Span) => Promise<T>): Promise<T>;
export declare function logEvent(telemetry: RuntimeTelemetry, name: string, level: TelemetryLevel, attributes?: Record<string, unknown>): void;
export declare function toTelemetryEnvelope(event: TelemetryEvent): TelemetryEnvelope;
//# sourceMappingURL=index.d.ts.map