/**
 * Project Notes AI Tools
 *
 * Tools for the AI assistant to create, read, and manage project notes.
 * These tools interact with the database-backed project notes system.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getDbConnection } from '@/lib/db/connection';

/**
 * Create project notes tools with userId injected
 * @param userId - The authenticated user's ID
 */
export function createNotesTools(userId: number) {
  const db = getDbConnection();

  return {
    /**
     * List project notes
     */
    listProjectNotes: tool({
      description: `Get notes from a project. Use this when user asks:
        - "Show me my notes"
        - "What notes do I have?"
        - "Summarize my notes"
        - "What are the latest notes?"
        - "Show project notes"

        Returns notes sorted by pinned status and creation date.`,

      inputSchema: z.object({
        project_id: z.string().uuid()
          .describe('UUID of the project to get notes from'),
        limit: z.number().min(1).max(50).optional()
          .describe('Maximum number of notes to return (default: 20)'),
        include_content: z.boolean().optional()
          .describe('Include full note content (default: true)'),
      }),

      async execute({ project_id, limit = 20, include_content = true }: {
        project_id: string;
        limit?: number;
        include_content?: boolean;
      }) {
        try {
          // Verify project access
          const projectAccess = await db`
            SELECT p.id, p.name
            FROM project_projects p
            JOIN project_members pm ON pm.project_id = p.id
            WHERE p.id = ${project_id}
              AND pm.user_id = ${userId}
              AND pm.left_at IS NULL
              AND p.deleted_at IS NULL
            LIMIT 1
          `;

          if (projectAccess.length === 0) {
            return {
              success: false,
              error: 'Project not found or access denied',
            };
          }

          const notes = await db`
            SELECT
              pn.id,
              ${include_content ? db`pn.content,` : db``}
              pn.is_pinned,
              pn.created_at,
              pn.updated_at,
              ua.name as author_name
            FROM project_notes pn
            JOIN user_accounts ua ON ua.id = pn.user_id
            WHERE pn.project_id = ${project_id}
              AND pn.deleted_at IS NULL
            ORDER BY pn.is_pinned DESC, pn.created_at DESC
            LIMIT ${limit}
          `;

          return {
            success: true,
            project: {
              id: project_id,
              name: projectAccess[0].name,
            },
            count: notes.length,
            notes: notes.map((n) => ({
              id: n.id,
              content: include_content ? n.content : undefined,
              isPinned: n.is_pinned,
              author: n.author_name,
              createdAt: n.created_at,
              updatedAt: n.updated_at,
            })),
          };
        } catch (error) {
          console.error('[Notes Tools] listProjectNotes error:', error);
          return {
            success: false,
            error: `Failed to fetch notes: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    }),

    /**
     * Create a new project note
     */
    createProjectNote: tool({
      description: `Create a new note in a project. Use this when user asks:
        - "Create a note about..."
        - "Add a note..."
        - "Write down that..."
        - "Make a note..."
        - "Record a note about..."

        Creates a note with the specified content.`,

      inputSchema: z.object({
        project_id: z.string().uuid()
          .describe('UUID of the project to create the note in'),
        content: z.string().min(1).max(10000)
          .describe('The note content'),
        is_pinned: z.boolean().optional()
          .describe('Pin the note to the top (default: false)'),
      }),

      async execute({ project_id, content, is_pinned = false }: {
        project_id: string;
        content: string;
        is_pinned?: boolean;
      }) {
        try {
          // Verify project access
          const projectAccess = await db`
            SELECT p.id, p.name
            FROM project_projects p
            JOIN project_members pm ON pm.project_id = p.id
            WHERE p.id = ${project_id}
              AND pm.user_id = ${userId}
              AND pm.left_at IS NULL
              AND p.deleted_at IS NULL
            LIMIT 1
          `;

          if (projectAccess.length === 0) {
            return {
              success: false,
              error: 'Project not found or access denied',
            };
          }

          // Create the note
          const result = await db`
            INSERT INTO project_notes (project_id, user_id, content, is_pinned)
            VALUES (${project_id}, ${userId}, ${content}, ${is_pinned})
            RETURNING id, content, is_pinned, created_at
          `;

          const note = result[0];

          return {
            success: true,
            message: 'Note created successfully',
            note: {
              id: note.id,
              content: note.content,
              isPinned: note.is_pinned,
              createdAt: note.created_at,
            },
          };
        } catch (error) {
          console.error('[Notes Tools] createProjectNote error:', error);
          return {
            success: false,
            error: `Failed to create note: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    }),

    /**
     * Get the latest notes for summarization
     */
    getLatestNotes: tool({
      description: `Get the most recent notes from a project for summarization. Use this when user asks:
        - "Summarize my latest notes"
        - "What are the key points from my notes?"
        - "Give me an overview of my notes"

        Returns the latest notes with full content for analysis.`,

      inputSchema: z.object({
        project_id: z.string().uuid()
          .describe('UUID of the project'),
        count: z.number().min(1).max(20).optional()
          .describe('Number of recent notes to retrieve (default: 10)'),
      }),

      async execute({ project_id, count = 10 }: {
        project_id: string;
        count?: number;
      }) {
        try {
          // Verify project access
          const projectAccess = await db`
            SELECT p.id, p.name
            FROM project_projects p
            JOIN project_members pm ON pm.project_id = p.id
            WHERE p.id = ${project_id}
              AND pm.user_id = ${userId}
              AND pm.left_at IS NULL
              AND p.deleted_at IS NULL
            LIMIT 1
          `;

          if (projectAccess.length === 0) {
            return {
              success: false,
              error: 'Project not found or access denied',
            };
          }

          const notes = await db`
            SELECT
              pn.id,
              pn.content,
              pn.is_pinned,
              pn.created_at,
              ua.name as author_name
            FROM project_notes pn
            JOIN user_accounts ua ON ua.id = pn.user_id
            WHERE pn.project_id = ${project_id}
              AND pn.deleted_at IS NULL
            ORDER BY pn.created_at DESC
            LIMIT ${count}
          `;

          if (notes.length === 0) {
            return {
              success: true,
              message: 'No notes found in this project',
              notes: [],
            };
          }

          return {
            success: true,
            project: projectAccess[0].name,
            noteCount: notes.length,
            notes: notes.map((n) => ({
              id: n.id,
              content: n.content,
              isPinned: n.is_pinned,
              author: n.author_name,
              createdAt: n.created_at,
            })),
          };
        } catch (error) {
          console.error('[Notes Tools] getLatestNotes error:', error);
          return {
            success: false,
            error: `Failed to fetch notes: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    }),

    /**
     * Delete a project note
     */
    deleteProjectNote: tool({
      description: `Delete a note from a project. Use this when user explicitly asks to delete a note.
        Only the note author can delete their own notes.`,

      inputSchema: z.object({
        note_id: z.string().uuid()
          .describe('UUID of the note to delete'),
      }),

      async execute({ note_id }: { note_id: string }) {
        try {
          // Verify note ownership
          const noteAccess = await db`
            SELECT pn.id, pn.project_id
            FROM project_notes pn
            WHERE pn.id = ${note_id}
              AND pn.user_id = ${userId}
              AND pn.deleted_at IS NULL
            LIMIT 1
          `;

          if (noteAccess.length === 0) {
            return {
              success: false,
              error: 'Note not found or you do not have permission to delete it',
            };
          }

          // Soft delete the note
          await db`
            UPDATE project_notes
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = ${note_id}
          `;

          return {
            success: true,
            message: 'Note deleted successfully',
          };
        } catch (error) {
          console.error('[Notes Tools] deleteProjectNote error:', error);
          return {
            success: false,
            error: `Failed to delete note: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    }),
  };
}
