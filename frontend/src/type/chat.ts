export interface ChatMessage {
  id: number;
  session_id: number;
  role: 'user' | 'ai';
  content: string;
  created_at: string;
}