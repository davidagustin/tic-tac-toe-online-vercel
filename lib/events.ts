interface EventData {
  id: string;
  data: Record<string, unknown>;
  timestamp: number;
}

interface Client {
  id: string;
  controller: AbortController;
}

// In-memory event store (in production, use Redis)
const eventStore = new Map<string, Array<EventData>>();
const clients = new Set<Client>();

// Clean up old events (keep last 100 per channel)
function cleanupOldEvents(channel: string) {
  const events = eventStore.get(channel) || [];
  if (events.length > 100) {
    eventStore.set(channel, events.slice(-100));
  }
}

// Broadcast event to all connected clients
export function broadcastEvent(channel: string, event: string, data: Record<string, unknown>) {
  const eventData: EventData = {
    id: Date.now().toString(),
    data,
    timestamp: Date.now()
  };

  // Store event
  if (!eventStore.has(channel)) {
    eventStore.set(channel, []);
  }
  eventStore.get(channel)!.push(eventData);
  cleanupOldEvents(channel);

  // Send to all connected clients
  clients.forEach(client => {
    try {
      // This is a simplified version - in practice, you'd need to implement proper SSE streaming
      console.log(`Broadcasting to client ${client.id}: ${event} on ${channel}`);
    } catch (error) {
      console.error('Error broadcasting to client:', error);
      clients.delete(client);
    }
  });
}

// Get events for a channel
export function getEvents(channel: string, lastEventId?: string) {
  const events = eventStore.get(channel) || [];
  if (lastEventId) {
    const lastEventIndex = events.findIndex(e => e.id === lastEventId);
    if (lastEventIndex !== -1) {
      return events.slice(lastEventIndex + 1);
    }
  }
  return events;
}

// Add client to the set
export function addClient(client: Client) {
  clients.add(client);
}

// Remove client from the set
export function removeClient(client: Client) {
  clients.delete(client);
}

// Get all clients
export function getClients() {
  return clients;
} 