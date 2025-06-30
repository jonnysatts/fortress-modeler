import { Component, ErrorInfo, ReactNode } from 'react';
import { Database, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { serviceContainer, SERVICE_TOKENS } from '@/services/container/ServiceContainer';
import { IErrorService } from '@/services/interfaces/IErrorService';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * Specialized error boundary for data loading errors
 * Provides data-specific error handling and recovery options
 */
export class DataErrorBoundary extends Component<Props, State> {
  private errorService: IErrorService;
  private maxRetries = 2;

  public state: State = {
    hasError: false,
    error: null,
    retryCount: 0
  };

  constructor(props: Props) {
    super(props);
    this.errorService = serviceContainer.resolve<IErrorService>(SERVICE_TOKENS.ERROR_SERVICE);
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryCount: 0 };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error });

    // Log as database error with medium severity
    this.errorService.logError(
      error,
      `DataErrorBoundary: ${this.props.context || 'Data loading'}`,
      'database',
      'medium',
      {
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount,
      }
    );
  }

  private handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      retryCount: prevState.retryCount + 1
    }));

    // Call custom retry function if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-lg">Data Loading Error</CardTitle>
            </div>
            <CardDescription>
              Unable to load the requested data. This might be a temporary issue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {this.state.retryCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                <AlertTriangle className="h-4 w-4" />
                Retry attempt {this.state.retryCount} of {this.maxRetries}
              </div>
            )}

            <div className="flex gap-2">
              {this.state.retryCount < this.maxRetries && (
                <Button onClick={this.handleRetry} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
              <Button onClick={this.handleReload} variant="outline">
                Refresh Page
              </Button>
            </div>

            {import.meta.env.MODE === 'development' && this.state.error && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 bg-muted p-2 rounded text-xs overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}