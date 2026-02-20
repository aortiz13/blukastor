// ============================================================================
// Barrel index for backward compatibility
// All consumers importing from '@/lib/actions/monitoring' continue to work.
// ============================================================================

// Types
export type {
    ErrorFilters,
    AuditFilters,
    DateRange,
    ConversationFilters,
} from '@/lib/types/monitoring'

// Error & Data Quality
export { getSystemErrors, resolveError, getDataQualityIssues } from './errors'

// Audit Trail
export { getUserAuditTrail } from './audit'

// AI Metrics
export { getAIAgentMetrics, getAgentPerformanceByType } from './ai-metrics'

// Conversations
export {
    getConversationSessions,
    getConversationTranscript,
    getConversationMetrics,
    exportConversationTranscript,
} from './conversations'

// n8n Integration
export {
    getN8nWorkflowStatus,
    getWorkflowExecutionHistory,
    getN8nWorkflowDetails,
    getN8nWorkflows,
    getN8nExecutions,
} from './n8n'
