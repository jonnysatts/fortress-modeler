import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { serviceContainer, SERVICE_TOKENS } from '@/services/container/ServiceContainer';
import { IErrorService } from '@/services/interfaces/IErrorService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // If true, only shows a small error message instead of full page
  context?: string; // Context for error reporting
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  private errorService: IErrorService;
  private maxRetries = 3;

  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    retryCount: 0
  };

  constructor(props: Props) {
    super(props);
    this.errorService = serviceContainer.resolve<IErrorService>(SERVICE_TOKENS.ERROR_SERVICE);
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, retryCount: 0 };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Use the error service for logging
    this.errorService.logError(
      error,
      this.props.context || 'ErrorBoundary',
      'runtime',
      'high',
      {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        retryCount: this.state.retryCount,
      }
    );

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Isolated error boundary for small components
      if (this.props.isolate) {
        return (
          <div className="p-4 border border-destructive/50 rounded-md bg-destructive/5">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">Component Error</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              This component encountered an error and couldn't be displayed.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={this.handleReset}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        );
      }

      // Full page error boundary
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                An unexpected error occurred. {this.state.retryCount < this.maxRetries 
                  ? 'You can try again or refresh the page.' 
                  : 'Please refresh the page to continue.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {import.meta.env.MODE === 'development' && this.state.error && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Error details:</p>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-48">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              )}
              
              {this.state.retryCount > 0 && (
                <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-md">
                  Retry attempt {this.state.retryCount} of {this.maxRetries}
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={this.handleReload}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
                {this.state.retryCount < this.maxRetries && (
                  <Button variant="outline" onClick={this.handleReset}>
                    Try Again
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;