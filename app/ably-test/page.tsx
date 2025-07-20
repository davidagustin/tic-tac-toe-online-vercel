import AblyExample from '@/components/AblyExample';

export default function AblyTestPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                <h1 className="text-3xl font-bold text-center mb-8">Ably Integration Test</h1>

                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Real-time Messaging Demo</h2>
                    <p className="text-gray-600 mb-6">
                        This page demonstrates the Ably real-time messaging integration.
                        Open this page in multiple browser tabs to test real-time communication.
                    </p>

                    <AblyExample />
                </div>

                <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Setup Instructions</h2>
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-medium text-gray-800">1. Configure Ably API Key</h3>
                            <p className="text-gray-600">
                                Add your Ably API key to the <code className="bg-gray-100 px-1 rounded">.env.local</code> file:
                            </p>
                            <pre className="bg-gray-100 p-2 rounded mt-2 text-sm">
                                ABLY_API_KEY=your_ably_api_key_here
                            </pre>
                        </div>

                        <div>
                            <h3 className="font-medium text-gray-800">2. Get Your API Key</h3>
                            <p className="text-gray-600">
                                Visit <a href="https://ably.com/accounts/any/apps/any/keys"
                                    className="text-blue-600 hover:underline"
                                    target="_blank"
                                    rel="noopener noreferrer">
                                    Ably Dashboard
                                </a> to get your API key.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-medium text-gray-800">3. Test the Integration</h3>
                            <p className="text-gray-600">
                                Once configured, you should see a real-time chat interface above.
                                Messages sent from one browser tab will appear in other tabs instantly.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 