import type { Agent } from '@/lib/types/chat'
import { cn } from '@/lib/utils'

interface ChatSidebarProps {
    agents?: Agent[]
    selectedAgentId?: string | null
    onSelectAgent?: (id: string | null) => void
}

export function ChatSidebar({ agents = [], selectedAgentId, onSelectAgent }: ChatSidebarProps) {
    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b font-semibold flex justify-between items-center">
                <span>Agentes</span>
                {selectedAgentId && (
                    <button
                        onClick={() => onSelectAgent?.(null)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                        Resetear
                    </button>
                )}
            </div>
            <div className="flex-1 overflow-y-auto">
                {agents.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 text-center">No agents available</div>
                ) : (
                    agents.map((agent) => (
                        <div
                            key={agent.id}
                            onClick={() => onSelectAgent?.(agent.id)}
                            className={cn(
                                "p-4 cursor-pointer border-b group transition-colors",
                                selectedAgentId === agent.id ? "bg-blue-50 border-l-4 border-l-blue-500" : "hover:bg-gray-100 border-l-4 border-l-transparent"
                            )}
                        >
                            <div className={cn(
                                "font-medium transition-colors",
                                selectedAgentId === agent.id ? "text-blue-700" : "text-gray-900 group-hover:text-primary"
                            )}>
                                {agent.agent_name || 'Nova Agent'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                                {agent.agent_type}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
