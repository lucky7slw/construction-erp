import { google } from 'googleapis';
import { PrismaClient } from '../../generated/prisma';

export class GoogleIntegrationService {
  private oauth2Client;

  constructor(private prisma: PrismaClient) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  getAuthUrl(userId: string) {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/gmail.send',
      ],
      state: userId,
    });
  }

  async handleCallback(code: string, userId: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    
    await this.prisma.integration.upsert({
      where: { userId_provider: { userId, provider: 'GOOGLE' } },
      create: {
        userId,
        provider: 'GOOGLE',
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        isActive: true,
      },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        isActive: true,
      },
    });

    return tokens;
  }

  async getTokens(userId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { userId_provider: { userId, provider: 'GOOGLE' } },
    });

    if (!integration) throw new Error('Google not connected');

    this.oauth2Client.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken,
    });

    return this.oauth2Client;
  }

  // Calendar Integration
  async createCalendarEvent(userId: string, event: {
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    attendees?: string[];
  }) {
    const auth = await this.getTokens(userId);
    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: event.summary,
        description: event.description,
        start: { dateTime: event.start.toISOString() },
        end: { dateTime: event.end.toISOString() },
        attendees: event.attendees?.map(email => ({ email })),
      },
    });

    return response.data;
  }

  // Drive Integration
  async uploadToDrive(userId: string, file: {
    name: string;
    mimeType: string;
    data: Buffer;
    folderId?: string;
  }) {
    const auth = await this.getTokens(userId);
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: file.folderId ? [file.folderId] : undefined,
      },
      media: {
        mimeType: file.mimeType,
        body: file.data,
      },
    });

    return response.data;
  }

  // Gmail Integration
  async sendEmail(userId: string, email: {
    to: string;
    subject: string;
    body: string;
    attachments?: Array<{ filename: string; content: Buffer }>;
  }) {
    const auth = await this.getTokens(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    const message = [
      `To: ${email.to}`,
      `Subject: ${email.subject}`,
      '',
      email.body,
    ].join('\n');

    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage },
    });

    return response.data;
  }
}
