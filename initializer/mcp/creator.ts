import { type NextRequest, NextResponse } from 'next/server'

import type { ContextWithParams } from '@/initializer/controller'
import { api } from '@/initializer/controller'

import { JSONRPC, jsonRpcError, jsonRpcSuccess, mcpErrorinvalidArguments, mcpErrorMethodNotAllowed, mcpErrorToolNotFound, mcpResponse } from './response'
import type { Tool } from './tool'

/** MCP Tool interface */
export interface MCPManifestTool {
  /** Tool description */
  description?: string
  /** Input schema in JSON Schema format */
  inputSchema: any
  /** Output schema in JSON Schema format (optional) */
  outputSchema?: any
}

/** MCP Manifest interface */
export interface MCPManifest {
  /** Service name */
  name: string
  /** Service version */
  version: string
  /** Service description */
  description?: string
  /** Available tools */
  tools: Record<string, MCPManifestTool>
}

/**
 * Generate MCP manifest object
 * @param name Service name
 * @param version Service version
 * @param description Service description
 * @param tools Available tools
 * @returns MCP manifest object
 */
export function generateMCPManifest(name: string, version: string, description: string, toolsMap: Map<string, Tool>): MCPManifest {
  const tools = Object.fromEntries(
    (function* () {
      for (const [, tool] of toolsMap) {
        const manifest: MCPManifestTool = {
          description: tool.description,
          inputSchema: tool.manifest.parameters,
        }

        yield [tool.name, manifest]
      }
    })()
  )

  return { name, version, description, tools }
}

/**
 * Higher-order function to wrap MCP request processing and integrate with api() function
 * @param handler The actual request handler function
 * @param allowedMethods Allowed HTTP methods, defaults to ['GET', 'POST']
 * @returns Wrapped handler function
 */
function withMCPHandler<P = any>(handler: (req: NextRequest, context: ContextWithParams<P>) => Promise<any>, allowedMethods: string[] = ['GET', 'POST']) {
  return api(async (req: NextRequest, context: ContextWithParams<P>) => {
    try {
      // Validate HTTP method
      const method = req.method || 'GET'
      if (!allowedMethods.includes(method)) {
        return mcpErrorMethodNotAllowed(`Method ${method} not allowed. Allowed methods: ${allowedMethods.join(', ')}`)
      }

      // For POST requests, validate Content-Type
      if (method === 'POST') {
        const contentType = req.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          return mcpErrorinvalidArguments('Content-Type must be application/json for POST requests')
        }
      }

      return await handler(req, context)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return mcpErrorinvalidArguments(message)
    }
  })
}

/**
 * Create manifest handler
 * @param name Service name
 * @param version Service version
 * @param description Service description
 * @param tools Available tools
 * @returns Wrapped manifest handler function
 */
function createManifestHandler(name: string, version: string, description: string, tools: Map<string, Tool>) {
  return withMCPHandler(async () => {
    const manifest = generateMCPManifest(name, version, description, tools)
    return NextResponse.json({ type: 'result', result: manifest })
  }, ['GET'])
}

/**
 * Build MCP tools array for JSON-RPC tools/list (name, description, inputSchema)
 */
function buildMCPToolsList(tools: Map<string, Tool>): { name: string; description?: string; inputSchema: any }[] {
  return Array.from(tools.entries()).map(([, t]) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.manifest.parameters,
  }))
}

/**
 * Handle a single JSON-RPC 2.0 request (initialize, tools/list, tools/call)
 */
async function handleJsonRpcRequest(
  body: { id?: string | number | null; method?: string; params?: any },
  tools: Map<string, Tool>,
  service: { name: string; version: string; description?: string }
): Promise<NextResponse> {
  const id = body.id ?? null

  if (body.method === 'initialize') {
    const protocolVersion = (body.params && body.params.protocolVersion) || '2025-06-18'
    return jsonRpcSuccess(id, {
      protocolVersion,
      capabilities: {
        tools: {
          listChanged: false,
        },
      },
      serverInfo: {
        name: service.name,
        version: service.version,
        description: service.description,
      },
    })
  }

  if (body.method === 'tools/list') {
    const toolsList = buildMCPToolsList(tools)
    return jsonRpcSuccess(id, { tools: toolsList })
  }

  if (body.method === 'tools/call') {
    const { name, arguments: args = {} } = body.params ?? {}
    if (!name || typeof name !== 'string') {
      return jsonRpcError(id, JSONRPC.INVALID_PARAMS, 'Missing or invalid "params.name"')
    }

    const tool = tools.get(name)
    if (!tool) {
      return jsonRpcError(id, JSONRPC.INVALID_PARAMS, `Unknown tool: ${name}`)
    }

    const validation = tool.validateParameters(args)
    if (validation !== true) {
      return jsonRpcError(id, JSONRPC.INVALID_PARAMS, String(validation))
    }

    try {
      const result = await tool.call(args)
      const content = [{ type: 'text' as const, text: JSON.stringify(result) }]
      return jsonRpcSuccess(id, { content, isError: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return jsonRpcSuccess(id, {
        content: [{ type: 'text' as const, text: message }],
        isError: true,
      })
    }
  }

  return jsonRpcError(id, JSONRPC.METHOD_NOT_FOUND, `Method not found: ${body.method ?? 'undefined'}`)
}

/**
 * Create tool execution handler. POST body can be:
 * - JSON-RPC 2.0: { jsonrpc: "2.0", id, method: "tools/list" | "tools/call", params? } -> JSON-RPC response
 * - Legacy REST: { tool: string, params?: object } -> { type: "result", result }
 */
function createToolExecutionHandler(name: string, version: string, description: string, tools: Map<string, Tool>) {
  return withMCPHandler(
    async (req: NextRequest) => {
      const body = await req.json().catch(() => null)
      if (body == null || typeof body !== 'object') {
        return mcpErrorinvalidArguments('Invalid JSON body')
      }

      const isJsonRpc = body.jsonrpc === '2.0' && typeof body.method === 'string'
      if (isJsonRpc) {
        return handleJsonRpcRequest(body, tools, { name, version, description })
      }

      const { tool: toolName, params = {} } = body
      if (!toolName) {
        return mcpErrorinvalidArguments('Missing tool name')
      }

      const tool = tools.get(toolName)
      if (!tool) {
        return mcpErrorToolNotFound(`Tool "${toolName}" not found`)
      }

      const validation = tool.validateParameters(params)
      if (validation !== true) {
        return mcpErrorinvalidArguments(validation)
      }

      const result = await tool.call(params)
      return mcpResponse(result)
    },
    ['POST']
  )
}

/**
 * Create MCP HTTP server, returning manifest and execute handler functions
 * @param name Service name
 * @param version Service version
 * @param description Service description
 * @param tools Available tools
 * @returns Object containing manifest and execute handler functions
 */
export function createMCPHttpServer(name: string, version: string, description: string, tools: Record<string, Tool> | Map<string, Tool>) {
  const toolsMap = tools instanceof Map ? tools : new Map(Object.entries(tools))
  const manifest = createManifestHandler(name, version, description, toolsMap)
  const execute = createToolExecutionHandler(name, version, description, toolsMap)
  return { manifest, execute }
}
