import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/utils/test-utils';
import { SpecialEventForecastForm } from '../SpecialEventForecastForm';
import { setupServiceMocks } from '@/test/mocks/services';

vi.mock('@/hooks/useProjects', () => ({
  useSpecialEventForecasts: vi.fn(),
  useCreateSpecialEventForecast: vi.fn(),
  useUpdateSpecialEventForecast: vi.fn(),
}));

import * as mockHooks from '@/hooks/useProjects';

describe('SpecialEventForecastForm', () => {
  let serviceMocks: ReturnType<typeof setupServiceMocks>;
  let mockCreate: any;
  let mockUpdate: any;

  beforeEach(() => {
    serviceMocks = setupServiceMocks();
    mockCreate = vi.fn();
    mockUpdate = vi.fn();
    mockHooks.useCreateSpecialEventForecast.mockReturnValue({ mutate: mockCreate, isPending: false });
    mockHooks.useUpdateSpecialEventForecast.mockReturnValue({ mutate: mockUpdate, isPending: false });
    mockHooks.useSpecialEventForecasts.mockReturnValue({ data: [], isLoading: false });
  });

  it('renders form fields', () => {
    render(<SpecialEventForecastForm projectId="proj" />);
    expect(screen.getByLabelText('F&B Revenue')).toBeInTheDocument();
    expect(screen.getByLabelText('Total Costs')).toBeInTheDocument();
  });

  it('submits new forecast', async () => {
    const user = userEvent.setup();
    render(<SpecialEventForecastForm projectId="proj" />);
    await user.type(screen.getByLabelText('F&B Revenue'), '100');
    await user.click(screen.getByRole('button', { name: /save forecast/i }));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ project_id: 'proj' }),
      expect.any(Object)
    );
  });

  it('updates existing forecast', async () => {
    const user = userEvent.setup();
    mockHooks.useSpecialEventForecasts.mockReturnValue({ data: [{ id: '1', project_id: 'proj' }], isLoading: false });
    render(<SpecialEventForecastForm projectId="proj" />);
    await user.click(screen.getByRole('button', { name: /save forecast/i }));
    expect(mockUpdate).toHaveBeenCalledWith({ id: '1', data: expect.any(Object) });
  });
});
