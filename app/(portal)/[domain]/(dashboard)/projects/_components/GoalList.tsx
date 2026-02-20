'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GoalForm } from './GoalForm'
import { Target, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteGoal } from '@/lib/actions/projects'
import { toast } from 'sonner'

interface GoalListProps {
    projectId: string
    goals: any[]
}

export function GoalList({ projectId, goals }: GoalListProps) {
    const handleDelete = async (id: string) => {
        try {
            await deleteGoal(id, projectId)
            toast.success('Meta eliminada')
        } catch (error: any) {
            toast.error('Error al eliminar meta')
        }
    }

    return (
        <div className="space-y-4">
            {goals.map((goal) => (
                <Card key={goal.id} className="border-gray-100 overflow-hidden">
                    <CardContent className="p-0">
                        <div className="flex items-center gap-4 p-4">
                            <div className={`p-3 rounded-xl ${goal.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                                }`}>
                                {goal.status === 'completed' ? <CheckCircle2 size={20} /> : <Target size={20} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 truncate">{goal.title}</h4>
                                <p className="text-sm text-gray-500 line-clamp-1">{goal.description || 'Sin descripción'}</p>
                                <div className="flex items-center gap-3 mt-2">
                                    <Badge variant="outline" className={`text-[10px] uppercase font-bold ${goal.priority === 'high' || goal.priority === 'critical' ? 'text-red-600 bg-red-50 border-red-100' : 'text-gray-500 bg-gray-50 border-gray-100'
                                        }`}>
                                        {goal.priority}
                                    </Badge>
                                    {goal.deadline && (
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                                            <Clock size={12} />
                                            {new Date(goal.deadline).toLocaleDateString()}
                                        </div>
                                    )}
                                    <Badge variant="outline" className="text-[10px] uppercase font-bold border-gray-100 bg-white">
                                        {goal.status}
                                    </Badge>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <GoalForm projectId={projectId} goal={goal} />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => handleDelete(goal.id)}
                                >
                                    Eliminar
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}

            {goals.length === 0 && (
                <div className="text-center py-20 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                    <Target size={48} className="mx-auto mb-4 opacity-10" />
                    <h5 className="font-bold text-gray-900">Define tus primeras metas</h5>
                    <p className="text-sm text-gray-500 max-w-xs mx-auto mb-6">
                        Las metas te ayudan a mantener el foco y medir el progreso de tu proyecto.
                    </p>
                    <GoalForm projectId={projectId} />
                </div>
            )}
        </div>
    )
}
