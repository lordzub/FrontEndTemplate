
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';

const MessageCard = () => {
  return (
    <Card className="w-96 bg-gradient-to-br from-green-100 to-yellow-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold text-blue-800">Hey Jeffery!</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl text-blue-700 font-semibold">
          You Are A Whale
        </p>
      </CardContent>
    </Card>
  );
};

export default MessageCard;