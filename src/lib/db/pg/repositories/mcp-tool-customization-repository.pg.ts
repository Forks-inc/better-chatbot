import { pgDb as db } from "../db.pg";
import { McpServerTable, McpToolCustomizationTable } from "../schema.pg";
import { and, eq } from "drizzle-orm";
import { isUUID } from "lib/utils";
import type { McpToolCustomizationRepository } from "@/types/mcp";

export const pgMcpMcpToolCustomizationRepository: McpToolCustomizationRepository =
  {
    async select(key) {
      if (!isUUID(key.mcpServerId)) return null;
      const [result] = await db
        .select()
        .from(McpToolCustomizationTable)
        .where(
          and(
            eq(McpToolCustomizationTable.userId, key.userId),
            eq(McpToolCustomizationTable.mcpServerId, key.mcpServerId),
            eq(McpToolCustomizationTable.toolName, key.toolName),
          ),
        );
      return result;
    },
    async selectByUserIdAndMcpServerId(key) {
      if (!isUUID(key.mcpServerId)) return [];
      const rows = await db
        .select()
        .from(McpToolCustomizationTable)
        .where(
          and(
            eq(McpToolCustomizationTable.userId, key.userId),
            eq(McpToolCustomizationTable.mcpServerId, key.mcpServerId),
          ),
        );
      return rows;
    },

    async selectByUserId(userId) {
      return db
        .select({
          id: McpToolCustomizationTable.id,
          userId: McpToolCustomizationTable.userId,
          toolName: McpToolCustomizationTable.toolName,
          mcpServerId: McpToolCustomizationTable.mcpServerId,
          prompt: McpToolCustomizationTable.prompt,
          serverName: McpServerTable.name,
        })
        .from(McpToolCustomizationTable)
        .innerJoin(
          McpServerTable,
          eq(McpToolCustomizationTable.mcpServerId, McpServerTable.id),
        )
        .where(and(eq(McpToolCustomizationTable.userId, userId)));
    },

    async upsertToolCustomization(data) {
      if (!isUUID(data.mcpServerId)) {
        throw new Error(
          `Invalid MCP server ID: ${data.mcpServerId}. UUID expected.`,
        );
      }
      const now = new Date();
      const [result] = await db
        .insert(McpToolCustomizationTable)
        .values({
          userId: data.userId,
          toolName: data.toolName,
          mcpServerId: data.mcpServerId,
          prompt: data.prompt,
        })
        .onConflictDoUpdate({
          target: [
            McpToolCustomizationTable.userId,
            McpToolCustomizationTable.toolName,
            McpToolCustomizationTable.mcpServerId,
          ],
          set: {
            prompt: data.prompt ?? null,
            updatedAt: now,
          },
        })
        .returning();
      if (!result) {
        throw new Error("Failed to upsert MCP tool customization");
      }
      return result as any;
    },

    async deleteToolCustomization(key) {
      if (!isUUID(key.mcpServerId)) return;
      await db
        .delete(McpToolCustomizationTable)
        .where(
          and(
            eq(McpToolCustomizationTable.mcpServerId, key.mcpServerId),
            eq(McpToolCustomizationTable.toolName, key.toolName),
            eq(McpToolCustomizationTable.userId, key.userId),
          ),
        );
    },
  };
