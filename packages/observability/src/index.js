import { SpanStatusCode, context, trace } from "@opentelemetry/api";
export const TELEMETRY_CHANNEL = "golden.telemetry.v1";
export class ConsoleJsonLogger {
    emit(event) {
        const line = JSON.stringify({ channel: TELEMETRY_CHANNEL, ...event });
        switch (event.level) {
            case "error":
                console.error(line);
                break;
            case "warn":
                console.warn(line);
                break;
            default:
                console.log(line);
                break;
        }
    }
}
export function createRuntimeTelemetry(serviceName, logger = new ConsoleJsonLogger()) {
    return {
        tracer: trace.getTracer(serviceName),
        logger,
    };
}
export async function withSpan(telemetry, name, attributes, run) {
    const span = telemetry.tracer.startSpan(name, { attributes });
    return await context.with(trace.setSpan(context.active(), span), async () => {
        try {
            const result = await run(span);
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            span.recordException(error);
            span.setStatus({ code: SpanStatusCode.ERROR, message });
            telemetry.logger.emit({
                name,
                level: "error",
                timestamp: new Date().toISOString(),
                attributes: { ...attributes, message },
            });
            throw error;
        }
        finally {
            span.end();
        }
    });
}
export function logEvent(telemetry, name, level, attributes = {}) {
    const span = trace.getSpan(context.active());
    const correlationId = span?.spanContext().traceId;
    telemetry.logger.emit({
        name,
        level,
        timestamp: new Date().toISOString(),
        correlationId,
        attributes,
    });
}
export function toTelemetryEnvelope(event) {
    return {
        channel: TELEMETRY_CHANNEL,
        event,
    };
}
//# sourceMappingURL=index.js.map