/**
 * @deprecated This file is maintained for backward compatibility.
 * Please use hooks from @/client-api/query-hooks instead.
 *
 * This file re-exports hooks and types from the new query-hooks structure.
 */

// Re-export all hooks from the new query-hooks structure
export {
  useChatDetails,
  useCreateChat,
  useCreateChatOwnership,
} from '@/client-api/query-hooks'

// Re-export types with proper names
export type {
  ChatDetails,
  ChatRequestBody,
  ChatResponse,
  ChatOwnershipResponse,
} from '@/client-api/query-hooks'

// Legacy type aliases for backward compatibility
export type { ChatRequestBody as ChatRequest } from '@/client-api/query-hooks'
export type { ChatOwnershipResponse as CreateOwnershipResponse } from '@/client-api/query-hooks'

// Legacy hook name for backward compatibility
// Note: Streaming requests should use fetch directly, not this hook
export { useCreateChat as useSendMessage } from '@/client-api/query-hooks'
