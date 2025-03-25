import { Card, CardContent } from "../components/ui/card";

const LoadingState = () => {
  return (
    <Card className="lg:col-span-3">
      <CardContent className="flex justify-center items-center py-8">
        <p>Loading data...</p>
      </CardContent>
    </Card>
  );
};

export default LoadingState; 