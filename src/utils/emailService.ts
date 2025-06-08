export interface ContactSupportData {
  playerName?: string;
  email: string;
  subject: string;
  message: string;
  gameStats?: {
    score: number;
    survivalTime: number;
    meteorsDestroyed: number;
    distanceTraveled: number;
  };
  type?: 'support' | 'bug' | 'feedback' | 'feature';
}

export interface EmailResponse {
  success: boolean;
  ticketId?: string;
  message: string;
  error?: string;
}

class EmailService {
  private baseUrl: string;

  constructor() {
    // Auto-detect if we're in development or production
    this.baseUrl = import.meta.env.DEV 
      ? 'http://localhost:8888' 
      : window.location.origin;
  }

  /**
   * Send a support ticket with game context
   */
  async sendSupportTicket(data: ContactSupportData): Promise<EmailResponse> {
    try {
      // Gather browser info for debugging
      const browserInfo = {
        userAgent: navigator.userAgent,
        screen: `${screen.width}x${screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        url: window.location.href,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(`${this.baseUrl}/.netlify/functions/contact-support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          browserInfo
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send support ticket');
      }

      return {
        success: true,
        ticketId: result.ticketId,
        message: result.message
      };

    } catch (error) {
      console.error('EmailService: Support ticket failed:', error);
      return {
        success: false,
        message: 'Failed to send support ticket. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send a general email (fallback)
   */
  async sendEmail(data: {
    to: string;
    subject: string;
    html: string;
    from?: string;
    replyTo?: string;
    type?: string;
  }): Promise<EmailResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/.netlify/functions/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }

      return {
        success: true,
        message: result.message
      };

    } catch (error) {
      console.error('EmailService: Email failed:', error);
      return {
        success: false,
        message: 'Failed to send email. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Quick bug report with current game state
   */
  async reportBug(
    email: string, 
    description: string, 
    gameStats?: any,
    playerName?: string
  ): Promise<EmailResponse> {
    return this.sendSupportTicket({
      playerName,
      email,
      subject: '🐛 Bug Report',
      message: description,
      gameStats,
      type: 'bug'
    });
  }

  /**
   * Send feedback about the game
   */
  async sendFeedback(
    email: string, 
    feedback: string,
    playerName?: string,
    gameStats?: any
  ): Promise<EmailResponse> {
    return this.sendSupportTicket({
      playerName,
      email,
      subject: '💭 Player Feedback',
      message: feedback,
      gameStats,
      type: 'feedback'
    });
  }

  /**
   * Request a new feature
   */
  async requestFeature(
    email: string, 
    featureRequest: string,
    playerName?: string
  ): Promise<EmailResponse> {
    return this.sendSupportTicket({
      playerName,
      email,
      subject: '💡 Feature Request',
      message: featureRequest,
      type: 'feature'
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService; 