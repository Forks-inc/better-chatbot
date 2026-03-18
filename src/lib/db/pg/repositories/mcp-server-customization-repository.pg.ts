import { McpServerCustomizationRepository } from "app-types/mcp";
import { pgDb as db } from "../db.pg";
import { McpServerCustomizationTable, McpServerTable } from "../schema.pg";
import { and, eq } from "drizzle-orm";
import { isUUID } from "lib/utils";

export type McpServerCustomization = {
  id: string;
  userId: string;
  mcpServerName: string;
  customInstructions?: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const pgMcpServerCustomizationRepository: McpServerCustomizationRepository =
  {
    async selectByUserIdAndMcpServerId({ userId, mcpServerId }) {
      if (!isUUID(mcpServerId)) return null;
      const [row] = await db
        .select({
          id: McpServerCustomizationTable.id,
          userId: McpServerCustomizationTable.userId,
          mcpServerId: McpServerCustomizationTable.mcpServerId,
          prompt: McpServerCustomizationTable.prompt,
          serverName: McpServerTable.name,
        })
        .from(McpServerCustomizationTable)
        .innerJoin(
          McpServerTable,
          eq(McpServerCustomizationTable.mcpServerId, McpServerTable.id),
        )
        .where(
          and(
            eq(McpServerCustomizationTable.userId, userId),
            eq(McpServerCustomizationTable.mcpServerId, mcpServerId),
          ),
        );
      return row ?? null;
    },

    async selectByUserId(userId) {
      const rows = await db
        .select({
          id: McpServerCustomizationTable.id,
          userId: McpServerCustomizationTable.userId,
          mcpServerId: McpServerCustomizationTable.mcpServerId,
          prompt: McpServerCustomizationTable.prompt,
          serverName: McpServerTable.name,
        })
        .from(McpServerCustomizationTable)
        .innerJoin(
          McpServerTable,
          eq(McpServerCustomizationTable.mcpServerId, McpServerTable.id),
        )
        .where(and(eq(McpServerCustomizationTable.userId, userId)));
      return rows;
    },

    async upsertMcpServerCustomization(data) {
      if (!isUUID(data.mcpServerId)) {
        throw new Error(
          `Invalid MCP server ID: ${data.mcpServerId}. UUID expected.`,
        );
      }
      const now = new Date();
      const [result] = await db
        .insert(McpServerCustomizationTable)
        .values({
          userId: data.userId,
          mcpServerId: data.mcpServerId,
          prompt: data.prompt ?? null,
        })
        .onConflictDoUpdate({
          target: [
            McpServerCustomizationTable.userId,
            McpServerCustomizationTable.mcpServerId,
          ],
          set: {
            prompt: data.prompt ?? null,
            updatedAt: now,
          },
        })
        .returning();
      if (!result) {
        throw new Error("Failed to upsert MCP server customization");
      }
      return result;
    },

    async deleteMcpServerCustomizationByMcpServerIdAndUserId(key: {
      mcpServerId: string;
      userId: string;
    }) {
      if (!isUUID(key.mcpServerId)) return;
      await db
        .delete(McpServerCustomizationTable)
        .where(
          and(
            eq(McpServerCustomizationTable.mcpServerId, key.mcpServerId),
            eq(McpServerCustomizationTable.userId, key.userId),
          ),
        );
    },
  };
