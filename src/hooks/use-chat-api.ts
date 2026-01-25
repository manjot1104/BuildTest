/**
 * @deprecated This file is maintained for backward compatibility.
 * Please use hooks from @/client-api/query-hooks instead.
 * 
 * This file re-exports hooks from the new query-hooks structure.
 */

// Re-export all hooks and types from the new query-hooks structure
export {
  useChatDetails,
  useCreateChat,
  useCreateChatOwnership,
  type ChatDetails,
  type ChatRequest,
  type ChatResponse,
  type CreateOwnershipResponse,
} from '@/client-api/query-hooks'

// Legacy hook name for backward compatibility
// Note: Streaming requests should use fetch directly, not this hook
export { useCreateChat as useSendMessage } from '@/client-api/query-hooks'
