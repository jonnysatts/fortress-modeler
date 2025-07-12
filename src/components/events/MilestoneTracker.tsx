import React, { useState } from 'react';
import {
  useSpecialEventMilestones,
  useCreateSpecialEventMilestone,
  useUpdateSpecialEventMilestone,
  useDeleteSpecialEventMilestone,
} from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface MilestoneTrackerProps {
  projectId: string;
}

export const MilestoneTracker: React.FC<MilestoneTrackerProps> = ({ projectId }) => {
  const { data: milestones = [] } = useSpecialEventMilestones(projectId);
  const createMilestone = useCreateSpecialEventMilestone();
  const updateMilestone = useUpdateSpecialEventMilestone();
  const deleteMilestone = useDeleteSpecialEventMilestone();

  const [label, setLabel] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleAdd = () => {
    if (!label) return;
    createMilestone.mutate({
      project_id: projectId,
      milestone_label: label,
      target_date: targetDate ? new Date(targetDate) : undefined,
      notes,
    });
    setLabel('');
    setTargetDate('');
    setNotes('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Milestones</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Milestone label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
            <Textarea
              placeholder="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Button onClick={handleAdd} size="sm" disabled={createMilestone.isPending}>
              Add Milestone
            </Button>
          </div>
          <div className="space-y-2">
            {milestones.map((m) => (
              <div key={m.id} className="border rounded p-2 flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{m.milestone_label}</p>
                  {m.target_date && (
                    <p className="text-sm text-muted-foreground">
                      Target: {format(new Date(m.target_date), 'yyyy-MM-dd')}
                    </p>
                  )}
                  {m.notes && <p className="text-sm text-muted-foreground">{m.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={m.completed}
                    onChange={() =>
                      updateMilestone.mutate({ id: m.id, data: { completed: !m.completed } })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMilestone.mutate({ id: m.id, projectId })}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MilestoneTracker;
