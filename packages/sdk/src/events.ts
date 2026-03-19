import type { IFMessageEvent } from './types'

/**
 * Type-safe postMessage sender for the InsightForge embed iframe.
 */
export function sendIFMessage(
  target: WindowProxy,
  message: IFMessageEvent,
  targetOrigin: string,
): void {
  target.postMessage(message, targetOrigin)
}

/**
 * Parse and type-narrow an incoming MessageEvent from an InsightForge iframe.
 * Returns null if the message is not a recognised IF event.
 */
export function parseIFMessage(event: MessageEvent): IFMessageEvent | null {
  const data: unknown = event.data
  if (
    typeof data !== 'object' ||
    data === null ||
    !('type' in data) ||
    typeof (data as Record<string, unknown>).type !== 'string'
  ) {
    return null
  }

  const type = (data as Record<string, unknown>).type as string
  const knownTypes = new Set([
    'IF_READY',
    'IF_NAVIGATE',
    'IF_FILTER_CHANGE',
    'IF_ERROR',
    'IF_HEIGHT_CHANGE',
  ])

  if (!knownTypes.has(type)) return null

  return data as IFMessageEvent
}
