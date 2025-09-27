declare module '@paypal/checkout-server-sdk' {
  export namespace core {
    export class Environment {
      constructor(clientId: string, clientSecret: string);
    }

    export class SandboxEnvironment extends Environment {
      constructor(clientId: string, clientSecret: string);
    }

    export class LiveEnvironment extends Environment {
      constructor(clientId: string, clientSecret: string);
    }

    export class PayPalHttpClient {
      constructor(environment: Environment);
      execute(request: any): Promise<any>;
    }
  }

  // Also export at top level for backwards compatibility
  export class Environment extends core.Environment {}
  export class SandboxEnvironment extends core.SandboxEnvironment {}
  export class LiveEnvironment extends core.LiveEnvironment {}
  export class PayPalHttpClient extends core.PayPalHttpClient {}

  export namespace orders {
    export class OrdersCreateRequest {
      requestBody(body: any): void;
    }

    export class OrdersCaptureRequest {
      constructor(orderId: string);
      requestBody(body: any): void;
    }

    export class OrdersGetRequest {
      constructor(orderId: string);
    }
  }

  export namespace notifications {
    export class WebhooksVerifySignatureRequest {
      constructor(body: any);
      requestBody(verificationObject: any): void;
    }
    export class VerifyWebhookSignatureRequest {
      constructor();
      requestBody(verificationObject: any): void;
    }
  }
}