import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/utils/test-utils';
import { MilestoneTracker } from '../MilestoneTracker';
import { setupServiceMocks } from '@/test/mocks/services';

vi.mock('@/hooks/useProjects', () => ({
  useSpecialEventMilestones: vi.fn(),
  useCreateSpecialEventMilestone: vi.fn(),
  useUpdateSpecialEventMilestone: vi.fn(),
  useDeleteSpecialEventMilestone: vi.fn(),
}));

import * as mockHooks from '@/hooks/useProjects';

describe('MilestoneTracker', () => {
  let serviceMocks: ReturnType<typeof setupServiceMocks>;
  let mockCreate: any;
  let mockUpdate: any;
  let mockDelete: any;

  beforeEach(() => {
    serviceMocks = setupServiceMocks();
    mockCreate = vi.fn();
    mockUpdate = vi.fn();
    mockDelete = vi.fn();
    mockHooks.useCreateSpecialEventMilestone.mockReturnValue({ mutate: mockCreate, isPending: false });
    mockHooks.useUpdateSpecialEventMilestone.mockReturnValue({ mutate: mockUpdate, isPending: false });
    mockHooks.useDeleteSpecialEventMilestone.mockReturnValue({ mutate: mockDelete, isPending: false });
    mockHooks.useSpecialEventMilestones.mockReturnValue({ data: [], isLoading: false });
  });

  it('renders input fields', () => {
    render(<MilestoneTracker projectId="p1" />);
    expect(screen.getByPlaceholderText('Milestone label')).toBeInTheDocument();
  });

  it('adds a milestone', async () => {
    const user = userEvent.setup();
    render(<MilestoneTracker projectId="p1" />);
    await user.type(screen.getByPlaceholderText('Milestone label'), 'Start');
    await user.click(screen.getByRole('button', { name: /add milestone/i }));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ project_id: 'p1', milestone_label: 'Start' })
    );
  });

  it('toggles completion and deletes', async () => {
    const user = userEvent.setup();
    mockHooks.useSpecialEventMilestones.mockReturnValue({ data: [{ id: '1', project_id: 'p1', milestone_label: 'M1', completed: false }], isLoading: false });
    render(<MilestoneTracker projectId="p1" />);
    await user.click(screen.getByRole('checkbox'));
    expect(mockUpdate).toHaveBeenCalledWith({ id: '1', data: { completed: true } });
    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(mockDelete).toHaveBeenCalledWith({ id: '1', projectId: 'p1' });
  });
});
