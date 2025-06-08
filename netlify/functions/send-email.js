const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event, context) => {
  // Enable CORS for aVOID game
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { to, subject, html, from, replyTo, type } = JSON.parse(event.body);

    // Validate required fields
    if (!to || !subject || !html) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: to, subject, html' 
        }),
      };
    }

    // Use support email as default sender
    const defaultFrom = 'support@avoidgame.io';
    
    // Send email through Resend
    const data = await resend.emails.send({
      from: from || defaultFrom,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      replyTo: replyTo || undefined,
      tags: [
        { name: 'source', value: 'avoid-game' },
        { name: 'type', value: type || 'general' }
      ]
    });

    console.log(`Email sent successfully: ${data.id} - Type: ${type || 'general'}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        id: data.id,
        message: 'Email sent successfully' 
      }),
    };

  } catch (error) {
    console.error('Email send error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to send email',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
    };
  }
}; 