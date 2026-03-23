import { NextResponse } from 'next/server'

import { MCP_ERRORS } from './errors'

export type MCPResponseType = 'result' | 'error'

export interface MCPResponseError {
  code: string
  message: string
  detail?: any
}

export type MCPResponse<T> = NextResponse<{
  type: MCPResponseType
  error?: MCPResponseError
  result?: T
}>

export function mcpResponse<T>(result?: T): MCPResponse<T> {
  return NextResponse.json({ type: 'result', result })
}

export function mcpError(error: MCPResponseError): MCPResponse<any> {
  return NextResponse.json({ type: 'error', error })
}

export function mcpErrorinvalidArguments(message?: string): MCPResponse<any> {
  return mcpError({ ...MCP_ERRORS.INVALID_ARGUMENT, ...(message && { message }) })
}

export function mcpErrorToolNotFound(message?: string): MCPResponse<any> {
  return mcpError({ ...MCP_ERRORS.TOOL_NOT_FOUND, ...(message && { message }) })
}

export function mcpErrorMethodNotAllowed(message?: string): MCPResponse<any> {
  return mcpError({ ...MCP_ERRORS.METHOD_NOT_ALLOWED, ...(message && { message }) })
}

/** JSON-RPC 2.0 standard error codes */
export const JSONRPC = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const

/**
 * Build a JSON-RPC 2.0 success response
 * @param id Request id (string or number)
 * @param result Result payload
 */
export function jsonRpcSuccess(id: string | number | null, result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id, result })
}

/**
 * Build a JSON-RPC 2.0 error response
 * @param id Request id (string or number or null)
 * @param code JSON-RPC 2.0 numeric code
 * @param message Human-readable message
 */
export function jsonRpcError(id: string | number | null, code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } })
}
