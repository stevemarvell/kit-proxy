export interface SubscriberData {
  email: string;
  firstName?: string;
  lastName?: string;
  tags?: string[];
  customFields?: Record<string, string | number>;
}

export interface ConvertKitResponse {
  success: boolean;
  subscriberId?: string;
  message?: string;
}

export interface ConvertKitClient {
  subscribe(formId: string, data: SubscriberData): Promise<ConvertKitResponse>;
}
