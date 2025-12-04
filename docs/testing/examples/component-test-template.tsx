/**
 * Component Test Template for Frontend
 *
 * Copy this template when creating new tests for React components.
 * Location: frontend/src/components/__tests__/<ComponentName>.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// =============================================================================
// Mock Dependencies
// =============================================================================

vi.mock('@/hooks/use-data', () => ({
  useData: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useParams: () => ({
    id: 'test-id',
  }),
}));

// Import AFTER mocks
import { MyComponent } from '../MyComponent';
import { useData } from '@/hooks/use-data';

// =============================================================================
// Test Utils
// =============================================================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: createWrapper() });
}

// =============================================================================
// Mock Data
// =============================================================================

const mockData = {
  id: 'item-1',
  title: 'Test Item',
  description: 'Test description',
};

// =============================================================================
// Tests
// =============================================================================

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mock return value
    (useData as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('rendering', () => {
    it('should render loading state', () => {
      (useData as any).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      renderWithProviders(<MyComponent id="test-id" />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should render error state', () => {
      (useData as any).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to load'),
      });

      renderWithProviders(<MyComponent id="test-id" />);

      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    it('should render data when loaded', () => {
      (useData as any).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      renderWithProviders(<MyComponent id="test-id" />);

      expect(screen.getByText('Test Item')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    it('should render empty state when no data', () => {
      (useData as any).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      renderWithProviders(<MyComponent id="test-id" />);

      expect(screen.getByText(/no items/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Interaction Tests
  // ===========================================================================

  describe('interactions', () => {
    it('should call onClick handler when button is clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      (useData as any).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      renderWithProviders(<MyComponent id="test-id" onClick={handleClick} />);

      await user.click(screen.getByRole('button', { name: /submit/i }));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should update input value on change', async () => {
      const user = userEvent.setup();

      (useData as any).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      renderWithProviders(<MyComponent id="test-id" />);

      const input = screen.getByRole('textbox', { name: /title/i });
      await user.clear(input);
      await user.type(input, 'New Title');

      expect(input).toHaveValue('New Title');
    });

    it('should show confirmation dialog on delete', async () => {
      const user = userEvent.setup();

      (useData as any).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      renderWithProviders(<MyComponent id="test-id" />);

      await user.click(screen.getByRole('button', { name: /delete/i }));

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Form Tests
  // ===========================================================================

  describe('form handling', () => {
    it('should show validation errors', async () => {
      const user = userEvent.setup();

      renderWithProviders(<MyComponent id="test-id" />);

      // Submit empty form
      await user.click(screen.getByRole('button', { name: /submit/i }));

      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });

    it('should submit form with valid data', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      (useData as any).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      renderWithProviders(<MyComponent id="test-id" onSubmit={onSubmit} />);

      await user.type(screen.getByRole('textbox', { name: /title/i }), 'New Title');
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          title: 'New Title',
        });
      });
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('accessibility', () => {
    it('should have accessible name for buttons', () => {
      (useData as any).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      renderWithProviders(<MyComponent id="test-id" />);

      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should focus first input on mount', () => {
      (useData as any).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      renderWithProviders(<MyComponent id="test-id" />);

      expect(screen.getByRole('textbox', { name: /title/i })).toHaveFocus();
    });
  });

  // ===========================================================================
  // Props Tests
  // ===========================================================================

  describe('props', () => {
    it('should apply custom className', () => {
      (useData as any).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      const { container } = renderWithProviders(
        <MyComponent id="test-id" className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should be disabled when disabled prop is true', () => {
      (useData as any).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      renderWithProviders(<MyComponent id="test-id" disabled />);

      expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
    });
  });
});
