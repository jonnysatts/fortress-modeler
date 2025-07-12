import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/utils/test-utils';
import { SpecialEventActualForm } from '../SpecialEventActualForm';
import { setupServiceMocks } from '@/test/mocks/services';

vi.mock('@/hooks/useProjects', () => ({
  useSpecialEventActuals: vi.fn(),
  useCreateSpecialEventActual: vi.fn(),
  useUpdateSpecialEventActual: vi.fn(),
}));

import * as mockHooks from '@/hooks/useProjects';

describe('SpecialEventActualForm', () => {
  let serviceMocks: ReturnType<typeof setupServiceMocks>;
  let mockCreate: any;
  let mockUpdate: any;

  beforeEach(() => {
    serviceMocks = setupServiceMocks();
    mockCreate = vi.fn();
    mockUpdate = vi.fn();
    mockHooks.useCreateSpecialEventActual.mockReturnValue({ mutate: mockCreate, isPending: false });
    mockHooks.useUpdateSpecialEventActual.mockReturnValue({ mutate: mockUpdate, isPending: false });
    mockHooks.useSpecialEventActuals.mockReturnValue({ data: [], isLoading: false });
  });

  it('renders form fields', () => {
    render(<SpecialEventActualForm projectId="p1" />);
    expect(screen.getByLabelText('F&B Revenue')).toBeInTheDocument();
    expect(screen.getByLabelText('Attendance')).toBeInTheDocument();
  });

  it('submits new actual', async () => {
    const user = userEvent.setup();
    render(<SpecialEventActualForm projectId="p1" />);
    await user.type(screen.getByLabelText('F&B Revenue'), '123');
    await user.click(screen.getByRole('button', { name: /save actuals/i }));
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ project_id: 'p1' }), expect.any(Object));
  });

  it('updates existing actual', async () => {
    const user = userEvent.setup();
    mockHooks.useSpecialEventActuals.mockReturnValue({ data: [{ id: '1', project_id: 'p1' }], isLoading: false });
    render(<SpecialEventActualForm projectId="p1" />);
    await user.click(screen.getByRole('button', { name: /save actuals/i }));
    expect(mockUpdate).toHaveBeenCalledWith({ id: '1', data: expect.any(Object) });
  });
});
