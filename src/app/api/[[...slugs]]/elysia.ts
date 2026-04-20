import { Elysia, t } from "elysia";
import { getSession } from "@/server/better-auth/server";
import {
  generateVideoHandler,
  getVideoStatusHandler,
} from '@/server/api/controllers/video.controller'
import {
  createChatOwnershipHandler,
  forkChatHandler,
  getChatDetailsHandler,
  getChatHistoryHandler,
  getCommunityBuildsHandler,
  getFeaturedBuildsHandler,
  getClientIP,
} from "@/server/api/controllers/chat.controller";
import {
  getChatCountByUserId,
  getChatCountByIP,
  getChatDemoUrl,
  getUserChat,
  renameUserChat,
} from '@/server/db/queries'
import { createChatHandler } from '@/server/api/controllers/chat.controller'
import {
  getPlansHandler,
  getLocalizedPlansHandler,
  getUserCreditsHandler,
  createSubscriptionOrderHandler,
  createCreditPackOrderHandler,
  verifyPaymentHandler,
  getPaymentHistoryHandler,
  getCreditUsageHistoryHandler,
  cancelSubscriptionHandler,
} from "@/server/api/controllers/payment.controller";
import {
  getAdminStatsHandler,
  getAdminUsersHandler,
  getAdminUserDetailHandler,
  assignSubscriptionHandler,
  cancelUserSubscriptionHandler,
  addCreditsHandler,
  deductCreditsHandler,
  toggleUserRoleHandler,
} from '@/server/api/controllers/admin.controller'
import { executeCodeHandler } from '@/server/api/controllers/sandbox.controller'
import { openRouterChatHandler, openRouterStreamHandler } from '@/server/api/controllers/openrouter.controller'
import { getV0Client } from '@/lib/v0-client'
import { enhanceFirstPrompt, enhanceFollowUpPrompt } from '@/lib/prompt-enhancer'
import {
  type ChatAttachment,
  type ApiErrorResponse,
  type RateLimitErrorResponse,
  isApiError,
} from "@/types/api.types";
import {
  hasEnoughCredits,
  deductCreditsForPrompt,
  hasActiveSubscription,
} from "@/server/services/credits.service";
import {
  toggleStarChat,
  getStarredChats,
} from '@/server/api/controllers/star.controller'

import {
  createFolderHandler,
  getFoldersHandler,
  updateFolderHandler,
  deleteFolderHandler,
  assignChatToFolderHandler,
  getFolderChatsHandler,
} from '@/server/api/controllers/folder.controller'
import {
  getGithubStatusHandler,
  pushToGithubHandler,
  getGithubRepoForChatHandler,
  validateGithubSourceHandler, // [GITHUB] new validate endpoint for test run form
} from "@/server/api/controllers/github.controller";
import {
  createDesignHandler,
  listDesignsHandler,
  getDesignByIdHandler,
  updateDesignHandler,
  publishDesignByIdHandler,
  unpublishDesignByIdHandler,
  deleteDesignByIdHandler,
  getPublicDesignHandler,
} from "@/server/api/controllers/studio.controller";
import {
  startTestRunHandler,
  runFromCasesHandler,
  cancelTestRunHandler,
  getTestHistoryHandler,
  getTestRunHandler,
  streamTestRunHandler,
  getTestReportHandler,
  getPublicReportHandler,
  getEmbedBadgeHandler,
  // import the new SVG badge handler so the copied badge markdown
  // renders as an actual image in GitHub READMEs and websites
  getEmbedBadgeSvgHandler,
  exportTestReportPdfHandler,
  // daily run quota handler — used by GET /api/test/usage
  getTestUsageHandler,
  // Review phase: test case CRUD + confirm
  getTestCasesHandler,
  createTestCaseHandler,
  updateTestCaseHandler,
  deleteTestCaseHandler,
  confirmAndExecuteHandler,
} from "@/server/api/controllers/testing.controller";
import {
  generateRemotionVideoHandler,
  renderRemotionVideoHandler,
} from '@/server/api/controllers/video-remotion.controller';
import {
  getVideoChatsHandler,
  getVideoChatHandler,
  deleteVideoChatHandler,
  renameVideoChatHandler,
} from '@/server/api/controllers/video-chat.controller'
import { uploadUserImagesHandler } from '@/server/api/controllers/video-upload.controller'
import {
  getVideoPlanId,
  getVideoServerPlanLimits,
} from "@/server/services/video-limits.service";
import { countVideoPromptsTodayByUserId } from "@/server/db/queries";
import { env } from "@/env";
import { RATE_LIMITS, CREDIT_COSTS } from "@/config/credits.config";

/** Insufficient credits response type */
interface InsufficientCreditsResponse {
  error: "insufficient_credits";
  message: string;
  required: number;
  available: number;
}

// Speech-to-text rate limiting (in-memory, per-user, 24h sliding window)
const MAX_STT_BASE64_LENGTH = 15_000_000; // ~15MB base64 string ≈ ~10MB decoded audio
const sttRateLimitMap = new Map<
  string,
  { count: number; windowStart: number }
>();

// Periodically clean up expired STT rate limit entries to prevent memory leaks
setInterval(
  () => {
    const now = Date.now();
    const windowMs = 24 * 60 * 60 * 1000;
    for (const [key, entry] of sttRateLimitMap) {
      if (now - entry.windowStart >= windowMs) {
        sttRateLimitMap.delete(key);
      }
    }
  },
  60 * 60 * 1000,
); // Clean up every hour

/** Streaming error response type */
interface StreamingErrorResponse {
  error: string;
  details: string;
}

/** Chat request body interface (matches Elysia schema) */
interface ChatRequestBody {
  message: string
  chatId?: string
  streaming?: boolean
  attachments?: ChatAttachment[]
  envVarNames?: string[] 
}

export const elysiaApp = new Elysia({ prefix: '/api' })
  .onError(({ code, error, set }) => {
    console.error(`[Elysia Error] code=${code}`, error)
    if (code === 'VALIDATION') {
      set.status = 422
      return { error: 'Validation failed', details: error.message }
    }
    if (code === 'NOT_FOUND') {
      set.status = 404
      return { error: 'Not found' }
    }
    set.status = 500
    return { error: (error as Error)?.message ?? 'Internal server error' }
  })
  // Chat endpoint - POST /api/chat
  // Note: Streaming requests are handled inline (use fetch directly)
  // Non-streaming requests use the controller
  .post(
    "/chat",
    async ({ body, request, set }) => {
     const { message, chatId, streaming, attachments, envVarNames = [] } = body as ChatRequestBody

      const v0 = await getV0Client();

      // Handle streaming requests inline (skip controller, use fetch directly)
      if (streaming) {
        try {
          const session = await getSession()

          // Ownership check: only the chat owner can send follow-up messages
          if (chatId && session?.user?.id) {
            const existingChat = await getUserChat({ v0ChatId: chatId })
            if (existingChat && existingChat.user_id !== session.user.id) {
              set.status = 403
              return {
                error: 'forbidden',
                message: 'You cannot send messages to a chat you do not own. Fork the chat first.',
              }
            }
          }

          // Rate limiting for streaming
          if (session?.user?.id) {
            const chatCount = await getChatCountByUserId({
              userId: session.user.id,
              differenceInHours: 24,
            });

            if (chatCount >= RATE_LIMITS.AUTHENTICATED_MESSAGES_PER_DAY) {
              set.status = 429;
              return {
                error: "rate_limit:chat",
                message:
                  "You have exceeded your maximum number of messages for the day. Please try again later.",
              } satisfies RateLimitErrorResponse;
            }

            // Check credits for authenticated users
            const isNewChat = !chatId;
            const hasSub = await hasActiveSubscription(session.user.id);

            if (!hasSub) {
              set.status = 402;
              return {
                error: "insufficient_credits",
                message:
                  "You need an active subscription to use this service. Please subscribe to continue.",
                required: isNewChat
                  ? CREDIT_COSTS.NEW_PROMPT
                  : CREDIT_COSTS.FOLLOW_UP_PROMPT,
                available: 0,
              } satisfies InsufficientCreditsResponse;
            }

            const creditCheck = await hasEnoughCredits(
              session.user.id,
              isNewChat,
            );

            if (!creditCheck.hasCredits) {
              set.status = 402;
              return {
                error: "insufficient_credits",
                message: `Insufficient credits. You need ${creditCheck.required} credits but only have ${creditCheck.available}.`,
                required: creditCheck.required,
                available: creditCheck.available,
              } satisfies InsufficientCreditsResponse;
            }

            // Deduct credits before making the API call
            const deductResult = await deductCreditsForPrompt(
              session.user.id,
              isNewChat,
              chatId,
            );
            if (!deductResult.success) {
              set.status = 402;
              return {
                error: "insufficient_credits",
                message: deductResult.error ?? "Failed to deduct credits",
                required: isNewChat
                  ? CREDIT_COSTS.NEW_PROMPT
                  : CREDIT_COSTS.FOLLOW_UP_PROMPT,
                available: 0,
              } satisfies InsufficientCreditsResponse;
            }
          } else {
            const clientIP = await getClientIP(request);
            const chatCount = await getChatCountByIP({
              ipAddress: clientIP,
              differenceInHours: 24,
            });

            if (chatCount >= RATE_LIMITS.ANONYMOUS_MESSAGES_PER_DAY) {
              set.status = 429;
              return {
                error: "rate_limit:chat",
                message:
                  "You have exceeded your maximum number of messages for the day. Please try again later.",
              } satisfies RateLimitErrorResponse;
            }
          }

          let stream: ReadableStream<Uint8Array>;

          if (chatId) {
            try {
              // Continue existing chat with streaming
          stream = (await v0.chats.sendMessage({
  chatId,
  message: enhanceFollowUpPrompt(message, envVarNames),
  responseMode: 'experimental_stream',
  ...(attachments && attachments.length > 0 && { attachments }),
})) as ReadableStream<Uint8Array>
            } catch (error) {
              // If cha t doesn't exist (404), create a new chat instead
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              if (
                errorMessage.includes("404") ||
                errorMessage.includes("not_found") ||
                errorMessage.includes("Chat not found")
              ) {
                // Chat not found on v0, create new chat instead
                stream = (await v0.chats.create({
                  message: enhanceFirstPrompt(message, envVarNames),
                  responseMode: 'experimental_stream',
                  ...(attachments && attachments.length > 0 && { attachments }),
                })) as ReadableStream<Uint8Array>;
              } else {
                // Re-throw other errors
                throw error;
              }
            }
          } else {
            // Create new chat with streaming (enhanced first prompt)
            stream = (await v0.chats.create({
             message: enhanceFirstPrompt(message, envVarNames),
              responseMode: 'experimental_stream',
              ...(attachments && attachments.length > 0 && { attachments }),
            })) as ReadableStream<Uint8Array>;
          }

          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          });
        } catch {
          set.status = 500;
          return {
            error: "Failed to process streaming request",
            details: "An internal error occurred",
          } satisfies StreamingErrorResponse;
        }
      }

      // Non-streaming requests use the controller
      const result = await createChatHandler({ body, request });

      // Handle error responses with status codes
      if (isApiError(result)) {
        if (result.error === "Message is required") {
          set.status = 400;
        } else if (result.error === "rate_limit:chat") {
          set.status = 429;
        } else if (result.error === "Failed to process request") {
          set.status = 500;
        }
      }

      return result;
    },
    {
      body: t.Object({
        message: t.String(),
        chatId: t.Optional(t.String()),
        streaming: t.Optional(t.Boolean()),
        attachments: t.Optional(t.Array(t.Object({ url: t.String() }))),
      }),
    },
  )
  // App demo URL endpoint - GET /api/apps/:chatId (public, no auth)
  // Used by the /apps/[chatId] page to get the demo URL for embedding

  .get(
    "/apps/:chatId",
    async ({ params, set }) => {
      try {
       const chat = await getUserChat({ v0ChatId: params.chatId });

if (!chat) {
  set.status = 404;
  return { error: "App not found" };
}

        // Visit logging (non-critical, fire-and-forget)
        try {
          const { db } = await import("@/server/db");
          const { demo_visits, user_chats } =
            await import("@/server/db/schema");
          const { eq } = await import("drizzle-orm");

          const chatId = params.chatId;

          // Look up the chat owner in a single lightweight query
          const [chatRecord] = await db
            .select({ user_id: user_chats.user_id })
            .from(user_chats)
            .where(eq(user_chats.v0_chat_id, chatId))
            .limit(1);

          const session = await getSession();
          await db.insert(demo_visits).values({
            id: crypto.randomUUID(),
            demo_id: chatId,
            demo_type: "community",
            owner_user_id: chatRecord?.user_id ?? null,
            visitor_user_id: session?.user?.id ?? null,
          });
        } catch {
          // Visit logging is non-critical — silently ignore failures
        }

        return {
  demoUrl: chat.demo_url,
  demoHtml: chat.demo_html, 
  title: chat.title ?? null,
};
      } catch {
        set.status = 500;
        return { error: "Failed to fetch app" };
      }
    },
    {
      params: t.Object({
        chatId: t.String(),
      }),
    },
  )
  // Featured builds endpoint - GET /api/chats/featured (must be before :chatId)
  .get("/chats/featured", async ({ set }) => {
    const result = await getFeaturedBuildsHandler();

    if (isApiError(result)) {
      set.status = (result as ApiErrorResponse).status ?? 500;
    }

    return result;
  })
  // Community builds endpoint - GET /api/chats/community (must be before :chatId)
  .get(
    "/chats/community",
    async ({ query, set }) => {
      const result = await getCommunityBuildsHandler({ query });

      if (isApiError(result)) {
        set.status = (result as ApiErrorResponse).status ?? 500;
      }

      return result;
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    },
  )
  // Chat details endpoint - GET /api/chats/:chatId
  .get(
    "/chats/:chatId",
    async ({ params, set }) => {
      const result = await getChatDetailsHandler({ params });

      // Handle error responses with status codes
      if (isApiError(result)) {
        if (result.error === "Chat ID is required") {
          set.status = 400;
        } else if (result.error === "Chat not found") {
          set.status = 404;
        } else if (result.error === "Failed to fetch chat details") {
          set.status = 500;
        }
      }

      return result;
    },
    {
      params: t.Object({
        chatId: t.String(),
      }),
    },
  )
  // Star / Unstar chat
  .post(
    "/chat/star",
    async ({ body, set }) => {
      const session = await getSession();

      if (!session?.user?.id) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const { chatId, isStarred } = body as {
        chatId: string
        isStarred: boolean
      }
      await toggleStarChat({
        userId: session.user.id,
        chatId,
        isStarred,
      });

      return { success: true };
    },
    {
      body: t.Object({
        chatId: t.String(),
        isStarred: t.Boolean(),
      }),
    },
  )
  .get("/chat/starred", async ({ set }) => {
    const session = await getSession();

    if (!session?.user?.id) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const chats = await getStarredChats(session.user.id)
    return chats.map((chat) => ({
      id: chat.id,
      v0ChatId: chat.v0_chat_id || chat.id,
      conversationId: chat.conversation_id,
      title: chat.title,
      prompt: chat.prompt,
      demoUrl: chat.demo_url,
      previewUrl: chat.preview_url,
      createdAt: chat.created_at.toISOString(),
      updatedAt: chat.updated_at.toISOString(),
      type: chat.chat_type?.toLowerCase() === 'openrouter' || (!chat.demo_url && chat.conversation_id) ? 'openrouter' : 'builder',
is3D: chat.demo_url?.startsWith('threed://') ?? false,
      folderId: chat.folder_id ?? null,
      is_starred: chat.is_starred,
    }))
  })
  // Rename chat
  .post(
    '/chat/rename',
    async ({ body, set }) => {
      const session = await getSession()
      if (!session?.user?.id) {
        set.status = 401
        return { error: 'Unauthorized' }
      }
      const { chatId, title } = body as { chatId: string; title: string }
      if (!title?.trim()) {
        set.status = 400
        return { error: 'Title is required' }
      }
      const updated = await renameUserChat({
        chatId,
        userId: session.user.id,
        title: title.trim(),
      })
      if (!updated) {
        set.status = 404
        return { error: 'Chat not found' }
      }
      return { success: true }
    },
    {
      body: t.Object({
        chatId: t.String(),
        title: t.String(),
      }),
    },
  )
  // ── Chat Folders ──────────────────────────────────────────────────────────
  .post(
    '/chat/folders',
    async ({ body, set }) => {
      const result = await createFolderHandler({ body: body as { name: string; color?: string } })
      if ('error' in result && 'status' in result) {
        set.status = result.status as number
        return { error: result.error }
      }
      return result
    },
    { body: t.Object({ name: t.String(), color: t.Optional(t.String()) }) },
  )
  .get('/chat/folders', async ({ set }) => {
    const result = await getFoldersHandler()
    if ('error' in result && 'status' in result) {
      set.status = result.status as number
      return { error: result.error }
    }
    return result
  })
  .put(
    '/chat/folders/:id',
    async ({ params, body, set }) => {
      const result = await updateFolderHandler({ params, body: body as { name?: string; color?: string | null; position?: number } })
      if ('error' in result && 'status' in result) {
        set.status = result.status as number
        return { error: result.error }
      }
      return result
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ name: t.Optional(t.String()), color: t.Optional(t.Nullable(t.String())), position: t.Optional(t.Number()) }),
    },
  )
  .delete(
    '/chat/folders/:id',
    async ({ params, set }) => {
      const result = await deleteFolderHandler({ params })
      if ('error' in result && 'status' in result) {
        set.status = result.status as number
        return { error: result.error }
      }
      return result
    },
    { params: t.Object({ id: t.String() }) },
  )
  .post(
    '/chat/folders/assign',
    async ({ body, set }) => {
      const result = await assignChatToFolderHandler({ body: body as { chatId: string; folderId: string | null } })
      if ('error' in result && 'status' in result) {
        set.status = result.status as number
        return { error: result.error }
      }
      return result
    },
    { body: t.Object({ chatId: t.String(), folderId: t.Nullable(t.String()) }) },
  )
  .get(
    '/chat/folders/:id/chats',
    async ({ params, set }) => {
      const result = await getFolderChatsHandler({ params })
      if ('error' in result && 'status' in result) {
        set.status = result.status as number
        return { error: result.error }
      }
      return result
    },
    { params: t.Object({ id: t.String() }) },
  )
  // Fork chat endpoint - POST /api/chat/fork
  // Creates a copy of an existing chat for the current user
  .post(
    "/chat/fork",
    async ({ body, set }) => {
      const result = await forkChatHandler({ body });

      if (isApiError(result)) {
        if (result.error === "Unauthorized") {
          set.status = 401;
        } else if (result.error === "Chat ID is required") {
          set.status = 400;
        } else if (result.error === "Failed to fork chat") {
          set.status = 500;
        }
      }

      return result;
    },
    {
      body: t.Object({
        chatId: t.String(),
      }),
    },
  )
  // Chat ownership endpoint - POST /api/chat/ownership
  // Used to save chat metadata after streaming (prompt, demoUrl, etc.)
  .post(
    "/chat/ownership",
    async ({ body, set }) => {
      const result = await createChatOwnershipHandler({ body });

      // Handle error responses with status codes
      if (isApiError(result)) {
        if (result.error === "Chat ID is required") {
          set.status = 400;
        } else if (result.error === "Unauthorized") {
          set.status = 401;
        } else if (result.error === "Failed to create chat ownership") {
          set.status = 500;
        }
      }

      return result;
    },
    {
    body: t.Object({
  chatId: t.String(),
  prompt: t.Optional(t.String()),
  demoUrl: t.Optional(t.String()),
  demo_html: t.Optional(t.String()),
}),
    },
  )
  // Chat history endpoint - GET /api/chats
 .get(
  '/chats',
  async ({ query, set }) => {
    const result = await getChatHistoryHandler({ query: { ...query, page: query.page ? Number(query.page) : undefined, limit: query.limit ? Number(query.limit) : undefined } })

      if (isApiError(result)) {
        if (result.error === "Failed to fetch chat history") {
          set.status = (result as ApiErrorResponse).status ?? 500;
        }
      }

    return result
  },
  {
    query: t.Object({
      type: t.Optional(
        t.Union([
          t.Literal("all"),
          t.Literal("builder"),
          t.Literal("openrouter"),
        ])
      ),
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
    }),
  },
)

  // Speech-to-text endpoint - POST /api/speech-to-text
  .post(
    "/speech-to-text",
    async ({ body, set }) => {
      try {
        // Auth check
        const session = await getSession();
        if (!session?.user?.id) {
          set.status = 401;
          return {
            error: "Unauthorized",
            message: "You must be signed in to use speech-to-text.",
          };
        }

        const userId = session.user.id;

        // Rate limiting (in-memory, 24h sliding window)
        const now = Date.now();
        const windowMs = 24 * 60 * 60 * 1000;
        const entry = sttRateLimitMap.get(userId);
        if (entry && now - entry.windowStart < windowMs) {
          if (entry.count >= RATE_LIMITS.STT_REQUESTS_PER_DAY) {
            set.status = 429;
            return {
              error: "rate_limit:speech" as const,
              message:
                "You have exceeded the maximum number of speech-to-text requests for the day. Please try again later.",
            };
          }
          entry.count++;
        } else {
          sttRateLimitMap.set(userId, { count: 1, windowStart: now });
        }

        if (!env.ELEVENLABS_API_KEY) {
          set.status = 500;
          return {
            error: "Speech-to-text is not configured",
            message: "ElevenLabs API key is not set",
          };
        }

        const audioData = body.audio;
        if (!audioData) {
          set.status = 400;
          return {
            error: "Audio data is required",
            message: "Please provide audio data",
          };
        }

        // Size validation (~15MB base64 ≈ ~10MB decoded)
        if (audioData.length > MAX_STT_BASE64_LENGTH) {
          set.status = 413;
          return {
            error: "Payload too large",
            message: "Audio data exceeds the maximum allowed size of ~10MB.",
          };
        }

        // Detect MIME type from data URL prefix, fallback to audio/webm
        const mimeMatch = /^data:(audio\/[\w.+-]+);base64,/.exec(audioData);
        const mimeType = mimeMatch?.[1] ?? "audio/webm";

        // Convert base64 to buffer
        const base64Data = audioData.replace(
          /^data:audio\/[\w.+-]+;base64,/,
          "",
        );
        const audioBuffer = Buffer.from(base64Data, "base64");

        // Build FormData using native API
        const modelId = body.modelId || "scribe_v2";
        const formData = new FormData();
        formData.append("model_id", modelId);
        formData.append(
          "audio",
          new Blob([audioBuffer], { type: mimeType }),
          "audio.webm",
        );

        const response = await fetch(
          "https://api.elevenlabs.io/v1/speech-to-text",
          {
            method: "POST",
            headers: {
              "xi-api-key": env.ELEVENLABS_API_KEY,
            },
            body: formData,
          },
        );

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as {
            detail?: { message?: string };
          };
          set.status = response.status;
          return {
            error: "Speech-to-text conversion failed",
            message:
              errorData.detail?.message ||
              `ElevenLabs API error: ${response.statusText}`,
          };
        }

        const data = (await response.json()) as {
          text?: string;
          language?: string;
        };
        return {
          transcript: data.text || "",
          language: data.language || null,
        };
      } catch {
        set.status = 500;
        return {
          error: "Failed to process speech-to-text",
          message: "An internal error occurred",
        };
      }
    },
    {
      body: t.Object({
        audio: t.String({ maxLength: MAX_STT_BASE64_LENGTH }),
        modelId: t.Optional(t.String()),
      }),
    },
  )

  // ============================================
  // Payment & Credits Endpoints
  // ============================================

  // Get all available plans and credit packs - GET /api/payments/plans
  .get("/payments/plans", async () => {
    return await getPlansHandler();
  })

  // Get localized plans with currency conversion - GET /api/payments/plans/localized
  .get(
    "/payments/plans/localized",
    async ({ query }) => {
      return await getLocalizedPlansHandler({ query });
    },
    {
      query: t.Object({
        currency: t.Optional(t.String()),
        country: t.Optional(t.String()),
      }),
    },
  )

  // Get user's credits and subscription status - GET /api/payments/credits
  .get("/payments/credits", async ({ set }) => {
    const result = await getUserCreditsHandler();

    if (isApiError(result)) {
      set.status = (result as ApiErrorResponse).status ?? 500;
    }

    return result;
  })

  // Create subscription order - POST /api/payments/subscribe
  .post(
    "/payments/subscribe",
    async ({ body, set }) => {
      const result = await createSubscriptionOrderHandler({ body });

      if (isApiError(result)) {
        set.status = (result as ApiErrorResponse).status ?? 500;
      }

      return result;
    },
    {
      body: t.Object({
        planId: t.String(),
        displayCurrency: t.Optional(t.String()),
      }),
    },
  )

  // Create credit pack order - POST /api/payments/credits/buy
  .post(
    "/payments/credits/buy",
    async ({ body, set }) => {
      const result = await createCreditPackOrderHandler({ body });

      if (isApiError(result)) {
        set.status = (result as ApiErrorResponse).status ?? 500;
      }

      return result;
    },
    {
      body: t.Object({
        packId: t.String(),
        displayCurrency: t.Optional(t.String()),
      }),
    },
  )

  // Verify payment - POST /api/payments/verify
  .post(
    "/payments/verify",
    async ({ body, set }) => {
      const result = await verifyPaymentHandler({ body });

      if (isApiError(result)) {
        set.status = (result as ApiErrorResponse).status ?? 500;
      }

      return result;
    },
    {
      body: t.Object({
        razorpay_order_id: t.String(),
        razorpay_payment_id: t.String(),
        razorpay_signature: t.String(),
      }),
    },
  )

  // Get payment history - GET /api/payments/history
  .get("/payments/history", async ({ set }) => {
    const result = await getPaymentHistoryHandler();

    if (isApiError(result)) {
      set.status = (result as ApiErrorResponse).status ?? 500;
    }

    return result;
  })

  // Get credit usage history - GET /api/payments/usage
  .get("/payments/usage", async ({ set }) => {
    const result = await getCreditUsageHistoryHandler();

    if (isApiError(result)) {
      set.status = (result as ApiErrorResponse).status ?? 500;
    }

    return result;
  })

  // Cancel subscription - POST /api/payments/cancel
  .post("/payments/cancel", async ({ set }) => {
    const result = await cancelSubscriptionHandler();

    if (isApiError(result)) {
      set.status = (result as ApiErrorResponse).status ?? 500;
    }

    return result;
  })

  // ============================================
  // Admin Endpoints
  // ============================================

  // Get admin dashboard stats - GET /api/admin/stats
  .get("/admin/stats", async ({ set }) => {
    const result = await getAdminStatsHandler();

    if (isApiError(result)) {
      set.status = (result as ApiErrorResponse).status ?? 500;
    }

    return result;
  })

  // List all users - GET /api/admin/users
  .get("/admin/users", async ({ set }) => {
    const result = await getAdminUsersHandler();

    if (isApiError(result)) {
      set.status = (result as ApiErrorResponse).status ?? 500;
    }

    return result;
  })

  // Get user details - GET /api/admin/users/:id
  .get(
    "/admin/users/:id",
    async ({ params, set }) => {
      const result = await getAdminUserDetailHandler({ params });

      if (isApiError(result)) {
        set.status = (result as ApiErrorResponse).status ?? 500;
      }

      return result;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )

  // Assign subscription to user - POST /api/admin/subscription
  .post(
    "/admin/subscription",
    async ({ body, set }) => {
      const result = await assignSubscriptionHandler({ body });

      if (isApiError(result)) {
        set.status = (result as ApiErrorResponse).status ?? 500;
      }

      return result;
    },
    {
      body: t.Object({
        userId: t.String(),
        plan_id: t.String(),
        plan_name: t.String(),
        plan_price: t.Optional(t.Number()),
        credits_per_month: t.Number(),
        startDate: t.String(),
        endDate: t.String(),
      }),
    },
  )

  // Cancel user subscription - POST /api/admin/subscription/cancel
  .post(
    "/admin/subscription/cancel",
    async ({ body, set }) => {
      const result = await cancelUserSubscriptionHandler({ body });

      if (isApiError(result)) {
        set.status = (result as ApiErrorResponse).status ?? 500;
      }

      return result;
    },
    {
      body: t.Object({
        userId: t.String(),
      }),
    },
  )

  // Add credits to user - POST /api/admin/credits
  .post(
    "/admin/credits",
    async ({ body, set }) => {
      const result = await addCreditsHandler({ body });

      if (isApiError(result)) {
        set.status = (result as ApiErrorResponse).status ?? 500;
      }

      return result;
    },
    {
      body: t.Object({
        userId: t.String(),
        subscriptionCredits: t.Optional(t.Number()),
        additionalCredits: t.Optional(t.Number()),
      }),
    },
  )

  // Toggle user role - POST /api/admin/users/role
  .post(
    "/admin/users/role",
    async ({ body, set }) => {
      const result = await toggleUserRoleHandler({ body });

      if (isApiError(result)) {
        set.status = (result as ApiErrorResponse).status ?? 500;
      }

      return result;
    },
    {
      body: t.Object({
        userId: t.String(),
        role: t.String(),
        action: t.Union([t.Literal("add"), t.Literal("remove")]),
      }),
    },
  )

  // Deduct credits from user - POST /api/admin/credits/deduct
  .post(
    "/admin/credits/deduct",
    async ({ body, set }) => {
      const result = await deductCreditsHandler({ body });

      if (isApiError(result)) {
        set.status = (result as ApiErrorResponse).status ?? 500;
      }

      return result;
    },
    {
      body: t.Object({
        userId: t.String(),
        deductSubscription: t.Optional(t.Number()),
        deductAdditional: t.Optional(t.Number()),
      }),
    },
  )
  // ============================================
  // Resume Builder Endpoints
  // ============================================

  // Generate LaTeX resume - POST /api/resume/generate
  .post(
    "/resume/generate",
    async ({ body, set }) => {
      const { generateResumeLatexHandler } =
        await import("@/server/api/controllers/resume.controller");
      const result = await generateResumeLatexHandler({ body });

      if (isApiError(result)) {
        set.status = (result as ApiErrorResponse).status ?? 500;
      }

      return result;
    },
    {
      body: t.Object({
        resumeData: t.Object({
          personalInfo: t.Object({
            name: t.String(),
            email: t.String(),
            phone: t.String(),
            address: t.Optional(t.String()),
            linkedin: t.Optional(t.String()),
            github: t.Optional(t.String()),
            website: t.Optional(t.String()),
          }),
          summary: t.Optional(t.String()),
          experience: t.Array(
            t.Object({
              company: t.String(),
              position: t.String(),
              startDate: t.String(),
              endDate: t.Optional(t.String()),
              description: t.Array(t.String()),
              achievements: t.Optional(t.Array(t.String())),
            }),
          ),
          education: t.Array(
            t.Object({
              institution: t.String(),
              degree: t.String(),
              field: t.Optional(t.String()),
              startDate: t.String(),
              endDate: t.Optional(t.String()),
              gpa: t.Optional(t.String()),
              honors: t.Optional(t.Array(t.String())),
            }),
          ),
          skills: t.Array(
            t.Object({
              category: t.String(),
              items: t.Array(t.String()),
            }),
          ),
          projects: t.Optional(
            t.Array(
              t.Object({
                name: t.String(),
                description: t.String(),
                technologies: t.Array(t.String()),
                link: t.Optional(t.String()),
              }),
            ),
          ),
          certifications: t.Optional(
            t.Array(
              t.Object({
                name: t.String(),
                issuer: t.String(),
                date: t.String(),
                credentialId: t.Optional(t.String()),
              }),
            ),
          ),
          languages: t.Optional(
            t.Array(
              t.Object({
                language: t.String(),
                proficiency: t.String(),
              }),
            ),
          ),
        }),
        templateId: t.Optional(t.String()),
      }),
    },
  )

  // Generate PDF from LaTeX - POST /api/resume/pdf
  .post(
    "/resume/pdf",
    async ({ body, set }) => {
      const { generateResumePDFHandler } =
        await import("@/server/api/controllers/resume.controller");
      const result = await generateResumePDFHandler({ body });

      if (isApiError(result)) {
        set.status = (result as ApiErrorResponse).status ?? 500;
      }

      return result;
    },
    {
      body: t.Object({
        resumeId: t.String(),
        latex: t.Optional(t.String()),
      }),
    },
  )

  // Get user's resumes - GET /api/resume/list
  .get("/resume/list", async ({ set }) => {
    const { getUserResumesHandler } =
      await import("@/server/api/controllers/resume.controller");
    const result = await getUserResumesHandler();

    if (isApiError(result)) {
      set.status = (result as ApiErrorResponse).status ?? 500;
    }

    return result;
  })

  // Get resume by ID - GET /api/resume/:id
  .get(
    "/resume/:id",
    async ({ params, set }) => {
      const { getResumeByIdHandler } =
        await import("@/server/api/controllers/resume.controller");
      const result = await getResumeByIdHandler({ params });

      if (isApiError(result)) {
        set.status = (result as ApiErrorResponse).status ?? 500;
      }

      return result;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )

  // ============================================
  // GitHub Endpoints
  // ============================================

  // GET /api/github/status — returns whether the current user has GitHub connected
  .get("/github/status", async ({ set }) => {
    const result = await getGithubStatusHandler()
    if (result && "status" in result && result.status) set.status = result.status
    return result
  })

  // GET /api/github/validate — live-validates a repo+branch for source code analysis.
  // [GITHUB] Used by the debounced input in the test run form. Requires auth +
  // a GitHub token; returns no_github_account for email-only users.
  // IMPORTANT: declared before /github/repo/:chatId to avoid route collision.
  .get(
    "/github/validate",
    async ({ query, set }) => {
      const result = await validateGithubSourceHandler({ query })
      if (!result.valid) set.status = 400
      return result
    },
    {
      query: t.Object({
        owner:  t.Optional(t.String()),
        repo:   t.Optional(t.String()),
        branch: t.Optional(t.String()),
      }),
    },
  )

  .get(
    "/github/repo/:chatId",
    async ({ params, set }) => {
      const result = await getGithubRepoForChatHandler({ params });
      if (result && "status" in result && result.status)
        set.status = result.status;
      return result;
    },
    {
      params: t.Object({ chatId: t.String() }),
    },
  )

  // POST /api/github/push — push generated files to GitHub
  .post(
    "/github/push",
    async ({ body, set }) => {
      const result = await pushToGithubHandler({ body })
      if (result && "status" in result && result.status) set.status = result.status
      return result
    },
    {
      body: t.Object({
        chatId:                 t.String(),
        branchName:             t.String(),
        commitMessage:          t.Optional(t.String()),
        confirmExistingBranch:  t.Optional(t.Boolean()),
        repoName:               t.Optional(t.String()),
        visibility:             t.Optional(t.Union([t.Literal("public"), t.Literal("private")])),
        replaceRepo:            t.Optional(t.Boolean()),
      }),
    },
  )

  // ============================================
  // Buildify Studio Endpoints
  // ============================================

  // List user's designs
  .get("/designs", async ({ set }) => {
    const result = await listDesignsHandler();
    if (!Array.isArray(result) && "status" in result) {
      set.status = result.status;
      return result;
    }
    return result;
  })

  // Create a new draft
  .post(
    "/design",
    async ({ body, set }) => {
      const result = await createDesignHandler({ body });
      if ("status" in result) {
        set.status = result.status;
        return result;
      }
      return result;
    },
    {
      body: t.Object({
        title: t.Optional(t.String()),
        layout: t.Optional(t.String()),
        background: t.Optional(t.String()),
      }),
    },
  )

  // IMPORTANT: static paths must come before parameterized ones
  // Get public design by slug (no auth)
  .get(
    "/design/public/:slug",
    async ({ params, set }) => {
      const result = await getPublicDesignHandler({ params });
      if (!result) {
        set.status = 404;
        return { error: "Not found" };
      }
      return result;
    },
    { params: t.Object({ slug: t.String() }) },
  )

  // Get one design by id (auth required)
  .get(
    "/design/:id",
    async ({ params, set }) => {
      const result = await getDesignByIdHandler({ params });
      if ("status" in result) {
        set.status = result.status;
        return result;
      }
      return result;
    },
    { params: t.Object({ id: t.String() }) },
  )

  // Update/save draft
  .put(
    "/design/:id",
    async ({ params, body, set }) => {
      const result = await updateDesignHandler({ params, body });
      if ("status" in result) {
        set.status = result.status;
        return result;
      }
      return result;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        title: t.Optional(t.String()),
        layout: t.Optional(t.String()),
        background: t.Optional(t.Nullable(t.String())),
      }),
    },
  )

  // Publish
  .post(
    "/design/:id/publish",
    async ({ params, body, set }) => {
      const result = await publishDesignByIdHandler({ params, body });
      if ("status" in result) {
        set.status = result.status;
        return result;
      }
      return result;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ slug: t.String(), title: t.Optional(t.String()) }),
    },
  )

  // Unpublish
  .post(
    "/design/:id/unpublish",
    async ({ params, set }) => {
      const result = await unpublishDesignByIdHandler({ params });
      if ("status" in result) {
        set.status = result.status;
        return result;
      }
      return result;
    },
    { params: t.Object({ id: t.String() }) },
  )

  // Delete
  .delete(
    "/design/:id",
    async ({ params, set }) => {
      const result = await deleteDesignByIdHandler({ params })
      if ('status' in result) { set.status = result.status; return result }
      return result;
    },
    { params: t.Object({ id: t.String() }) },
  )

  // ============================================
  // Accessibility Tester Endpoints
  // ============================================

  .post(
    '/accessibility/test',
    async ({ body, set }) => {
      const { startAccessibilityTestHandler } = await import('@/server/api/controllers/accessibility.controller')
      const result = await startAccessibilityTestHandler({ body })
      if (result instanceof Response) return result
      if ('status' in result) { set.status = result.status; return result }
      return result
    },
    {
      body: t.Object({
        url: t.String(),
        standards: t.Array(t.String()),
        maxPages: t.Optional(t.Number()),
        maxDepth: t.Optional(t.Number()),
      }),
    },
  )

  .get('/accessibility/history', async ({ set }) => {
    const { getTestHistoryHandler } = await import('@/server/api/controllers/accessibility.controller')
    const result = await getTestHistoryHandler()
    if (!Array.isArray(result) && 'status' in result) { set.status = result.status; return result }
    return result
  })

  .get(
    '/accessibility/results/:id',
    async ({ params, set }) => {
      const { getTestResultsHandler } = await import('@/server/api/controllers/accessibility.controller')
      const result = await getTestResultsHandler({ params })
      if ('status' in result && !('testRun' in result)) { set.status = (result as { status: number }).status; return result }
      return result
    },
    { params: t.Object({ id: t.String() }) },
  )
  
  .get(
    '/accessibility/report/:id',
    async ({ params, set }) => {
      const { downloadReportHandler } = await import('@/server/api/controllers/accessibility.controller')
      const result = await downloadReportHandler({ params })
      if (result instanceof Response) return result
      if ('status' in result) { set.status = result.status; return result }
      return result
    },
    { params: t.Object({ id: t.String() }) },
  )

  .delete(
    '/accessibility/test/:id',
    async ({ params, set }) => {
      const { deleteTestRunHandler } = await import('@/server/api/controllers/accessibility.controller')
      const result = await deleteTestRunHandler({ params })
      if ('status' in result && !('success' in result)) { set.status = (result as { status: number }).status; return result }
      return result
    },
    { params: t.Object({ id: t.String() }) },
  )


  // ============================================
  // Testing Engine Endpoints
  // ============================================

  // POST /api/test/run — start a new test run, returns { testRunId } immediately
  // body schema includes optional maxPages and maxTests so users
  // can specify how many pages to crawl and how many test cases to generate.
  // Both fields are optional integers — the server uses its own defaults when omitted.
  // t.Integer() ensures we reject floats/strings at the Elysia validation layer.
  //
  // [ADDED] concurrency — number of parallel TinyFish extraction calls during
  //   Stage 2 crawl. Clamped server-side to [1, 20]. Optional; server default is 5.
  //
  // [ADDED] timeouts — per-run timeout overrides in milliseconds. Each field is
  //   optional; omitted fields keep their server-side defaults (300 000 ms each).
  //   Clamped server-side to [30 000, 600 000] per field.
  //   Fields:
  //     discoveryMs      — Stage-1 site discovery TinyFish call timeout
  //     extractionMs     — per-page Stage-2 extraction TinyFish call timeout
  //     executeTestBaseMs — base timeout for a single test-execution TinyFish call
  //
  // [GITHUB] githubOwner/githubRepo/githubBranch — optional source code analysis.
  //   When provided, the pipeline fetches the repo's source files and injects
  //   real route paths, form field names, and validation rules into the AI prompt.
  //   All three are stripped server-side if the user has no GitHub token.
  .post(
    "/test/run",
    async ({ body, set }) => {
      const result = await startTestRunHandler({ body });
      if (isApiError(result))
        set.status = (result as ApiErrorResponse).status ?? 500;
      return result;
    },
    {
      body: t.Object({
        url: t.String(),
        projectId: t.Optional(t.String()),
        // user-controlled crawl budget — both optional, server defaults apply when absent
        maxPages: t.Optional(t.Integer({ minimum: 1, maximum: 20 })),
        maxTests: t.Optional(t.Integer({ minimum: 1, maximum: 30 })),
        // [ADDED] number of parallel page-extraction calls during Stage 2 crawl
        concurrency: t.Optional(t.Integer({ minimum: 1, maximum: 20 })),
        // [ADDED] per-run timeout overrides (milliseconds); each field is optional
        timeouts: t.Optional(
          t.Object({
            discoveryMs:       t.Optional(t.Integer({ minimum: 30_000, maximum: 600_000 })),
            extractionMs:      t.Optional(t.Integer({ minimum: 30_000, maximum: 600_000 })),
            executeTestBaseMs: t.Optional(t.Integer({ minimum: 30_000, maximum: 600_000 })),
          }),
        ),
        // [GITHUB] optional source code analysis — all three must be provided together
        githubOwner:  t.Optional(t.String()),
        githubRepo:   t.Optional(t.String()),
        githubBranch: t.Optional(t.String()),
        // Optional free-text hint the user can provide about login credentials
        // or site context so the AI can generate more targeted test cases.
        crawlContext: t.Optional(t.String({ maxLength: 500 })),
      }),
    },
  )

  // POST /api/test/run/from-cases — start a new run pre-seeded with previous test cases.
  // Skips crawling and AI generation; goes straight to awaiting_review.
  // The target URL is locked to the one supplied in the body.
  // IMPORTANT: must be declared BEFORE /test/run/:id routes to avoid Elysia
  // matching "from-cases" as the :id param on other routes.
  .post(
    "/test/run/from-cases",
    async ({ body, set }) => {
      const result = await runFromCasesHandler({ body });
      if (isApiError(result))
        set.status = (result as ApiErrorResponse).status ?? 500;
      return result;
    },
    {
      body: t.Object({
        targetUrl: t.String(),
        cases: t.Array(
          t.Object({
            title: t.String(),
            category: t.String(),
            steps: t.Array(t.String()),
            expected_result: t.String(),
            priority: t.Union([t.Literal("P0"), t.Literal("P1"), t.Literal("P2")]),
            description: t.Optional(t.Nullable(t.String())),
            tags: t.Optional(t.Nullable(t.Array(t.String()))),
            estimated_duration: t.Optional(t.Nullable(t.Number())),
          }),
          { minItems: 1 },
        ),
      }),
    },
  )

  // GET /api/test/usage — today's run count and daily limit for the authenticated user.
  // IMPORTANT: must be declared BEFORE /test/run/:id to avoid route collision.
  // Used by useTestUsage() to render the usage pill and disable the Run button
  // when the per-plan daily cap is reached.
  .get("/test/usage", async ({ set }) => {
    const result = await getTestUsageHandler();
    if (isApiError(result))
      set.status = (result as ApiErrorResponse).status ?? 500;
    return result;
  })

  // GET /api/test/history — past test runs for the authenticated user
  // IMPORTANT: must be declared BEFORE /test/run/:id to avoid route collision
  .get("/test/history", async ({ set }) => {
    const result = await getTestHistoryHandler();
    if (isApiError(result))
      set.status = (result as ApiErrorResponse).status ?? 500;
    return result;
  })

  // DELETE /api/test/run/:id/cancel — cancel a running or reviewing test run
  // IMPORTANT: must be declared BEFORE /test/run/:id to avoid Elysia matching
  // "cancel" as the :id param on the GET route below.
  .delete(
    "/test/run/:id/cancel",
    async ({ params, set }) => {
      const result = await cancelTestRunHandler({ params });
      if (isApiError(result))
        set.status = (result as ApiErrorResponse).status ?? 500;
      return result;
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  // ── Review phase endpoints ────────────────────────────────────────────────
  // All three must come before /test/run/:id (GET) so Elysia doesn't treat
  // "cases" or "confirm" as the :id param on that route.

  // GET /api/test/run/:id/cases — list all generated test cases for the review UI
  .get(
    "/test/run/:id/cases",
    async ({ params, set }) => {
      const result = await getTestCasesHandler({ params });
      if (isApiError(result))
        set.status = (result as ApiErrorResponse).status ?? 500;
      return result;
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  // POST /api/test/run/:id/cases — create a new test case during review
  .post(
    "/test/run/:id/cases",
    async ({ params, body, set }) => {
      const result = await createTestCaseHandler({ params, body });
      if (isApiError(result))
        set.status = (result as ApiErrorResponse).status ?? 500;
      return result;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        title: t.String(),
        category: t.String(),
        steps: t.Array(t.String()),
        expectedResult: t.String(),
        priority: t.Optional(
          t.Union([t.Literal("P0"), t.Literal("P1"), t.Literal("P2")]),
        ),
        description: t.Optional(t.String()),
        tags: t.Optional(t.Array(t.String())),
      }),
    },
  )

  // PATCH /api/test/run/:id/cases/:caseId — edit a test case during review
  .patch(
    "/test/run/:id/cases/:caseId",
    async ({ params, body, set }) => {
      const result = await updateTestCaseHandler({ params, body });
      if (isApiError(result))
        set.status = (result as ApiErrorResponse).status ?? 500;
      return result;
    },
    {
      params: t.Object({ id: t.String(), caseId: t.String() }),
      body: t.Object({
        title: t.Optional(t.String()),
        category: t.Optional(t.String()),
        steps: t.Optional(t.Array(t.String())),
        expectedResult: t.Optional(t.String()),
        priority: t.Optional(
          t.Union([t.Literal("P0"), t.Literal("P1"), t.Literal("P2")]),
        ),
        description: t.Optional(t.String()),
      }),
    },
  )

  // DELETE /api/test/run/:id/cases/:caseId — delete a test case during review
  // Returns 400 if deleting would leave zero test cases.
  .delete(
    "/test/run/:id/cases/:caseId",
    async ({ params, set }) => {
      const result = await deleteTestCaseHandler({ params });
      if (isApiError(result))
        set.status = (result as ApiErrorResponse).status ?? 500;
      return result;
    },
    {
      params: t.Object({ id: t.String(), caseId: t.String() }),
    },
  )

  // POST /api/test/run/:id/confirm — confirm review and begin execution
  // Resolves the in-memory promise that the pipeline is awaiting.
  .post(
    "/test/run/:id/confirm",
    async ({ params, set }) => {
      const result = await confirmAndExecuteHandler({ params });
      if (isApiError(result))
        set.status = (result as ApiErrorResponse).status ?? 500;
      return result;
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  // ── End review phase endpoints ────────────────────────────────────────────

  // GET /api/test/run/:id — polling fallback for run status + live bug list
  .get(
    "/test/run/:id",
    async ({ params, set }) => {
      const result = await getTestRunHandler({ params });
      if (isApiError(result))
        set.status = (result as ApiErrorResponse).status ?? 500;
      return result;
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  // GET /api/test/stream/:id — SSE stream of pipeline events
  // Returns text/event-stream; client opens with EventSource or fetch + ReadableStream.
  // Events: status | test_update | counter | bug_found | complete | error
  .get(
    "/test/stream/:id",
    async ({ params }) => {
      // streamTestRunHandler returns a native Response with Content-Type: text/event-stream
      return streamTestRunHandler({ params });
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  // GET /api/test/run/:id/report — full visual report (all dashboard sections)
  .get(
    "/test/run/:id/report",
    async ({ params, set }) => {
      const result = await getTestReportHandler({ params });
      if (isApiError(result))
        set.status = (result as ApiErrorResponse).status ?? 500;
      return result;
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  // POST /api/test/run/:id/export-pdf — generate PDF report, returns { pdfUrl }
  .post(
    "/test/run/:id/export-pdf",
    async ({ params }) => {
      return exportTestReportPdfHandler({ params });
    },
    { params: t.Object({ id: t.String() }) },
  )

  // GET /api/test/report/public/:slug — shareable read-only report, no auth required
  // IMPORTANT: declared before /test/run/:id/report to avoid Elysia matching "public" as an id
  .get(
    "/test/report/public/:slug",
    async ({ params, set }) => {
      const result = await getPublicReportHandler({ params });
      if (isApiError(result))
        set.status = (result as ApiErrorResponse).status ?? 500;
      return result;
    },
    {
      params: t.Object({ slug: t.String() }),
    },
  )

  // GET /api/badge/:token — returns badge score as JSON for programmatic use
  // (CI/CD pipelines, Slack bots, custom integrations).
  // NOT the image — for the SVG image used in READMEs see /badge/:token/svg below.
  // No auth required — token is opaque and non-guessable (nanoid(32))
  .get(
    "/badge/:token",
    async ({ params, set }) => {
      const result = await getEmbedBadgeHandler({ params });
      if (isApiError(result))
        set.status = (result as ApiErrorResponse).status ?? 500;
      return result;
    },
    {
      params: t.Object({ token: t.String() }),
    },
  )

  // GET /api/badge/:token/svg — returns an actual SVG image (not JSON).
  // This is what the "Copy Badge" button points to as the image src in the
  // markdown string: [![Tested by Buildify](.../svg)](report-link).
  // IMPORTANT: must be declared AFTER /badge/:token so Elysia doesn't swallow
  // "svg" as the token param on the route above. Elysia matches more-specific
  // (longer) static segments first, so /badge/:token/svg wins correctly.
  // No auth required — token is a nanoid(32) opaque string.
  .get(
    "/badge/:token/svg",
    async ({ params }) => {
      // Returns a native Response with Content-Type: image/svg+xml
      return getEmbedBadgeSvgHandler({ params });
    },
    {
      params: t.Object({ token: t.String() }),
    },
  )
  
  
  // ============================================
  // Video Generation Endpoints (video.controller — kie.ai)
  // ============================================
 
  // POST /api/video/generate — generate AI video background via kie.ai
  .post('/video/generate', ({ request }) => generateVideoHandler(request))
 

  // ============================================
  // Remotion Video Generation Endpoints
  // ============================================
 
  // POST /api/remotion-video/upload-images
  //   Content-Type: multipart/form-data
  //   Body: { images: File[], descriptions: string[] }
  //
  //   Returns: { images: UploadedUserImage[], sessionId: string }
 
  .post(
    '/remotion-video/upload-images',
    async ({ body, set }: any) => {
      const result = await uploadUserImagesHandler({ body })
      if ('status' in result && 'error' in result) {
        set.status = result.status
        return result
      }
      return result
    },
    {
      body: t.Object({
        images: t.Files({ maxSize: '5m', type: ['image/jpeg', 'image/png', 'image/webp'] }),
        descriptions: t.Union([t.Array(t.String()), t.String()]), // Elysia sends single string when array has 1 item
      }),
    },
  )
 
  // POST /api/remotion-video/generate — prompt → VideoJson
// Returns validated VideoJson ready to pass to the Remotion Player.
.post(
  '/remotion-video/generate',
  async ({ body, set }: any) => {
    const result = await generateRemotionVideoHandler({ body })
    if ('status' in result && 'error' in result) {
      set.status = result.status
      return result
    }
    return result
  },
  {
    body: t.Object({
      prompt: t.String(),
      duration: t.Optional(t.Number()),
      // ── required for follow-up prompts ──────────────────────────────
      chatId: t.Optional(t.Nullable(t.String())),
      imageSessionId: t.Optional(t.String()),
      // ────────────────────────────────────────────────────────────────────
      options: t.Optional(t.Object({
        useTTS: t.Optional(t.Boolean()),
        voiceId: t.Optional(t.String()),
        useMusic: t.Optional(t.Boolean()),
        musicGenre: t.Optional(t.String()),
        ttsVolume: t.Optional(t.Number()),
        musicVolume: t.Optional(t.Number()),
      })),
      userImages: t.Optional(t.Array(t.Object({
        index: t.Number(),
        url: t.String(),
        description: t.String(),
        filename: t.String(),
      }))),
    }),
  },
)
 
  // POST /api/remotion-video/render — VideoJson → render job
  .post(
    '/remotion-video/render',
    async ({ body, set }) => {
      const result = await renderRemotionVideoHandler({ body })
      if ('status' in result && 'error' in result) {
        set.status = result.status
        return result
      }
      return result
    },
    {
      body: t.Object({
        videoJson: t.Object({
          duration: t.Number(),
          fps: t.Optional(t.Number()),
          width: t.Optional(t.Number()),
          height: t.Optional(t.Number()),
          scenes: t.Array(t.Any()),
          globalFontFamily: t.Optional(t.String()),
        }),
      }),
    },
  )
  // GET /api/remotion-video/chats — list all video chats for the authenticated user
  // Used by useVideoChats() in the history panel to populate the sidebar/drawer.
  // IMPORTANT: declared before /remotion-video/chats/:chatId to avoid route collision.
  .get(
    '/remotion-video/chats',
    async ({ set }) => {
      const result = await getVideoChatsHandler()
      if ('status' in result && 'error' in result) {
        set.status = result.status
        return result
      }
      return result
    },
  )

  // GET /api/remotion-video/chats/:chatId — single video chat by id
  // Used by useVideoChat(chatId) to resume a past generation.
  .get(
    '/remotion-video/chats/:chatId',
    async ({ params, set }) => {
      const result = await getVideoChatHandler({ params })
      if ('status' in result && 'error' in result) {
        set.status = result.status
        return result
      }
      return result
    },
    {
      params: t.Object({ chatId: t.String() }),
    },
  )

  // PATCH /api/remotion-video/chats/:chatId — rename a video chat title
  .patch(
    '/remotion-video/chats/:chatId',
    async ({ params, body, set }: any) => {
      const result = await renameVideoChatHandler({ params, body })
      if ('status' in result && 'error' in result) {
        set.status = result.status
        return result
      }
      return result
    },
    {
      params: t.Object({ chatId: t.String() }),
      body: t.Object({
        title: t.String(),
      }),
    },
  )

  // DELETE /api/remotion-video/chats/:chatId — delete a video chat by id
  // Called if we add a delete button to the history panel in future.
  .delete(
    '/remotion-video/chats/:chatId',
    async ({ params, set }) => {
      const result = await deleteVideoChatHandler({ params })
      if ('status' in result && 'error' in result) {
        set.status = result.status
        return result
      }
      return result
    },
    {
      params: t.Object({ chatId: t.String() }),
    },
  )
 
  // GET /api/remotion-video/s3-proxy — authenticated S3 image proxy
  .get(
    '/remotion-video/s3-proxy',
    async ({ query, set }) => {
      const session = await getSession()
      if (!session?.user?.id) {
        set.status = 401
        return { error: 'Unauthorized' }
      }
 
      const { url } = query
      if (!url) {
        set.status = 400
        return { error: 'Missing url param' }
      }

      // Build allowed hostname from env vars
      const bucket = process.env.AWS_S3_BUCKET
      const region = process.env.AWS_S3_REGION
      if (!bucket || !region) {
        set.status = 500
        return { error: 'S3 not configured' }
      }
      const allowedHostname = `${bucket}.s3.${region}.amazonaws.com`
 
      let parsed: URL
      try {
        parsed = new URL(url)
      } catch {
        set.status = 400
        return { error: 'Invalid url' }
      }
 
      if (parsed.hostname !== allowedHostname) {
        set.status = 403
        return { error: 'Forbidden' }
      }
 
      const response = await fetch(url)
      if (!response.ok) {
        set.status = 502
        return { error: 'Failed to fetch image from S3' }
      }
 
      const contentType = response.headers.get('content-type') ?? 'application/octet-stream'
      const buffer = await response.arrayBuffer()
 
      const headers: Record<string, string> = {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': buffer.byteLength.toString(),
      }
 
      return new Response(buffer, { headers })
    },
    {
      query: t.Object({ url: t.String() }),
    },
  )

  // GET /api/remotion-video/usage — daily prompt quota for the authenticated user
  // Used by useVideoDailyUsage() to render the usage pill and disable the
  // Generate button when the daily limit is reached.
  .get(
    '/remotion-video/usage',
    async ({ set }) => {
      const session = await getSession()
      if (!session?.user?.id) {
        set.status = 401
        return { error: 'Unauthorized' }
      }
 
      const planId = await getVideoPlanId(session.user.id)
      const planLimits = getVideoServerPlanLimits(planId)
      const promptsToday = await countVideoPromptsTodayByUserId(session.user.id)

      // ISO timestamp for midnight UTC tonight — used by the frontend countdown
      const resetsAt = new Date()
      resetsAt.setUTCHours(24, 0, 0, 0)
 
      return {
        promptsToday,
        dailyLimit: planLimits.dailyPrompts,
        planId: planId ?? 'free',
        isAuthenticated: true,
        resetsAt: resetsAt.toISOString(),
      }
    },
  )