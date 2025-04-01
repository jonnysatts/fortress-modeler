
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="rounded-full bg-muted p-6 mx-auto w-24 h-24 flex items-center justify-center mb-8">
          <FileQuestion className="h-12 w-12 text-fortress-blue" />
        </div>
        <h1 className="text-4xl font-bold text-fortress-blue mb-2">404</h1>
        <p className="text-xl font-medium mb-4">Page not found</p>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button asChild className="bg-fortress-emerald hover:bg-fortress-emerald/90">
          <Link to="/">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
