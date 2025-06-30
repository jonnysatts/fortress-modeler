import { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { serviceContainer, SERVICE_TOKENS } from '@/services/container/ServiceContainer';
import { IErrorService } from '@/services/interfaces/IErrorService';

interface Props {
  children: ReactNode;
  onReset?: () => void;
  formName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Specialized error boundary for form components
 * Provides form-specific error handling without breaking the entire page
 */
export class FormErrorBoundary extends Component<Props, State> {
  private errorService: IErrorService;

  public state: State = {
    hasError: false,
    error: null
  };

  constructor(props: Props) {
    super(props);
    this.errorService = serviceContainer.resolve<IErrorService>(SERVICE_TOKENS.ERROR_SERVICE);
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error });

    // Log as validation error with low severity since forms are usually recoverable
    this.errorService.logError(
      error,
      `FormErrorBoundary: ${this.props.formName || 'Form'}`,
      'validation',
      'low',
      {
        componentStack: errorInfo.componentStack,
        formName: this.props.formName,
      }
    );
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null
    });

    // Call custom reset function if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <div className="font-medium">Form Error</div>
              <div className="text-sm mt-1">
                The {this.props.formName || 'form'} encountered an error and couldn't be displayed.
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={this.handleReset}
              className="ml-4"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Reset Form
            </Button>
          </AlertDescription>
          
          {import.meta.env.MODE === 'development' && this.state.error && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                Error Details (Development)
              </summary>
              <pre className="mt-2 text-xs bg-background p-2 rounded border overflow-auto max-h-32">
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </Alert>
      );
    }

    return this.props.children;
  }
}