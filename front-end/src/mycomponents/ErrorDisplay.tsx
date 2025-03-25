import { Card, CardContent } from "../components/ui/card";

interface ErrorDisplayProps {
  error: string;
}

const ErrorDisplay = ({ error }: ErrorDisplayProps) => {
  return (
    <Card className="lg:col-span-3 bg-red-50">
      <CardContent className="pt-4">
        <p className="text-red-500">{error}</p>
      </CardContent>
    </Card>
  );
};

export default ErrorDisplay; 