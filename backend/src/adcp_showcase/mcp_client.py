"""
Low-level MCP client for calling AdCP seller agents over Streamable HTTP.

Sends JSON-RPC 2.0 `tools/call` requests, parses the nested response format,
and maps errors to typed exceptions.
"""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any

import httpx

logger = logging.getLogger(__name__)


# ── Exceptions ───────────────────────────────────────────────────────────────

class AdCPError(Exception):
    """Base exception for AdCP MCP errors."""

    def __init__(self, code: str, message: str):
        self.code = code
        super().__init__(f"[{code}] {message}")


class InvalidRequestError(AdCPError):
    pass


class RateLimitedError(AdCPError):
    pass


class UnauthorizedError(AdCPError):
    pass


_ERROR_MAP: dict[str, type[AdCPError]] = {
    "INVALID_REQUEST": InvalidRequestError,
    "RATE_LIMITED": RateLimitedError,
    "UNAUTHORIZED": UnauthorizedError,
}


# ── MCP Client ───────────────────────────────────────────────────────────────

class MCPClient:
    """
    HTTP client for calling AdCP seller agents over MCP Streamable HTTP.

    Usage::

        client = MCPClient(
            agent_url="https://test-agent.adcontextprotocol.org/sales/mcp",
            auth_token="...",
        )
        products = await client.call_tool("get_products", {
            "brief": "Video ads for outdoor brand",
            "brand": {"domain": "acmeoutdoor.com"},
        })
    """

    def __init__(
        self,
        agent_url: str,
        auth_token: str,
        timeout: float = 30.0,
    ):
        self.agent_url = agent_url
        self.auth_token = auth_token
        self._http = httpx.AsyncClient(timeout=timeout)
        self._request_id = 0

    async def close(self) -> None:
        await self._http.aclose()

    def _next_id(self) -> int:
        self._request_id += 1
        return self._request_id

    @staticmethod
    def new_idempotency_key() -> str:
        """Generate a new UUID v4 idempotency key."""
        return str(uuid.uuid4())

    async def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """
        Call an MCP tool on the seller agent.

        Returns the parsed JSON payload from the response. Raises AdCPError
        subclasses on protocol-level errors.
        """
        request_id = self._next_id()
        payload = {
            "jsonrpc": "2.0",
            "id": request_id,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments,
            },
        }

        logger.debug("MCP call: %s(%s) → %s", tool_name, arguments, self.agent_url)

        resp = await self._http.post(
            self.agent_url,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json, text/event-stream",
                "Authorization": f"Bearer {self.auth_token}",
            },
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

        return self._parse_response(data, tool_name)

    def _parse_response(self, data: dict[str, Any], tool_name: str) -> dict[str, Any]:
        """
        Parse the JSON-RPC 2.0 response from the seller agent.

        AdCP responses come in two shapes:
        1. structuredContent — parsed JSON already in the response
        2. content[0].text — JSON string that needs parsing

        Errors are indicated by isError: true with an error code in the text.
        """
        # JSON-RPC error (transport-level)
        if "error" in data:
            err = data["error"]
            raise AdCPError(
                code=str(err.get("code", "UNKNOWN")),
                message=err.get("message", "Unknown JSON-RPC error"),
            )

        result = data.get("result", {})

        # Check for AdCP-level error
        if result.get("isError"):
            content = result.get("content", [{}])
            if content:
                try:
                    err_data = json.loads(content[0].get("text", "{}"))
                except (json.JSONDecodeError, IndexError):
                    err_data = {"code": "UNKNOWN", "message": "Unknown error"}

                code = err_data.get("code", "UNKNOWN")
                msg = err_data.get("message", "Unknown error")
                exc_cls = _ERROR_MAP.get(code, AdCPError)
                raise exc_cls(code=code, message=msg)

        # Prefer structuredContent (AdCP v3 pattern)
        if "structuredContent" in result:
            return result["structuredContent"]

        # Fall back to parsing content[0].text
        content = result.get("content", [])
        if content and "text" in content[0]:
            text = content[0]["text"]
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                return {"raw_text": text}

        return result


# ── Convenience factory ──────────────────────────────────────────────────────

def create_mcp_client(agent_url: str, auth_token: str) -> MCPClient:
    """Create an MCPClient instance."""
    return MCPClient(agent_url=agent_url, auth_token=auth_token)
