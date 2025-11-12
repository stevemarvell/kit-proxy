import { ConvertKitClient, SubscriberData, ConvertKitResponse } from '../types/convertkit';

export class LoggingConvertKitClient implements ConvertKitClient {
  async subscribe(formId: string, data: SubscriberData): Promise<ConvertKitResponse> {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      action: 'subscribe',
      formId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      tags: data.tags,
      customFields: data.customFields,
    };

    if (process.env.NODE_ENV === 'production') {
      // Structured JSON logging for production
      console.log(JSON.stringify(logEntry));
    } else {
      // Human-readable logging for development
      console.log('=== ConvertKit Subscribe Request ===');
      console.log(`Timestamp: ${timestamp}`);
      console.log(`Form ID: ${formId}`);
      console.log(`Email: ${data.email}`);
      if (data.firstName) console.log(`First Name: ${data.firstName}`);
      if (data.lastName) console.log(`Last Name: ${data.lastName}`);
      if (data.tags) console.log(`Tags: ${data.tags.join(', ')}`);
      if (data.customFields) console.log(`Custom Fields:`, data.customFields);
      console.log('====================================');
    }

    // Mock successful response
    return {
      success: true,
      subscriberId: `mock-${Date.now()}`,
      message: 'Subscriber logged (not actually subscribed)',
    };
  }
}
