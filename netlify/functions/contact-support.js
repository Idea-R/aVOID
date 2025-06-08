const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { 
      playerName, 
      email, 
      subject, 
      message, 
      gameStats, 
      browserInfo,
      type = 'support'
    } = JSON.parse(event.body);

    // Validate required fields
    if (!email || !subject || !message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: email, subject, message' 
        }),
      };
    }

    // Generate support ticket ID
    const ticketId = `AVOID-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create detailed HTML email for support team
    const supportEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #06b6d4, #3b82f6); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">🎮 aVOID Game Support Ticket</h1>
          <p style="color: #e0f2fe; margin: 5px 0 0 0;">Ticket ID: ${ticketId}</p>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1e293b; border-bottom: 2px solid #06b6d4; padding-bottom: 10px;">Contact Information</h2>
          <p><strong>Player Name:</strong> ${playerName || 'Anonymous'}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          
          <h2 style="color: #1e293b; border-bottom: 2px solid #06b6d4; padding-bottom: 10px; margin-top: 30px;">Issue Details</h2>
          <p><strong>Subject:</strong> ${subject}</p>
          <div style="background: white; padding: 15px; border-left: 4px solid #06b6d4; margin: 10px 0;">
            <p style="margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
          
          ${gameStats ? `
          <h2 style="color: #1e293b; border-bottom: 2px solid #06b6d4; padding-bottom: 10px; margin-top: 30px;">Game Statistics</h2>
          <div style="background: white; padding: 15px; border-radius: 4px;">
            <p><strong>Score:</strong> ${gameStats.score || 'N/A'}</p>
            <p><strong>Survival Time:</strong> ${gameStats.survivalTime || 'N/A'}</p>
            <p><strong>Meteors Destroyed:</strong> ${gameStats.meteorsDestroyed || 'N/A'}</p>
            <p><strong>Distance Traveled:</strong> ${gameStats.distanceTraveled || 'N/A'}</p>
          </div>
          ` : ''}
          
          ${browserInfo ? `
          <h2 style="color: #1e293b; border-bottom: 2px solid #06b6d4; padding-bottom: 10px; margin-top: 30px;">Technical Information</h2>
          <div style="background: white; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 12px;">
            <p><strong>User Agent:</strong> ${browserInfo.userAgent || 'N/A'}</p>
            <p><strong>Screen:</strong> ${browserInfo.screen || 'N/A'}</p>
            <p><strong>Viewport:</strong> ${browserInfo.viewport || 'N/A'}</p>
            <p><strong>URL:</strong> ${browserInfo.url || 'N/A'}</p>
          </div>
          ` : ''}
          
          <div style="margin-top: 30px; padding: 15px; background: #dbeafe; border-radius: 4px;">
            <p style="margin: 0; color: #1e40af;">
              <strong>📧 Reply to this email to respond directly to the player.</strong>
            </p>
          </div>
        </div>
      </div>
    `;

    // Create confirmation email for the player
    const playerConfirmationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #06b6d4, #3b82f6); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">🎮 aVOID Game Support</h1>
          <p style="color: #e0f2fe; margin: 5px 0 0 0;">Thank you for contacting us!</p>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1e293b;">Hi ${playerName || 'Player'}! 👋</h2>
          
          <p>We've received your support request and will get back to you as soon as possible.</p>
          
          <div style="background: white; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0;">
            <p style="margin: 0;"><strong>Ticket ID:</strong> ${ticketId}</p>
            <p style="margin: 5px 0 0 0;"><strong>Subject:</strong> ${subject}</p>
          </div>
          
          <p>Our typical response time is within 24 hours. For urgent issues, please include "URGENT" in your subject line.</p>
          
          <div style="margin-top: 30px; padding: 15px; background: #dbeafe; border-radius: 4px;">
            <p style="margin: 0; color: #1e40af;">
              <strong>💡 Tip:</strong> Keep this email for your records. You can reply to this email if you have additional information to add.
            </p>
          </div>
          
          <div style="margin-top: 20px; text-align: center;">
            <p style="color: #64748b; font-size: 14px;">
              Thanks for playing aVOID! 🚀<br>
              - The aVOID Team
            </p>
          </div>
        </div>
      </div>
    `;

    // Send email to support team
    const supportEmail = await resend.emails.send({
      from: 'support@avoidgame.io',
      to: 'support@avoidgame.io',
      subject: `[${type.toUpperCase()}] ${subject} - ${ticketId}`,
      html: supportEmailHtml,
      replyTo: email,
      tags: [
        { name: 'source', value: 'avoid-game' },
        { name: 'type', value: 'support-ticket' },
        { name: 'ticket-id', value: ticketId }
      ]
    });

    // Send confirmation to player
    const confirmationEmail = await resend.emails.send({
      from: 'support@avoidgame.io',
      to: email,
      subject: `aVOID Support - We received your message! (${ticketId})`,
      html: playerConfirmationHtml,
      tags: [
        { name: 'source', value: 'avoid-game' },
        { name: 'type', value: 'support-confirmation' },
        { name: 'ticket-id', value: ticketId }
      ]
    });

    console.log(`Support ticket created: ${ticketId}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        ticketId,
        supportEmailId: supportEmail.id,
        confirmationEmailId: confirmationEmail.id,
        message: 'Support ticket submitted successfully' 
      }),
    };

  } catch (error) {
    console.error('Support ticket error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to submit support ticket',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
    };
  }
}; 